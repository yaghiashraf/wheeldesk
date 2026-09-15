// WheelDesk Pro service worker.
//
// Market data must never be served stale — a cached chain is a wrong price, and
// a wrong price is a wrong trade. So /api/* is always network, never cached and
// never fallen back to. Everything else is shell: hashed build assets are
// immutable and cache-first, navigations are network-first with a cached shell
// so an installed desk still opens on a dead connection instead of going blank.

// Icons are cache-first, so a new icon only reaches installed desks when the
// cache name changes. v6: circular icons.
const SHELL_CACHE = "wheeldeskpro-shell-v6";
const SHELL_URLS = [
  "/",
  "/cash-secured-puts",
  "/covered-calls",
  "/offline",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/wheeldeskpro-mark.svg",
];

// Never cache against a dev server. The cache-first rule below is only sound
// for content-hashed build output; dev chunks reuse their filenames across
// rebuilds, so caching them serves last build's JavaScript forever and no
// amount of reloading dislodges it.
const IS_DEV_HOST =
  self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1";

self.addEventListener("install", (event) => {
  if (IS_DEV_HOST) {
    event.waitUntil(self.skipWaiting());
    return;
  }
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // A missing shell route must not abort the whole install.
      .then((cache) => Promise.allSettled(SHELL_URLS.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon-") ||
    url.pathname === "/wheeldeskpro-mark.svg"
  );
}

self.addEventListener("fetch", (event) => {
  if (IS_DEV_HOST) return;

  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Live market data: straight to the network, no cache, no fallback.
  if (url.pathname.startsWith("/api/")) return;

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () =>
          (await caches.match(request)) ??
          (await caches.match("/offline")) ??
          (await caches.match("/")) ??
          Response.error(),
        ),
    );
  }
});
