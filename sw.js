const VERSION = "koveli-shell-v14";
const CORE = [
  "/index.html","/dashboard.html","/leave.html","/dutychange.html",
  "/security.html","/notifications.html","/css/app.css",
  "/script/app.js","/script/user.js","/script/firebase-config.js",
  "/script/pwa-config.js","/koveli-logo.png","/manifest.webmanifest"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(CORE).catch(()=>{})));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

/*
  NETWORK FIRST:
  New Vercel deployments are preferred whenever online.
  Cache is only a fallback if the network is unavailable.
  Firebase/Firestore/API requests are NEVER cached here.
*/
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(req, {cache:"no-store"})
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(VERSION).then(cache => cache.put(req, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === "navigate") return caches.match("/index.html");
        throw new Error("Offline and resource not cached");
      })
  );
});
