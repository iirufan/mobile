// ============================================================
// KOVELI LOUNGE - SYSTEM REGISTRATION AUTHORIZATION
// ============================================================
// IMPORTANT:
// This browser-side code is only a registration gate/convenience check.
// It is NOT a secure replacement for Firebase security rules or a server.
// Change the code below before deployment.
// ============================================================

const KOVELI_SYSTEM_AUTH_CODE = "KOVELI2026";
const AUTH_SESSION_KEY = "koveliRegistrationAuthorized";

const authForm = document.getElementById("authForm");
const authCodeInput = document.getElementById("authCode");
const authBtn = document.getElementById("authBtn");
const msg = document.getElementById("msg");

function showMessage(message, type = "error") {
    msg.textContent = message;
    msg.className = "msg show " + type;
}

function authorizeRegistration() {
    sessionStorage.setItem(AUTH_SESSION_KEY, "true");
    window.location.href = "register.html";
}

if (authForm) {
    authForm.addEventListener("submit", (event) => {
        event.preventDefault();
        msg.className = "msg";
        authBtn.classList.add("loading");

        const enteredCode = authCodeInput.value.trim();

        if (enteredCode === KOVELI_SYSTEM_AUTH_CODE) {
            authorizeRegistration();
            return;
        }

        showMessage("Invalid system authorization code.");
        authCodeInput.value = "";
        authCodeInput.focus();
        authBtn.classList.remove("loading");
    });
}
