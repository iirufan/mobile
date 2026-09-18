// ============================================================
// KOVELI STAFF PORTAL - SHARED EMAIL API
// Vercel Serverless Function
// ============================================================
const nodemailer = require("nodemailer");

const MAX_ATTACHMENT_BYTES = 2.5 * 1024 * 1024;

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function parseEmailList(value) {
    let values = [];

    if (Array.isArray(value)) {
        values = value.flatMap(item => parseEmailList(item));
    } else if (value) {
        values = String(value)
            .split(/[;,]/)
            .map(item => item.trim())
            .filter(Boolean);
    }

    const unique = [];
    const seen = new Set();

    for (const item of values) {
        const email = normalizeEmail(item);

        if (!email || !isValidEmail(email) || seen.has(email)) {
            continue;
        }

        seen.add(email);
        unique.push(email);
    }

    return unique;
}

function estimateBase64Bytes(base64) {
    const clean = String(base64 || "")
        .replace(/^data:[^;]+;base64,/i, "")
        .replace(/\s/g, "");

    if (!clean) return 0;

    const padding = clean.endsWith("==")
        ? 2
        : clean.endsWith("=")
            ? 1
            : 0;

    return Math.max(0, Math.floor(clean.length * 3 / 4) - padding);
}

function cleanBase64(base64) {
    return String(base64 || "")
        .replace(/^data:[^;]+;base64,/i, "")
        .replace(/\s/g, "");
}

module.exports = async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");

    if (req.method === "GET") {
        const emailUser = String(process.env.EMAIL_USER || "").trim();
        const emailPass = String(process.env.EMAIL_PASS || "").replace(/\s/g, "");

        return res.status(200).json({
            success: true,
            service: "Koveli Staff Portal Email API",
            configured: Boolean(emailUser && emailPass)
        });
    }

    if (req.method !== "POST") {
        res.setHeader("Allow", "GET, POST");
        return res.status(405).json({
            success: false,
            error: "Method not allowed"
        });
    }

    try {
        const emailUser = String(process.env.EMAIL_USER || "").trim();
        const emailPass = String(process.env.EMAIL_PASS || "").replace(/\s/g, "");
        const fromName = String(
            process.env.EMAIL_FROM_NAME || "Koveli Staff Portal"
        ).trim();

        if (!emailUser || !emailPass) {
            return res.status(500).json({
                success: false,
                error: "Email server is not configured. EMAIL_USER or EMAIL_PASS is missing."
            });
        }

        const body = req.body || {};

        const to = parseEmailList(body.to);
        const cc = parseEmailList(body.cc);
        const bcc = parseEmailList(body.bcc);

        const subject = String(body.subject || "").trim();
        const message = String(body.message || body.text || "").trim();
        const html = body.html ? String(body.html) : "";
        const replyTo = isValidEmail(body.replyTo)
            ? String(body.replyTo).trim()
            : undefined;

        if (!to.length) {
            return res.status(400).json({
                success: false,
                error: "At least one valid recipient is required."
            });
        }

        if (!subject) {
            return res.status(400).json({
                success: false,
                error: "Email subject is required."
            });
        }

        if (!message && !html) {
            return res.status(400).json({
                success: false,
                error: "Email message is required."
            });
        }

        const mailOptions = {
            from: `"${fromName.replace(/"/g, "")}" <${emailUser}>`,
            to,
            subject,
            text: message || undefined,
            html: html || undefined,
            replyTo
        };

        if (cc.length) mailOptions.cc = cc;
        if (bcc.length) mailOptions.bcc = bcc;

        let attachmentSent = false;

        if (body.attachment) {
            const attachment = body.attachment;
            const filename = String(
                attachment.filename || "attachment"
            ).trim();
            const contentType = String(
                attachment.contentType || "application/octet-stream"
            ).trim();
            const base64 = cleanBase64(attachment.contentBase64);

            if (!base64) {
                return res.status(400).json({
                    success: false,
                    error: "Attachment content is empty."
                });
            }

            // Reject malformed Base64 instead of allowing Buffer.from() to
            // silently decode corrupted attachment data.
            if (
                base64.length % 4 !== 0 ||
                !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)
            ) {
                return res.status(400).json({
                    success: false,
                    error: "Attachment data is not valid Base64."
                });
            }

            const attachmentBytes = estimateBase64Bytes(base64);

            if (attachmentBytes > MAX_ATTACHMENT_BYTES) {
                return res.status(413).json({
                    success: false,
                    error: "Attachment is too large. Maximum attachment size is 2.5 MB."
                });
            }

            mailOptions.attachments = [
                {
                    filename,
                    content: Buffer.from(base64, "base64"),
                    contentType
                }
            ];

            attachmentSent = true;
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: emailUser,
                pass: emailPass
            }
        });

        await transporter.verify();

        const info = await transporter.sendMail(mailOptions);

        const accepted = Array.isArray(info.accepted) ? info.accepted : [];
        const rejected = Array.isArray(info.rejected) ? info.rejected : [];

        // Nodemailer can resolve without throwing even when SMTP rejects
        // one or more recipients. Never report a total rejection as success.
        if (!accepted.length) {
            return res.status(502).json({
                success: false,
                error: rejected.length
                    ? `Email server rejected all recipients: ${rejected.join(", ")}`
                    : "Email server did not confirm any accepted recipients.",
                messageId: info.messageId || null,
                accepted,
                rejected,
                attachmentSent
            });
        }

        return res.status(200).json({
            success: true,
            partialDelivery: rejected.length > 0,
            warning: rejected.length
                ? `Some recipients were rejected: ${rejected.join(", ")}`
                : null,
            messageId: info.messageId || null,
            accepted,
            rejected,
            attachmentSent
        });

    } catch (error) {
        console.error("send-email API error:", error);

        const code = String(error?.code || "");
        const responseCode = Number(error?.responseCode || 0);
        const message = String(error?.message || "Unable to send email.");

        let friendlyError = message;

        if (
            code === "EAUTH" ||
            responseCode === 535 ||
            /invalid login|username and password not accepted|authentication/i.test(message)
        ) {
            friendlyError =
                "Gmail authentication failed. Check EMAIL_USER and use a valid Google App Password for EMAIL_PASS.";
        }

        return res.status(500).json({
            success: false,
            error: friendlyError
        });
    }
};
