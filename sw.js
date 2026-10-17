/* 321 Morning Devotion — Service Worker
   - Precaches the app shell for offline use
   - On update, notifies open pages with {type:"update-available"} so the
     in-app "A new version is ready" pill appears (page reloads to apply)
   - Bump CACHE on every deploy to ship a new version */
var CACHE = "devotion-en-v40-gx10170825";

var ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./favicon-32.png",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil((async function () {
    var keys = await caches.keys();
    // Was an older version of THIS app already cached? (=> this is an update)
    var hadOld = keys.some(function (k) {
      return k !== CACHE && k.indexOf("devotion-en-") === 0;
    });
    await Promise.all(
      keys.filter(function (k) { return k !== CACHE; })
          .map(function (k) { return caches.delete(k); })
    );
    await self.clients.claim();
    if (hadOld) {
      var cls = await self.clients.matchAll({ type: "window" });
      cls.forEach(function (c) {
        c.postMessage({ type: "update-available" });
      });
    }
  })());
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  // Only handle same-origin requests; let cross-origin (CDNs, TTS/AI workers) pass through
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === "basic") {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        // Offline fallback: for navigations, serve the cached app shell
        if (req.mode === "navigate") return caches.match("./index.html");
        return cached;
      });
      return cached || network;
    })
  );
});

// Allow the page to trigger an immediate activation if desired
self.addEventListener("message", function (e) {
  if (e.data && e.data.type === "skip-waiting") self.skipWaiting();
});
