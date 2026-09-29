/* 7 Days To Die Server Manager — installable shell cache */
const CACHE = "sevendtd-shell-v1";
const SHELL = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/favicon.svg",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Always hit the live API / streams — never serve stale manager state offline as truth.
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok && (url.pathname === "/" || SHELL.includes(url.pathname))) {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === "navigate") {
          const fallback = await caches.match("/index.html");
          if (fallback) return fallback;
        }
        throw new Error("offline");
      })
  );
});
