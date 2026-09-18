/*
  KOVELI LOUNGE - APPROVED USERS
  --------------------------------
  Admin updates this file after reviewing a Firebase registration.
  IMPORTANT: Never put passwords in this file.

  Match users by Firebase Authentication UID (recommended), or by email.
*/
window.KOVELI_USERS = [
  {
    uid: "PASTE_FIREBASE_UID_HERE",
    email: "admin@example.com",
    name: "System Administrator",
    role: "admin",
    active: true
  }
];

window.getKoveliApprovedUser = function(firebaseUser) {
  if (!firebaseUser) return null;
  const email = String(firebaseUser.email || "").trim().toLowerCase();
  return (window.KOVELI_USERS || []).find(u => {
    const uidMatch = u.uid && u.uid !== "PASTE_FIREBASE_UID_HERE" && u.uid === firebaseUser.uid;
    const emailMatch = u.email && String(u.email).trim().toLowerCase() === email;
    return u.active !== false && (uidMatch || emailMatch);
  }) || null;
};
