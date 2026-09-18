if (!firebase.apps.length) {
    firebase.initializeApp(window.KOVELI_FIREBASE_CONFIG);
}

const db = firebase.database();
const body = document.getElementById("usersBody");
const editor = document.getElementById("editor");
const msg = document.getElementById("msg");
let selected = null;
let selectedKey = null;

function esc(value) {
    return String(value ?? "").replace(/[&<>'"]/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[c]);
}

function show(text, type = "ok") {
    msg.textContent = text;
    msg.className = "msg show " + type;
}

function dateText(value) {
    return value ? new Date(value).toLocaleString() : "—";
}

const sessionUser = window.getKoveliSessionUser();
const approvedAdmin = sessionUser && window.getKoveliUserByUsername(sessionUser.username);

if (!approvedAdmin || String(approvedAdmin.role || "").toLowerCase() !== "admin") {
    location.replace("login.html");
} else {
    load();
}

async function load() {
    try {
        const snapshot = await db.ref("registrations").once("value");
        const rows = [];

        snapshot.forEach(child => {
            rows.push({ key: child.key, ...child.val() });
        });

        rows.sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0));

        document.getElementById("pendingCount").textContent =
            rows.filter(x => x.status !== "approved").length;

        document.getElementById("approvedCount").textContent =
            (window.KOVELI_USERS || []).filter(x => x.active !== false).length;

        body.innerHTML = rows.length
            ? rows.map((u, i) => `
                <tr>
                    <td>${esc(u.name)}</td>
                    <td><b>${esc(u.username || "—")}</b></td>
                    <td>${esc(u.email || "—")}</td>
                    <td>${esc(u.status || "pending")}</td>
                    <td>${esc(dateText(u.requestedAt))}</td>
                    <td><button class="table-btn" data-i="${i}">Open</button></td>
                </tr>`).join("")
            : `<tr><td colspan="6" class="empty">No registrations found.</td></tr>`;

        body.querySelectorAll("button[data-i]").forEach(button => {
            button.onclick = () => openUser(rows[Number(button.dataset.i)]);
        });
    } catch (error) {
        show(error.message || "Unable to load registrations.", "error");
    }
}

function openUser(user) {
    selected = user;
    selectedKey = user.key || user.id || user.uid;
    editor.classList.remove("hidden");
    document.getElementById("editName").value = user.name || "";
    document.getElementById("editUsername").value = user.username || "";
    document.getElementById("editEmail").value = user.email || "";
    document.getElementById("generated").value = "";
    editor.scrollIntoView({ behavior: "smooth" });
}

function entry() {
    if (!selected) return "";

    const user = {
        username: document.getElementById("editUsername").value.trim().toLowerCase(),
        name: document.getElementById("editName").value.trim(),
        email: document.getElementById("editEmail").value.trim(),
        passwordHash: selected.passwordHash || "",
        role: document.getElementById("editRole").value,
        department: document.getElementById("editDepartment").value.trim(),
        landingPage: document.getElementById("editLanding").value.trim() || "home.html",
        active: true
    };

    return JSON.stringify(user, null, 4);
}

document.getElementById("generateBtn").onclick = () => {
    document.getElementById("generated").value = entry();
};

document.getElementById("copyBtn").onclick = async () => {
    const text = document.getElementById("generated").value || entry();
    document.getElementById("generated").value = text;
    await navigator.clipboard.writeText(text);
    show("User entry copied. Paste it into script/user.js.");
};

document.getElementById("markBtn").onclick = async () => {
    if (!selected || !selectedKey) return;

    await db.ref("registrations/" + selectedKey).update({
        status: "approved",
        approvedAt: firebase.database.ServerValue.TIMESTAMP
    });

    show("Registration marked approved. Add the generated entry to script/user.js and redeploy.");
    load();
};

document.getElementById("refreshBtn").onclick = load;

document.getElementById("logout").onclick = () => {
    sessionStorage.removeItem("koveliUser");
    location.href = "login.html";
};
