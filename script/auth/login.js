const msg = document.getElementById("msg");
const form = document.getElementById("form");
const btn = document.getElementById("loginBtn");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

function show(message, type = "error") {
    msg.textContent = message;
    msg.className = "msg show " + type;
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    btn.classList.add("loading");
    msg.className = "msg";

    try {
        const username = usernameInput.value.trim().toLowerCase();
        const approved = window.getKoveliUserByUsername(username);

        if (!approved) {
            throw new Error("Username is not approved or does not exist.");
        }

        const enteredHash = await window.sha256(passwordInput.value);

        if (!approved.passwordHash || enteredHash !== approved.passwordHash) {
            throw new Error("Incorrect username or password.");
        }

        const sessionUser = {
            username: approved.username,
            email: approved.email || "",
            name: approved.name || approved.username,
            role: approved.role || "user",
            department: approved.department || "",
            landingPage: approved.landingPage || "home.html"
        };

        sessionStorage.setItem("koveliUser", JSON.stringify(sessionUser));
        location.href = sessionUser.landingPage;
    } catch (error) {
        show(error.message || "Login failed.");
    } finally {
        btn.classList.remove("loading");
    }
});
