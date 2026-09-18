const form = document.getElementById("form");
const msg = document.getElementById("msg");
const btn = document.getElementById("regBtn");
const nameInput = document.getElementById("name");
const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmInput = document.getElementById("confirm");

function show(message, type = "error") {
    msg.textContent = message;
    msg.className = "msg show " + type;
}

if (!firebase.apps.length) {
    firebase.initializeApp(window.KOVELI_FIREBASE_CONFIG);
}

const db = firebase.database();

async function sha256(text) {
    const data = new TextEncoder().encode(String(text));
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = nameInput.value.trim();
    const username = usernameInput.value.trim().toLowerCase();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
        show("Username must be 3–30 characters using letters, numbers, dot, underscore or hyphen.");
        return;
    }

    if (password !== confirmInput.value) {
        show("Passwords do not match.");
        return;
    }

    if (password.length < 6) {
        show("Password must contain at least 6 characters.");
        return;
    }

    btn.classList.add("loading");
    msg.className = "msg";

    try {
        const duplicate = await db.ref("registrations")
            .orderByChild("username")
            .equalTo(username)
            .once("value");

        if (duplicate.exists()) {
            throw new Error("This username has already been registered.");
        }

        const requestRef = db.ref("registrations").push();
        const passwordHash = await sha256(password);

        await requestRef.set({
            id: requestRef.key,
            name,
            username,
            email,
            passwordHash,
            status: "pending",
            requestedAt: firebase.database.ServerValue.TIMESTAMP
        });

        sessionStorage.removeItem("koveliRegistrationAuthorized");
        form.reset();
        show("Registration submitted. Please wait for administrator approval.", "ok");
    } catch (error) {
        show(error.message || "Registration failed.");
    } finally {
        btn.classList.remove("loading");
    }
});
