const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");

initializeApp();

const EMAIL_USER = defineSecret("EMAIL_USER");
const EMAIL_PASS = defineSecret("EMAIL_PASS");

const REGION = "asia-south1";
const MAX_ATTEMPTS = 12;
const LEASE_MINUTES = 10;

function splitEmails(value) {
  const input = Array.isArray(value) ? value : [value];
  return [...new Set(
    input.flatMap(v => String(v || "").split(/[;,]/))
      .map(v => v.trim().toLowerCase())
      .filter(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
  )];
}

function recipientsForLeave(data) {
  // Keep server recipients here so the browser cannot alter them.
  const textOnlyTo = splitEmails([
    "abdulla.irufan@macl.aero",
    data.staffEmail || ""
  ]);

  const attachmentTo = splitEmails([
    "abdulla.irufan@macl.aero"
  ]);

  return { textOnlyTo, attachmentTo };
}

function buildMessage(data, attachmentIncluded) {
  return [
    data.leaveType || (data.type === "frl" ? "Family Responsibility Leave" : "Sick Leave"),
    "========================================",
    `Date: ${data.date || "N/A"}`,
    `Duty Time: ${data.dutyTime || "N/A"}`,
    `Staff: ${data.staffName || "N/A"}`,
    `Staff ID: ${data.staffRcno || data.staffId || "N/A"}`,
    `Designation: ${data.staffRole || "Staff"}`,
    `Reason: ${data.reason || "N/A"}`,
    data.details ? `Additional Details: ${data.details}` : "",
    `Reported: ${data.reportedDateTime || "N/A"}`,
    data.type === "sick"
      ? (attachmentIncluded ? "Attachment: Included" :
         data.attachmentTempDocId ? "Attachment: Submitted separately" : "Attachment: None")
      : "",
    "========================================",
    "Koveli Staff Portal"
  ].filter(Boolean).join("\n");
}

async function claim(ref) {
  const db = getFirestore();
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const d = snap.data() || {};

    if (d.emailStatus === "sent") return null;
    const attempts = Number(d.emailAttempts || 0);
    if (attempts >= MAX_ATTEMPTS) return null;

    if (d.emailStatus === "sending" && d.emailLeaseUntil?.toMillis) {
      if (d.emailLeaseUntil.toMillis() > Date.now()) return null;
    }

    tx.update(ref, {
      emailStatus: "sending",
      emailAttempts: FieldValue.increment(1),
      emailLastAttempt: FieldValue.serverTimestamp(),
      emailLeaseUntil: Timestamp.fromMillis(Date.now() + LEASE_MINUTES * 60 * 1000),
      emailError: null
    });
    return { id: snap.id, ...d };
  });
}

async function processLeave(ref) {
  const data = await claim(ref);
  if (!data) return;

  const user = EMAIL_USER.value();
  const pass = EMAIL_PASS.value();
  if (!user || !pass) throw new Error("EMAIL_USER / EMAIL_PASS secrets are missing.");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass }
  });

  const { textOnlyTo, attachmentTo } = recipientsForLeave(data);
  const subject =
    `Leave Request - ${data.staffName || "Staff"} - ` +
    `${data.leaveType || data.type || "Leave"} - ${data.date || ""}`;

  let attachment = null;
  let attachmentRef = null;

  try {
    if (data.type === "sick" && data.attachmentTempDocId) {
      attachmentRef = getFirestore().collection("leaveEmailAttachments").doc(data.attachmentTempDocId);
      const attachmentSnap = await attachmentRef.get();
      if (!attachmentSnap.exists) {
        throw new Error("Sick Leave temporary attachment is missing from Firestore.");
      }

      const a = attachmentSnap.data() || {};
      const base64 = String(a.contentBase64 || "").replace(/\s+/g, "");
      if (!base64) throw new Error("Sick Leave temporary attachment is empty.");

      attachment = {
        filename: a.filename || data.attachmentFileName || "sick-leave-attachment",
        content: Buffer.from(base64, "base64"),
        contentType: a.contentType || "application/octet-stream"
      };
    }

    // Normal text email.
    if (textOnlyTo.length) {
      await transporter.sendMail({
        from: `Koveli Staff Portal <${user}>`,
        to: textOnlyTo.join(", "),
        subject,
        text: buildMessage(data, false),
        headers: { "X-Koveli-Leave-ID": ref.id, "X-Koveli-Mail-Type": "text" }
      });
    }

    // Sick attachment email only. FRL never enters this block.
    if (data.type === "sick" && attachment && attachmentTo.length) {
      await transporter.sendMail({
        from: `Koveli Staff Portal <${user}>`,
        to: attachmentTo.join(", "),
        subject,
        text: buildMessage(data, true),
        attachments: [attachment],
        headers: { "X-Koveli-Leave-ID": ref.id, "X-Koveli-Mail-Type": "attachment" }
      });
    }

    // Mark sent first. The attachment cleanup is a separate recorded step.
    await ref.update({
      emailStatus: "sent",
      emailSentAt: FieldValue.serverTimestamp(),
      emailLeaseUntil: null,
      emailError: null
    });

    if (attachmentRef) {
      try {
        await attachmentRef.delete();
        await ref.update({
          attachmentTempDocId: null,
          attachmentUploaded: false,
          attachmentDeleteStatus: "deleted_after_email",
          attachmentDeletedAt: FieldValue.serverTimestamp()
        });
      } catch (deleteError) {
        // Email is already sent: never resend merely because cleanup failed.
        await ref.update({
          attachmentDeleteStatus: "delete_failed",
          attachmentDeleteError: String(deleteError?.message || deleteError)
        });
      }
    }
  } catch (error) {
    await ref.update({
      emailStatus: "pending",
      emailLeaseUntil: null,
      emailError: String(error?.message || error)
    });
    throw error;
  }
}

exports.sendLeaveEmailOnCreate = onDocumentCreated(
  {
    document: "leaveRequests/{leaveId}",
    region: REGION,
    secrets: [EMAIL_USER, EMAIL_PASS],
    retry: true
  },
  async event => {
    if (!event.data) return;
    await processLeave(event.data.ref);
  }
);

exports.retryPendingLeaveEmails = onSchedule(
  {
    schedule: "every 5 minutes",
    region: REGION,
    secrets: [EMAIL_USER, EMAIL_PASS],
    timeZone: "Indian/Maldives"
  },
  async () => {
    const db = getFirestore();
    const snap = await db.collection("leaveRequests")
      .where("emailStatus", "==", "pending")
      .limit(25)
      .get();

    for (const doc of snap.docs) {
      try {
        await processLeave(doc.ref);
      } catch (error) {
        console.error("Retry failed for", doc.id, error);
      }
    }
  }
);
