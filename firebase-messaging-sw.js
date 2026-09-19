importScripts(
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js"
);

importScripts("/script/firebase-config.js");

const messaging = firebase.messaging();

/*
 * ============================================================
 * KOVELI LOUNGE - FIREBASE BACKGROUND PUSH NOTIFICATIONS
 * ============================================================
 */

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Background notification:",
    payload
  );

  const data = payload.data || {};
  const notification = payload.notification || {};

  const title =
    data.title ||
    notification.title ||
    "Koveli Lounge";

  const body =
    data.body ||
    notification.body ||
    "";

  const notificationId =
    data.notificationId ||
    `koveli-${Date.now()}`;

  const targetUrl =
    data.url ||
    "/notifications.html";

  const options = {
    body: body,

    // Main Koveli Lounge notification logo
    icon: "/koveli-logo.png",

    // Small notification/status icon where supported
    badge: "/koveli-logo.png",

    tag: notificationId,

    // Allow a newer message with the same tag to alert again
    renotify: true,

    // Android notification vibration
    vibrate: [200, 100, 200],

    // Keep useful information for notification click
    data: {
      url: targetUrl,
      notificationId: notificationId
    }
  };

  return self.registration.showNotification(
    title,
    options
  );
});


/*
 * ============================================================
 * NOTIFICATION CLICK
 * ============================================================
 */

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notificationData =
    event.notification.data || {};

  const targetUrl =
    notificationData.url ||
    "/notifications.html";

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true
      })
      .then((clientList) => {

        // If Koveli is already open, use the existing window.
        for (const client of clientList) {
          if ("focus" in client) {
            if ("navigate" in client) {
              return client
                .navigate(targetUrl)
                .then(() => client.focus());
            }

            return client.focus();
          }
        }

        // Otherwise open the installed PWA/page.
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }

        return null;
      })
  );
});
