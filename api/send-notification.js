const admin = require("firebase-admin");

let adminApp = null;

function clean(value) {
  return String(value || "").trim();
}

function lower(value) {
  return clean(value).toLowerCase();
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
      .map(clean)
      .filter(Boolean)
  )];
}

/*
  Accepts both the NEW admin format:
    recipientKeys: ["irufan", "979"]

  and the OLD admin format:
    recipientKeys: ["irufan_979"]

  This makes deployment safer if the browser still has an older cached admin.html.
*/
function expandRecipientKeys(recipientKeys) {
  const expanded = new Set();

  for (const raw of uniqueStrings(recipientKeys)) {
    const value = lower(raw);
    if (!value) continue;

    expanded.add(value);

    // Backward compatibility with old "username_rcno" keys.
    const lastUnderscore = value.lastIndexOf("_");
    if (lastUnderscore > 0 && lastUnderscore < value.length - 1) {
      const usernamePart = clean(value.slice(0, lastUnderscore));
      const rcPart = clean(value.slice(lastUnderscore + 1));
      if (usernamePart) expanded.add(lower(usernamePart));
      if (rcPart) expanded.add(lower(rcPart));
    }
  }

  return [...expanded];
}

async function findTokens(db, recipientKeys) {
  const expandedKeys = expandRecipientKeys(recipientKeys);
  if (!expandedKeys.length) {
    return {
      tokens: [],
      expandedKeys: [],
      scannedDevices: 0,
      enabledDevices: 0,
      matches: []
    };
  }

  const wanted = new Set(expandedKeys);
  const tokens = new Set();
  const matches = [];

  /*
    Read pushTokens without an enabled query first.
    This avoids a lookup failure if older device records use a missing/different
    enabled value, while still only sending to records where enabled === true.
  */
  const snap = await db.collection("pushTokens").get();

  let enabledDevices = 0;

  snap.forEach(doc => {
    const data = doc.data() || {};
    if (data.enabled !== true) return;

    enabledDevices++;

    const candidates = [
      lower(data.username),
      lower(data.usernameLower),
      lower(data.rcno),
      lower(data.fullname)
    ].filter(Boolean);

    const matchedBy = candidates.find(v => wanted.has(v));

    if (matchedBy && clean(data.token)) {
      const token = clean(data.token);
      tokens.add(token);

      matches.push({
        docId: doc.id,
        username: clean(data.username),
        rcno: clean(data.rcno),
        fullname: clean(data.fullname),
        matchedBy
      });
    }
  });

  return {
    tokens: [...tokens],
    expandedKeys,
    scannedDevices: snap.size,
    enabledDevices,
    matches
  };
}

async function removeInvalidTokens(db, tokens) {
  const uniqueTokens = uniqueStrings(tokens);
  if (!uniqueTokens.length) return;

  const refs = [];

  for (const token of uniqueTokens) {
    const snap = await db
      .collection("pushTokens")
      .where("token", "==", token)
      .get();

    snap.forEach(doc => refs.push(doc.ref));
  }

  for (const refChunk of splitIntoChunks(refs, 450)) {
    const batch = db.batch();
    refChunk.forEach(ref => batch.delete(ref));
    await batch.commit();
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      ok: false,
      error: "Method not allowed."
    });
  }

  try {
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

    const app = getAdminApp();
    const db = admin.firestore(app);
    const messaging = admin.messaging(app);

    const body = req.body || {};
    const title = clean(body.title);
    const message = clean(body.message || body.body);
    const url = clean(body.url || body.openPage || "/notifications.html");

    const recipientKeys = uniqueStrings(
      body.recipientKeys ||
      body.recipients ||
      body.userKeys
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

    const lookup = await findTokens(db, recipientKeys);

    /*
      Save the notification after lookup diagnostics are known.
      This also stores useful delivery information for troubleshooting.
    */
    const notificationRef = await db.collection("notifications").add({
      title,
      message,
      url,
      recipientKeys,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: clean(body.createdBy || "Admin"),
      pushLookup: {
        registeredDevices: lookup.tokens.length,
        scannedDevices: lookup.scannedDevices,
        enabledDevices: lookup.enabledDevices
      }
    });

    if (!lookup.tokens.length) {
      return res.status(200).json({
        ok: true,
        notificationId: notificationRef.id,
        projectId: clean(app.options?.credential?.projectId) ||
                   clean(process.env.FIREBASE_PROJECT_ID) ||
                   clean(readServiceAccount().project_id),
        registeredDevices: 0,
        sent: 0,
        failed: 0,
        warning:
          "Message saved, but none of the selected staff have a registered push-notification device.",
        debug: {
          recipientKeysReceived: recipientKeys,
          recipientKeysExpanded: lookup.expandedKeys,
          pushTokenDocumentsFound: lookup.scannedDevices,
          enabledPushTokenDocuments: lookup.enabledDevices
        }
      });
    }

    let sent = 0;
    let failed = 0;
    const invalidTokens = [];
    const errors = [];

    for (const tokenChunk of splitIntoChunks(lookup.tokens, 500)) {
      const response = await messaging.sendEachForMulticast({
  tokens: tokenChunk,

  data: {
    notificationId: String(notificationRef.id),
    title: String(title),
    body: String(message),
    url: String(url)
  },

  webpush: {
    headers: {
      Urgency: "high"
    }
  }
});

      sent += response.successCount;
      failed += response.failureCount;

      response.responses.forEach((item, index) => {
        if (item.success) return;

        const code = item.error?.code || "unknown";
        const errorMessage = item.error?.message || "FCM send failed";

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
      console.warn("Could not remove invalid FCM tokens:", cleanupError);
    }

    await notificationRef.set({
      pushDelivery: {
        registeredDevices: lookup.tokens.length,
        sent,
        failed,
        removedInvalidTokens: invalidTokens.length,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    }, { merge: true });

    return res.status(200).json({
      ok: true,
      notificationId: notificationRef.id,
      projectId: clean(app.options?.credential?.projectId) ||
                 clean(process.env.FIREBASE_PROJECT_ID) ||
                 clean(readServiceAccount().project_id),
      registeredDevices: lookup.tokens.length,
      sent,
      failed,
      removedInvalidTokens: invalidTokens.length,
      matchedStaff: lookup.matches.map(x => ({
        username: x.username,
        rcno: x.rcno,
        fullname: x.fullname
      })),
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
