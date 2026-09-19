const admin = require("firebase-admin");

let adminApp = null;

function clean(value) {
  return String(value || "").trim();
}

function readServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

    if (parsed.private_key) {
      parsed.private_key = String(parsed.private_key).replace(/\\n/g, "\n");
    }

    return parsed;
  }

  const projectId = clean(process.env.FIREBASE_PROJECT_ID);
  const clientEmail = clean(process.env.FIREBASE_CLIENT_EMAIL);
  const privateKey = String(process.env.FIREBASE_PRIVATE_KEY || "")
    .replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin credentials are missing. Set FIREBASE_SERVICE_ACCOUNT_JSON, " +
      "or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY."
    );
  }

  return {
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey
  };
}

function getAdminApp() {
  if (adminApp) return adminApp;

  if (admin.apps && admin.apps.length) {
    adminApp = admin.app();
    return adminApp;
  }

  const serviceAccount = readServiceAccount();

  adminApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  return adminApp;
}

function splitIntoChunks(items, size) {
  const result = [];

  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }

  return result;
}

function uniqueStrings(values) {
  return [
    ...new Set(
      (Array.isArray(values) ? values : [])
        .map(value => clean(value))
        .filter(Boolean)
    )
  ];
}

/*
 * Firestore collection used by the Koveli app:
 *
 * pushToken
 *   enabled: true
 *   fullname: "Abdulla Irufan"
 *   rcno: "979"
 *   role: "supervisor"
 *   token: "..."
 *   username: "Irufan"
 *   usernameLower: "irufan"
 *
 * The admin page may send username, usernameLower, RC No, or fullname.
 * This function supports all four.
 */
async function findTokens(db, recipientKeys) {
  const keys = uniqueStrings(recipientKeys);

  if (!keys.length) {
    return [];
  }

  const wanted = new Set(
    keys
      .map(key => clean(key).toLowerCase())
      .filter(Boolean)
  );

  const tokens = new Set();

  // Read active registered devices from the correct collection.
  const snap = await db
    .collection("pushToken")
    .where("enabled", "==", true)
    .get();

  snap.forEach(doc => {
    const data = doc.data() || {};

    const username = clean(data.username).toLowerCase();
    const usernameLower = clean(data.usernameLower).toLowerCase();
    const rcno = clean(data.rcno).toLowerCase();
    const fullname = clean(data.fullname).toLowerCase();

    const matched =
      (username && wanted.has(username)) ||
      (usernameLower && wanted.has(usernameLower)) ||
      (rcno && wanted.has(rcno)) ||
      (fullname && wanted.has(fullname));

    if (matched && data.token) {
      tokens.add(clean(data.token));
    }
  });

  return [...tokens].filter(Boolean);
}

/*
 * Remove FCM tokens that Firebase reports as invalid/unregistered.
 * Uses the same correct collection: pushToken.
 */
async function removeInvalidTokens(db, tokens) {
  const uniqueTokens = uniqueStrings(tokens);

  if (!uniqueTokens.length) {
    return;
  }

  // A Firestore batch supports up to 500 writes.
  // Query each invalid token and collect document refs first.
  const refs = [];

  for (const token of uniqueTokens) {
    const snap = await db
      .collection("pushToken")
      .where("token", "==", token)
      .get();

    snap.forEach(doc => refs.push(doc.ref));
  }

  for (const refChunk of splitIntoChunks(refs, 450)) {
    const batch = db.batch();

    refChunk.forEach(ref => {
      batch.delete(ref);
    });

    await batch.commit();
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      ok: false,
      error: "Method not allowed."
    });
  }

  try {
    /*
     * PUSH_ADMIN_KEY is a SERVER-SIDE secret stored in Vercel.
     * admin.html must send the same value in the x-admin-key header.
     *
     * Do NOT put FIREBASE_SERVICE_ACCOUNT_JSON in frontend code.
     */
    const expectedAdminKey = clean(process.env.PUSH_ADMIN_KEY);
    const suppliedAdminKey = clean(req.headers["x-admin-key"]);

    if (!expectedAdminKey) {
      return res.status(500).json({
        ok: false,
        error: "PUSH_ADMIN_KEY is not configured in Vercel."
      });
    }

    if (!suppliedAdminKey || suppliedAdminKey !== expectedAdminKey) {
      return res.status(401).json({
        ok: false,
        error: "Invalid notification admin key."
      });
    }

    getAdminApp();

    const db = admin.firestore();
    const messaging = admin.messaging();

    const body = req.body || {};

    const title = clean(body.title);
    const message = clean(body.message || body.body);
    const url = clean(
      body.url ||
      body.openPage ||
      "/notifications.html"
    );

    const recipientKeys = uniqueStrings(
      body.recipientKeys ||
      body.recipients ||
      body.userKeys
    );

    if (!title) {
      return res.status(400).json({
        ok: false,
        error: "Notification title is required."
      });
    }

    if (!message) {
      return res.status(400).json({
        ok: false,
        error: "Notification message is required."
      });
    }

    if (!recipientKeys.length) {
      return res.status(400).json({
        ok: false,
        error: "No notification recipients were supplied."
      });
    }

    /*
     * Save the notification first.
     * This preserves the message even when a selected user has no
     * registered push device.
     */
    const notificationRef = await db
      .collection("notifications")
      .add({
        title,
        message,
        url,
        recipientKeys,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: clean(body.createdBy || "Admin")
      });

    const tokens = await findTokens(db, recipientKeys);

    if (!tokens.length) {
      return res.status(200).json({
        ok: true,
        notificationId: notificationRef.id,
        registeredDevices: 0,
        sent: 0,
        failed: 0,
        warning:
          "Message saved, but none of the selected staff have a registered push-notification device.",
        debug: {
          recipientKeys
        }
      });
    }

    let sent = 0;
    let failed = 0;

    const invalidTokens = [];
    const errors = [];

    /*
     * FCM multicast supports up to 500 registration tokens per call.
     */
    for (const tokenChunk of splitIntoChunks(tokens, 500)) {
      const response = await messaging.sendEachForMulticast({
        tokens: tokenChunk,

        notification: {
          title,
          body: message
        },

        data: {
          notificationId: String(notificationRef.id),
          title: String(title),
          body: String(message),
          url: String(url)
        },

        webpush: {
          fcmOptions: {
            link: url
          }
        }
      });

      sent += response.successCount;
      failed += response.failureCount;

      response.responses.forEach((item, index) => {
        if (item.success) {
          return;
        }

        const code =
          item.error?.code ||
          "unknown";

        const errorMessage =
          item.error?.message ||
          "FCM send failed";

        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          invalidTokens.push(tokenChunk[index]);
        }

        if (errors.length < 10) {
          errors.push(`${code}: ${errorMessage}`);
        }
      });
    }

    try {
      await removeInvalidTokens(db, invalidTokens);
    } catch (cleanupError) {
      console.warn(
        "Could not remove invalid FCM tokens:",
        cleanupError
      );
    }

    return res.status(200).json({
      ok: true,
      notificationId: notificationRef.id,
      registeredDevices: tokens.length,
      sent,
      failed,
      removedInvalidTokens: invalidTokens.length,
      errors
    });

  } catch (error) {
    console.error("send-notification error:", error);

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "Internal Server Error",
      code:
        error?.code ||
        null
    });
  }
};
