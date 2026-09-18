/* KOVELI LOUNGE - APPROVED USERS
   Admin maintains this file.

   IMPORTANT:
   - Login uses username + password from this file.
   - Passwords are stored as SHA-256 hashes, not plain text.
   - Registration requests are stored in Firebase Realtime Database only.
   - Firebase Authentication is NOT used.
*/
window.KOVELI_USERS = [
    {
        username: "admin",
        name: "System Administrator",
        email: "admin@example.com",
        passwordHash: "REPLACE_WITH_SHA256_HASH_FROM_ADMIN_PAGE",
        role: "admin",
        department: "Koveli Lounge",
        landingPage: "admin.html",
        active: true
    }
];

window.getKoveliUserByUsername = function (username) {
    const key = String(username || "").trim().toLowerCase();
    return (window.KOVELI_USERS || []).find(function (user) {
        return user.active !== false &&
            String(user.username || "").trim().toLowerCase() === key;
    }) || null;
};

window.sha256 = async function (text) {
    const data = new TextEncoder().encode(String(text));
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
        .map(function (b) { return b.toString(16).padStart(2, "0"); })
        .join("");
};

window.getKoveliSessionUser = function () {
    try {
        return JSON.parse(sessionStorage.getItem("koveliUser") || "null");
    } catch (_) {
        return null;
    }
};
