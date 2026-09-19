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
  const privateKey = String(process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

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
  return [...new Set(
    (Array.isArray(values) ? values : [])
      .map(v => clean(v))
      .filter(Boolean)
  )];
}

async function findTokens(db, recipientKeys) {
  const keys = uniqueStrings(recipientKeys);
  if (!keys.length) return [];

  const tokens = new Set();

  // Firestore "in" queries are chunked so All Staff works for larger teams.
  for (const chunk of splitIntoChunks(keys, 30)) {
    const snap = await db.collection("pushTokens")
      .where("userKey", "in", chunk)
      .get();

    snap.forEach(doc => {
      const d = doc.data() || {};
      if (d.token) tokens.add(clean(d.token));
    });
  }

  return [...tokens].filter(Boolean);
}

async function removeInvalidTokens(db, tokens) {
  if (!tokens.length) return;
  const batch = db.batch();

  for (const token of tokens) {
    const snap = await db.collection("pushTokens")
      .where("token", "==", token)
      .get();

    snap.forEach(doc => batch.delete(doc.ref));
  }

  await batch.commit();
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

  try {
    /*
      IMPORTANT:
      PUSH_ADMIN_KEY is a SERVER-SIDE secret stored in Vercel.
      admin.html must send the same value in the x-admin-key request header.
      Do NOT put PUSH_ADMIN_KEY in pwa-config.js.
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
    const url = clean(body.url || body.openPage || "/notifications.html");
    const recipientKeys = uniqueStrings(
      body.recipientKeys || body.recipients || body.userKeys
    );

    if (!title) {
      return res.status(400).json({ ok: false, error: "Notification title is required." });
    }

    if (!message) {
      return res.status(400).json({ ok: false, error: "Notification message is required." });
    }

    if (!recipientKeys.length) {
      return res.status(400).json({ ok: false, error: "No notification recipients were supplied." });
    }

    const notificationRef = await db.collection("notifications").add({
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
        sent: 0,
        failed: 0,
        warning: "Message saved, but none of the selected staff have a registered push-notification device."
      });
    }

    let sent = 0;
    let failed = 0;
    const invalidTokens = [];
    const errors = [];

    // FCM multicast supports batches; keep batches comfortably below the limit.
    for (const tokenChunk of splitIntoChunks(tokens, 500)) {
      const response = await messaging.sendEachForMulticast({
        tokens: tokenChunk,
        notification: {
          title,
          body: message
        },
        data: {
          notificationId: notificationRef.id,
          title,
          body: message,
          url
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
        if (item.success) return;

        const code = item.error?.code || "unknown";
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          invalidTokens.push(tokenChunk[index]);
        }

        if (errors.length < 10) {
          errors.push(code + ": " + (item.error?.message || "FCM send failed"));
        }
      });
    }

    try {
      await removeInvalidTokens(db, invalidTokens);
    } catch (cleanupError) {
      console.warn("Could not remove invalid FCM tokens:", cleanupError);
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
      error: error?.message || "Internal Server Error",
      code: error?.code || null
    });
  }
};
