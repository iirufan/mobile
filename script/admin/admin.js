// ============================================================
// KOVELI LOUNGE
// USER ADMINISTRATION
// ============================================================


// ============================================================
// FIREBASE
// ============================================================

if (!firebase.apps.length) {

    firebase.initializeApp(
        window.KOVELI_FIREBASE_CONFIG
    );

}

const db = firebase.database();


// ============================================================
// ELEMENTS
// ============================================================

const body =
    document.getElementById("usersBody");

const editor =
    document.getElementById("editor");

const msg =
    document.getElementById("msg");

const deleteBtn =
    document.getElementById("deleteBtn");


// ============================================================
// CURRENT SELECTION
// ============================================================

let selected = null;
let selectedKey = null;


// ============================================================
// HELPERS
// ============================================================

function esc(value) {

    return String(value ?? "")
        .replace(
            /[&<>'"]/g,
            c => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "'": "&#39;",
                '"': "&quot;"
            })[c]
        );

}


function show(text, type = "ok") {

    msg.textContent = text;

    msg.className =
        "msg show " + type;

}


function hideMessage() {

    msg.textContent = "";

    msg.className = "msg";

}


function dateText(value) {

    if (!value) {
        return "—";
    }

    try {

        return new Date(
            value
        ).toLocaleString();

    } catch {

        return "—";

    }

}


// ============================================================
// ADMIN SESSION CHECK
// ============================================================

const sessionUser =
    window.getKoveliSessionUser();

const approvedAdmin =
    sessionUser
        ? window.getKoveliUserByUsername(
            sessionUser.username
        )
        : null;


if (
    !approvedAdmin ||
    String(
        approvedAdmin.role || ""
    ).toLowerCase() !== "admin"
) {

    location.replace(
        "login.html"
    );

} else {

    load();

}


// ============================================================
// LOAD REGISTRATION REQUESTS
// ============================================================

async function load() {

    try {

        hideMessage();

        const snapshot =
            await db
                .ref("registrations")
                .once("value");


        const rows = [];


        snapshot.forEach(
            child => {

                rows.push({

                    key: child.key,

                    ...child.val()

                });

            }
        );


        rows.sort(
            (a, b) =>
                (b.requestedAt || 0) -
                (a.requestedAt || 0)
        );


        // --------------------------
        // COUNTERS
        // --------------------------

        document.getElementById(
            "pendingCount"
        ).textContent =
            rows.filter(
                x =>
                    String(
                        x.status || "pending"
                    ).toLowerCase()
                    !== "approved"
            ).length;


        document.getElementById(
            "approvedCount"
        ).textContent =
            (
                window.KOVELI_USERS || []
            ).filter(
                x => x.active !== false
            ).length;


        // --------------------------
        // TABLE
        // --------------------------

        body.innerHTML =
            rows.length

                ? rows.map(
                    (u, i) => `

                    <tr>

                        <td>
                            ${esc(
                                u.name || "—"
                            )}
                        </td>

                        <td>
                            <b>
                                ${esc(
                                    u.username || "—"
                                )}
                            </b>
                        </td>

                        <td>
                            ${esc(
                                u.email || "—"
                            )}
                        </td>

                        <td>
                            <span class="status-pill
                                ${
                                    String(
                                        u.status ||
                                        "pending"
                                    ).toLowerCase()
                                    === "approved"
                                        ? "approved"
                                        : "pending"
                                }
                            ">
                                ${esc(
                                    u.status ||
                                    "pending"
                                )}
                            </span>
                        </td>

                        <td>
                            ${esc(
                                dateText(
                                    u.requestedAt
                                )
                            )}
                        </td>

                        <td>

                            <button
                                class="table-btn"
                                data-i="${i}"
                            >
                                Open
                            </button>

                        </td>

                    </tr>

                `
                ).join("")

                : `

                <tr>

                    <td
                        colspan="6"
                        class="empty"
                    >
                        No registration
                        requests found.
                    </td>

                </tr>

                `;


        // --------------------------
        // OPEN BUTTONS
        // --------------------------

        body
            .querySelectorAll(
                "button[data-i]"
            )
            .forEach(
                button => {

                    button.onclick =
                        () => {

                            openUser(
                                rows[
                                    Number(
                                        button.dataset.i
                                    )
                                ]
                            );

                        };

                }
            );


    } catch (error) {

        console.error(
            "Registration loading error:",
            error
        );

        show(
            error.message ||
            "Unable to load registrations.",
            "error"
        );

    }

}


// ============================================================
// OPEN REGISTRATION
// ============================================================

function openUser(user) {

    selected = user;

    selectedKey =
        user.key ||
        user.id ||
        user.uid;


    editor.classList.remove(
        "hidden"
    );


    document.getElementById(
        "editName"
    ).value =
        user.name || "";


    document.getElementById(
        "editUsername"
    ).value =
        user.username || "";


    document.getElementById(
        "editEmail"
    ).value =
        user.email || "";


    // Keep existing saved values when available

    document.getElementById(
        "editRole"
    ).value =
        user.role ||
        "user";


    document.getElementById(
        "editDepartment"
    ).value =
        user.department ||
        "Koveli Lounge";


    document.getElementById(
        "editLanding"
    ).value =
        user.landingPage ||
        "home.html";


    document.getElementById(
        "generated"
    ).value = "";


    editor.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


// ============================================================
// CREATE USER.JS ENTRY
// ============================================================

function entry() {

    if (!selected) {
        return "";
    }


    const username =
        document
            .getElementById(
                "editUsername"
            )
            .value
            .trim()
            .toLowerCase();


    const name =
        document
            .getElementById(
                "editName"
            )
            .value
            .trim();


    if (!username) {

        show(
            "Username is required.",
            "error"
        );

        return "";

    }


    if (!name) {

        show(
            "Name is required.",
            "error"
        );

        return "";

    }


    // Check if username already exists
    // in user.js

    const existing =
        (
            window.KOVELI_USERS || []
        ).find(
            user =>
                String(
                    user.username || ""
                ).toLowerCase()
                === username
        );


    if (existing) {

        show(
            "This username already exists in user.js.",
            "error"
        );

        return "";

    }


    const user = {

        username:
            username,

        name:
            name,

        email:
            document
                .getElementById(
                    "editEmail"
                )
                .value
                .trim(),

        passwordHash:
            selected.passwordHash || "",

        role:
            document
                .getElementById(
                    "editRole"
                )
                .value,

        department:
            document
                .getElementById(
                    "editDepartment"
                )
                .value
                .trim(),

        landingPage:
            document
                .getElementById(
                    "editLanding"
                )
                .value
                .trim()
                || "home.html",

        active: true

    };


    return JSON.stringify(
        user,
        null,
        4
    );

}


// ============================================================
// GENERATE ENTRY
// ============================================================

document.getElementById(
    "generateBtn"
).onclick = () => {

    const generatedEntry =
        entry();


    if (!generatedEntry) {
        return;
    }


    document.getElementById(
        "generated"
    ).value =
        generatedEntry;


    show(
        "user.js entry generated."
    );

};


// ============================================================
// COPY ENTRY
// ============================================================

document.getElementById(
    "copyBtn"
).onclick =
async () => {

    const text =
        document.getElementById(
            "generated"
        ).value ||
        entry();


    if (!text) {
        return;
    }


    document.getElementById(
        "generated"
    ).value =
        text;


    try {

        await navigator
            .clipboard
            .writeText(text);


        show(
            "User entry copied. Paste it into script/user.js."
        );


    } catch (error) {

        console.error(
            "Clipboard error:",
            error
        );


        // Fallback for browsers where
        // clipboard API is unavailable.

        const textarea =
            document.getElementById(
                "generated"
            );


        textarea.focus();
        textarea.select();


        try {

            document.execCommand(
                "copy"
            );

            show(
                "User entry copied. Paste it into script/user.js."
            );

        } catch {

            show(
                "Unable to copy automatically. Select the generated entry and copy it manually.",
                "error"
            );

        }

    }

};


// ============================================================
// MARK APPROVED
// ============================================================

document.getElementById(
    "markBtn"
).onclick =
async () => {

    if (
        !selected ||
        !selectedKey
    ) {

        show(
            "Open a registration request first.",
            "error"
        );

        return;

    }


    try {

        await db
            .ref(
                "registrations/" +
                selectedKey
            )
            .update({

                status:
                    "approved",

                approvedAt:
                    firebase
                        .database
                        .ServerValue
                        .TIMESTAMP

            });


        show(
            "Registration marked approved."
        );


        await load();


    } catch (error) {

        console.error(
            "Approval error:",
            error
        );


        show(
            error.message ||
            "Unable to mark registration approved.",
            "error"
        );

    }

};


// ============================================================
// DELETE REGISTRATION REQUEST
// ============================================================

deleteBtn.onclick =
async () => {

    if (
        !selected ||
        !selectedKey
    ) {

        show(
            "Open a registration request first.",
            "error"
        );

        return;

    }


    const username =
        document
            .getElementById(
                "editUsername"
            )
            .value
            .trim()
        ||
        selected.username
        ||
        "";


    const name =
        document
            .getElementById(
                "editName"
            )
            .value
            .trim()
        ||
        selected.name
        ||
        username;


    // ------------------------------------------------
    // SAFETY CHECK
    // Check whether username exists in user.js
    // ------------------------------------------------

    const existsInUserJs =
        (
            window.KOVELI_USERS || []
        ).some(
            user =>
                String(
                    user.username || ""
                )
                    .trim()
                    .toLowerCase()
                ===
                String(
                    username
                )
                    .trim()
                    .toLowerCase()
        );


    let confirmMessage;


    if (existsInUserJs) {

        confirmMessage =
            `${name} is already found in user.js.\n\n` +
            `Delete this registration request from Firebase?\n\n` +
            `This cannot be undone.`;

    } else {

        confirmMessage =
            `WARNING\n\n` +
            `${name} was NOT found in the currently loaded user.js.\n\n` +
            `Make sure you have added and deployed this user before deleting the request.\n\n` +
            `Delete the registration request anyway?`;

    }


    const confirmed =
        window.confirm(
            confirmMessage
        );


    if (!confirmed) {
        return;
    }


    // Extra confirmation if user
    // is not yet found in user.js

    if (!existsInUserJs) {

        const secondConfirm =
            window.confirm(
                "The user is not currently found in user.js.\n\nAre you sure you want to permanently delete this request?"
            );


        if (!secondConfirm) {
            return;
        }

    }


    const originalText =
        deleteBtn.textContent;


    deleteBtn.disabled = true;

    deleteBtn.textContent =
        "Deleting...";


    try {

        // Permanently delete registration
        // from Realtime Database

        await db
            .ref(
                "registrations/" +
                selectedKey
            )
            .remove();


        // Clear selected registration

        selected = null;
        selectedKey = null;


        // Hide editor

        editor.classList.add(
            "hidden"
        );


        document.getElementById(
            "generated"
        ).value = "";


        show(
            "Registration request deleted successfully."
        );


        // Refresh table

        await load();


    } catch (error) {

        console.error(
            "Delete registration error:",
            error
        );


        show(
            error.message ||
            "Unable to delete registration request.",
            "error"
        );


    } finally {

        deleteBtn.disabled = false;

        deleteBtn.textContent =
            originalText;

    }

};


// ============================================================
// REFRESH
// ============================================================

document.getElementById(
    "refreshBtn"
).onclick =
    load;


// ============================================================
// LOGOUT
// ============================================================

document.getElementById(
    "logout"
).onclick = () => {

    sessionStorage.removeItem(
        "koveliUser"
    );

    location.href =
        "login.html";

};
