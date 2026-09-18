const form = document.getElementById("form");
const msg = document.getElementById("msg");
const btn = document.getElementById("regBtn");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmInput = document.getElementById("confirm");

function show(message, type = "error") {
    msg.textContent = message;
    msg.className = "msg show " + type;
}

firebase.initializeApp(window.KOVELI_FIREBASE_CONFIG);

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (passwordInput.value !== confirmInput.value) {
        show("Passwords do not match.");
        return;
    }

    btn.classList.add("loading");

    try {
        const credential = await firebase.auth().createUserWithEmailAndPassword(
            emailInput.value.trim(),
            passwordInput.value
        );

        await credential.user.updateProfile({
            displayName: nameInput.value.trim()
        });

        await firebase.database().ref("registrations/" + credential.user.uid).set({
            uid: credential.user.uid,
            name: nameInput.value.trim(),
            email: credential.user.email,
            status: "pending",
            requestedAt: firebase.database.ServerValue.TIMESTAMP
        });

        await firebase.auth().signOut();

        show(
            "Registration submitted. Your UID is " + credential.user.uid +
            ". Ask the administrator to approve your account in user.js.",
            "ok"
        );
        form.reset();
    } catch (error) {
        show(error.message || "Registration failed.");
    } finally {
        btn.classList.remove("loading");
    }
});
