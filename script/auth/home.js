const who = document.getElementById("who");
const logoutButton = document.getElementById("logout");
const sessionUser = window.getKoveliSessionUser();

if (!sessionUser) {
    location.replace("login.html");
} else {
    const approved = window.getKoveliUserByUsername(sessionUser.username);

    if (!approved) {
        sessionStorage.removeItem("koveliUser");
        location.replace("login.html");
    } else {
        who.innerHTML =
            "<b>" + escapeHtml(approved.name || approved.username) + "</b><br>" +
            escapeHtml(approved.username) + "<br>Role: " +
            escapeHtml(approved.role || "user");
    }
}

logoutButton.addEventListener("click", () => {
    sessionStorage.removeItem("koveliUser");
    location.href = "login.html";
});

function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[character]);
}
