// ============================================================
// KOVELI STAFF PORTAL - SHARED EMAIL HELPER
// ============================================================
(function () {
    "use strict";

    function arr(value) {
        if (!value) return [];
        if (Array.isArray(value)) return value.flatMap(arr);

        return String(value)
            .split(/[;,]/)
            .map(v => v.trim())
            .filter(Boolean);
    }

    function uniq(values) {
        return [
            ...new Set(
                arr(values)
                    .map(v => String(v || "").trim())
                    .filter(Boolean)
            )
        ];
    }

    function getLegacyConfig() {
        return window.EMAIL_RECIPIENTS || {};
    }

    async function apiSend(payload) {
        const response = await fetch("/api/send-email", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const raw = await response.text();
        let body = {};

        try {
            body = raw ? JSON.parse(raw) : {};
        } catch (_) {
            body = { raw };
        }

        if (!response.ok || body?.success === false) {
            throw new Error(
                body?.error ||
                body?.message ||
                `Email API returned ${response.status}`
            );
        }

        // Never silently treat partial SMTP delivery as full success.
        if (body?.partialDelivery || (Array.isArray(body?.rejected) && body.rejected.length)) {
            const rejected = Array.isArray(body?.rejected) ? body.rejected : [];
            throw new Error(
                rejected.length
                    ? `Email was not delivered to: ${rejected.join(", ")}`
                    : "Email was only partially delivered."
            );
        }

        return body;
    }

    window.PortalEmail = window.PortalEmail || {};

    // Direct shared API sender.
    window.PortalEmail.send = apiSend;

    // ------------------------------------------------------------
    // SPLIT EMAIL SENDER
    // ------------------------------------------------------------
    // IMPORTANT:
    // attachmentTo and textOnlyTo are NOT de-duplicated against each other.
    // Therefore an address in both groups receives BOTH emails.
    //
    // Text-only email is sent first and attachment email is attempted
    // independently. A failed attachment email will not stop normal email.
    // ------------------------------------------------------------
    window.PortalEmail.sendSplit = async function (options = {}) {
        const attachmentRecipients = uniq(options.attachmentTo);
        const textOnlyRecipients = uniq(options.textOnlyTo);

        if (!attachmentRecipients.length && !textOnlyRecipients.length) {
            throw new Error("No email recipients configured.");
        }

        const result = {
            textOnlySent: false,
            attachmentSent: false,
            textOnlyResult: null,
            attachmentResult: null,
            errors: []
        };

        // Send normal email first.
        if (textOnlyRecipients.length) {
            try {
                result.textOnlyResult = await apiSend({
                    to: textOnlyRecipients,
                    subject: options.subject || "Koveli Staff Portal",
                    message: options.message || "",
                    html: options.html || undefined,
                    replyTo: options.replyTo || undefined
                });

                result.textOnlySent = true;

                console.log(
                    "✅ Text-only email sent to:",
                    textOnlyRecipients
                );
            } catch (error) {
                console.error("❌ Text-only email failed:", error);

                result.errors.push({
                    type: "textOnly",
                    error: error?.message || String(error)
                });
            }
        }

        // Send attachment email independently.
        if (attachmentRecipients.length) {
            try {
                const payload = {
                    to: attachmentRecipients,
                    subject: options.subject || "Koveli Staff Portal",
                    message: options.message || "",
                    html: options.html || undefined,
                    replyTo: options.replyTo || undefined
                };

                if (options.attachment) {
                    payload.attachment = options.attachment;
                }

                result.attachmentResult = await apiSend(payload);
                result.attachmentSent = Boolean(options.attachment);

                console.log(
                    options.attachment
                        ? "✅ Attachment email sent to:"
                        : "✅ Email sent to attachment group without attachment:",
                    attachmentRecipients
                );
            } catch (error) {
                console.error("❌ Attachment email failed:", error);

                result.errors.push({
                    type: "attachment",
                    error: error?.message || String(error)
                });
            }
        }

        // Any failed group must be visible to the caller. Other groups are
        // still attempted first, so one failure never blocks the other send.
        if (result.errors.length) {
            throw new Error(
                result.errors
                    .map(item => `${item.type}: ${item.error}`)
                    .join(" | ") ||
                "Unable to send email."
            );
        }

        return result;
    };

    // ------------------------------------------------------------
    // LEAVE REQUEST
    // ------------------------------------------------------------
    // Everyone in textOnlyTo gets normal email.
    // attachmentTo gets a second copy with attachment.
    // Staff email is also added to the normal email list when provided.
    // ------------------------------------------------------------
    window.PortalEmail.sendLeaveSplit = async function (data = {}) {
        const recipients =
            window.PORTAL_EMAILS?.leave ||
            window.PORTAL_EMAILS?.leaveRequest ||
            {};

        const legacy = getLegacyConfig();

        // Attachment recipients are intentionally restricted to the
        // explicitly configured attachment group, plus legacy attachment
        // fields only. We do NOT automatically add legacy admin/supervisor.
        const attachmentTo = uniq([
            recipients.attachmentTo,
            recipients.attachmentRecipients,
            legacy.attachmentTo,
            legacy.attachmentRecipients
        ]);

        const textOnlyTo = uniq([
            recipients.textOnlyTo,
            recipients.textOnlyRecipients,
            recipients.to,
            recipients.recipients,
            recipients.cc,
            legacy.textOnlyTo,
            legacy.textOnlyRecipients,
            legacy.ccList,
            data.staffEmail
        ]);

        return window.PortalEmail.sendSplit({
            // Do not send a second copy when there is no attachment.
            attachmentTo: data.attachment ? attachmentTo : [],
            textOnlyTo,
            subject: data.subject || "Leave Request",
            message: data.message || "",
            html: data.html || undefined,
            attachment: data.attachment || null,
            replyTo: data.replyTo || ""
        });
    };

    // ------------------------------------------------------------
    // DUTY CHANGE
    // ------------------------------------------------------------
    // Common configured recipients + requester + accepting staff.
    // ------------------------------------------------------------
    window.PortalEmail.sendDuty = async function (data = {}) {
        const recipients = window.PORTAL_EMAILS?.dutyChange || {};
        const legacy = getLegacyConfig();

        const to = uniq([
            recipients.to,
            recipients.recipients,
            recipients.admin,
            recipients.supervisor,
            legacy.admin,
            legacy.supervisor,
            legacy.ccList,
            data.requesterEmail,
            data.accepterEmail
        ]);

        if (!to.length) {
            throw new Error("No Duty Change email recipients configured.");
        }

        return apiSend({
            to,
            subject: data.subject || "Duty Change",
            message: data.message || "",
            html: data.html || undefined,
            replyTo: data.replyTo || undefined
        });
    };

    // ------------------------------------------------------------
    // ANNUAL LEAVE
    // ------------------------------------------------------------
    // Common configured recipients + requesting staff email.
    // ------------------------------------------------------------
    window.PortalEmail.sendAnnualLeave = async function (data = {}) {
        const recipients =
            window.PORTAL_EMAILS?.annualLeave ||
            window.PORTAL_EMAILS?.annual ||
            {};

        const legacy = getLegacyConfig();

        const to = uniq([
            recipients.to,
            recipients.recipients,
            recipients.admin,
            recipients.supervisor,
            legacy.admin,
            legacy.supervisor,
            legacy.ccList,
            data.staffEmail
        ]);

        if (!to.length) {
            throw new Error("No Annual Leave email recipients configured.");
        }

        return apiSend({
            to,
            subject: data.subject || "Annual Leave",
            message: data.message || "",
            html: data.html || undefined,
            replyTo: data.replyTo || undefined
        });
    };

    // ------------------------------------------------------------
    // GENERAL EMAIL
    // ------------------------------------------------------------
    window.PortalEmail.sendGeneral = async function (data = {}) {
        const recipients = window.PORTAL_EMAILS?.general || {};

        const to = uniq([
            recipients.to,
            recipients.recipients,
            data.to
        ]);

        if (!to.length) {
            throw new Error("No general email recipients configured.");
        }

        return apiSend({
            to,
            cc: uniq(data.cc),
            bcc: uniq(data.bcc),
            subject: data.subject || "Koveli Staff Portal",
            message: data.message || "",
            html: data.html || undefined,
            replyTo: data.replyTo || undefined,
            attachment: data.attachment || undefined
        });
    };
})();
