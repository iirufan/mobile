// ============================================================
// KOVELI STAFF PORTAL - SHARED EMAIL CONFIGURATION
// ============================================================
// One shared recipient configuration for Leave, Duty Change,
// Annual Leave and other portal email functions.
// ============================================================

window.PORTAL_EMAILS = window.PORTAL_EMAILS || {};

const KOVELI_COMMON_RECIPIENTS = [
    "abdulla.irufan@macl.aero",
    "leelidutychange@gmail.com"
];

// Leave request routing:
// 1) Everyone below receives the normal text-only email.
// 2) Only attachmentTo recipients receive a SECOND email with attachment.
// An address may intentionally exist in BOTH lists.
window.PORTAL_EMAILS.leave = {
    textOnlyTo: [...KOVELI_COMMON_RECIPIENTS],
    attachmentTo: [
        "abdulla.irufan@macl.aero"
        
    ]
};

// Duty Change: common recipients + requester + accepting staff
// are added automatically by email-helper.js.
window.PORTAL_EMAILS.dutyChange = {
    to: [...KOVELI_COMMON_RECIPIENTS]
};

// Annual Leave: common recipients + requesting staff email
// are added automatically by email-helper.js.
window.PORTAL_EMAILS.annualLeave = {
    to: [...KOVELI_COMMON_RECIPIENTS]
};

// Optional general-purpose portal email recipient group.
window.PORTAL_EMAILS.general = {
    to: [...KOVELI_COMMON_RECIPIENTS]
};
