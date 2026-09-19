# Koveli Staff App

## Pages
- `index.html` login
- `register.html` registration
- `dashboard.html`
- `leave.html`
- `dutychange.html`
- `security.html`
- `admin.html`

## 1. Firebase
Replace `script/firebase-config.js` with your existing Firebase config. It must initialize Firebase.
Create Firestore collections automatically by using the app.

## 2. Initial admin
Edit `script/user.js` and replace the sample admin password.

## 3. Email configuration

### Keep ONLY secrets in Vercel Environment Variables
- `SMTP_USER`
- `SMTP_PASS`

### Recommended: keep SMTP server and recipient addresses in Vercel too
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `MAIL_FROM`
- `LEAVE_ATTACHMENT_TO`
- `LEAVE_TEXT_TO`

This is safer than publishing staff email addresses in GitHub. The server API reads all of these directly from Vercel.

## Vercel environment variables
In Vercel > Project > Settings > Environment Variables add:

- `SMTP_HOST`
- `SMTP_PORT` (normally `587`)
- `SMTP_SECURE` (`false` for port 587, normally `true` for 465)
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`
- `LEAVE_ATTACHMENT_TO` = comma-separated addresses that receive the leave text AND attachment
- `LEAVE_TEXT_TO` = comma-separated addresses that receive the same leave text WITHOUT attachment

Never put SMTP password in HTML/JS browser files.

## 4. Admin registration workflow
1. Staff submits registration -> Firestore `registrations`.
2. Admin opens `admin.html`, reviews it and chooses role.
3. Admin clicks Approve.
4. Click `Generate Updated user.js`.
5. Replace GitHub `script/user.js` with the downloaded file and commit/deploy.

Password change follows the same workflow: Firestore -> Admin approve -> Generate user.js -> replace in GitHub.

## 5. Leave email behavior
Leave is saved to Firestore first.
The browser then calls `/api/send-leave-email`.
Attachment recipients get the same text plus the optional attachment.
Text-only recipients get the same text but never the attachment.

The attachment is sent to the Vercel API as part of the request and is not stored in Firebase Storage.

## Security note
This project implements the exact requested `user.js` username/password login model. Because `user.js` is publicly downloadable from a deployed website, its passwords can be viewed by anyone who knows how to inspect site files. For real production authentication, migrate login to Firebase Authentication and keep only profile/role data in Firestore.
