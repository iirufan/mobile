firebase.initializeApp(window.KOVELI_FIREBASE_CONFIG);

const who = document.getElementById("who");
const logoutButton = document.getElementById("logout");

firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        location.href = "login.html";
        return;
    }

    const approved = window.getKoveliApprovedUser(user);

    if (!approved) {
        await firebase.auth().signOut();
        location.href = "system-authorization.html";
        return;
    }

    who.innerHTML =
        "<b>" + escapeHtml(approved.name || user.email) + "</b><br>" +
        escapeHtml(user.email) + "<br>Role: " +
        escapeHtml(approved.role || "user");
});

logoutButton.addEventListener("click", async () => {
    await firebase.auth().signOut();
    sessionStorage.clear();
    location.href = "login.html";
});

function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
    })[character]);
}
