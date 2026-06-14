/* 321 Couples Growth Camp — Service Worker (network-first, auto-update)
   How it works: HTML is always fetched network-first, so it loads the latest
   version whenever online, and falls back to cache only when offline.
   On each big release, bump the CACHE version string below (e.g. date + serial). */

const CACHE = '321couples-en-2026-06-15-1';
const CORE = [
  './', './index.html', './manifest.webmanifest',
  './icon-180.png', './icon-192.png', './icon-512.png', './icon-512-maskable.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();                       // make the new version ready immediately
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE).catch(() => {}))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))); // clear old caches
    await self.clients.claim();             // take control of all tabs right away
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const isHTML =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    // HTML: network-first -> get the latest; use cache only when offline
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Other assets (icons, manifest…): cache-first, update in the background
  e.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || net;
    })
  );
});
