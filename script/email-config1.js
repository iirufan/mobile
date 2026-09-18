window.PORTAL_EMAILS = window.PORTAL_EMAILS || {};
const KOVELI_COMMON_RECIPIENTS = ["abdulla.irufan@macl.aero"];
window.PORTAL_EMAILS.leave = { textOnlyTo:[...KOVELI_COMMON_RECIPIENTS], attachmentTo:["abdulla.irufan@macl.aero"] };
window.PORTAL_EMAILS.dutyChange = { to:[...KOVELI_COMMON_RECIPIENTS] };
window.PORTAL_EMAILS.annualLeave = { to:[...KOVELI_COMMON_RECIPIENTS] };
window.PORTAL_EMAILS.general = { to:[...KOVELI_COMMON_RECIPIENTS] };
