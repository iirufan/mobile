// APPROVED USERS FILE
// Admin downloads/replaces this file after reviewing registrations/password changes.
// Login checks this file first. Passwords are intentionally plain text because this
// matches the requested workflow. For a production system, Firebase Authentication
// with password hashes is safer.

window.PORTAL_USERS = [
  {
    username: "admin",
    fullname: "System Admin",
    rcno: "ADMIN001",
    email: "",
    contact: "",
    password: "ChangeMe123!",
    role: "admin",
    active: true
  }
];
