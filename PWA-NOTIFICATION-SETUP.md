# Koveli PWA + Push Notification Setup

1. Firebase web config
   Keep your normal Firebase web config in `script/firebase-config.js`.
   It must include `messagingSenderId`.

2. Enable Firebase Cloud Messaging
   Firebase Console -> Project settings -> Cloud Messaging.
   Under Web Push certificates, generate a key pair.
   Copy the PUBLIC key into `script/pwa-config.js` as `vapidKey`.
   The VAPID public key is safe in GitHub.

3. Vercel environment variables
   Add:
   - FIREBASE_SERVICE_ACCOUNT_JSON = complete Firebase service-account JSON
     OR FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
   - PUSH_ADMIN_KEY = a long private password only administrators know
   Keep all private keys/passwords in Vercel, never GitHub.

4. Install dependencies / deploy
   Push the complete project to GitHub and redeploy on Vercel.
   Vercel will install `firebase-admin` and `nodemailer`.

5. Firestore
   The included rules example adds pushTokens, notificationUsers and notifications.
   Merge/deploy the rules appropriate to your project.

6. Staff phone setup
   Open the HTTPS Vercel site, sign in, open Notifications, press
   "Enable Phone Notifications", allow notifications, then install/add the PWA.
   Each phone/browser gets its own FCM token.

7. Admin messaging
   Admin -> Staff Messaging.
   Choose All Staff / Role / Individual Staff, enter the message and the same
   PUSH_ADMIN_KEY stored in Vercel, then Send Notification.

Notes:
- Background push works only after the user grants notification permission.
- Android launchers commonly show a notification dot while a notification is active.
- The app also maintains its own red unread counter and uses the Badging API where supported.
- iPhone/iPad web push requires the PWA to be added to the Home Screen on supported iOS.
- The current portal authenticates from public `user.js`; this is not secure server-side authentication.
  For a production staff system, migrate login to Firebase Authentication before relying on role security.


## Live PWA updates
- `sw.js` now uses network-first loading for the Koveli app shell.
- Firebase/Firestore and `/api/` traffic is not cached by the service worker.
- The app checks for a new service worker after opening, whenever it returns to the foreground,
  when the window regains focus, and every 5 minutes while open.
- If a deployment is available, users see **New Update Available -> Update Now**.
- Update Now activates the waiting service worker, removes old shell caches, and reloads the app.
- If the user is offline, the last cached app shell remains available.
