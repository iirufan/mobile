const msg = document.getElementById("msg");
const form = document.getElementById("form");
const btn = document.getElementById("loginBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

function show(message, type = "error") {
    msg.textContent = message;
    msg.className = "msg show " + type;
}

try {
    firebase.initializeApp(window.KOVELI_FIREBASE_CONFIG);
} catch (error) {
    show("Firebase configuration is not ready. Update scripts/config/firebase-config.js.");
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    btn.classList.add("loading");
    msg.className = "msg";

    try {
        const credential = await firebase.auth().signInWithEmailAndPassword(
            emailInput.value.trim(),
            passwordInput.value
        );

        const approved = window.getKoveliApprovedUser(credential.user);

        if (!approved) {
            await firebase.auth().signOut();
            sessionStorage.removeItem("koveliUser");
            location.href = "system-authorization.html";
            return;
        }

        sessionStorage.setItem("koveliUser", JSON.stringify({
            uid: credential.user.uid,
            email: credential.user.email,
            name: approved.name || credential.user.email,
            role: approved.role || "user"
        }));

        location.href = "home.html";
    } catch (error) {
        show(error.message || "Login failed.");
    } finally {
        btn.classList.remove("loading");
    }
});
