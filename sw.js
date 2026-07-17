/* 321 夫妻成長營 — Service Worker
   v25：HTML 改為「網路優先」，改版後家人一開就是新版，不會再卡舊畫面。
   ※ 每次改版只要把下面的版本號 +1（v25 → v26），並上傳這個檔案即可。 */
const CACHE = 'couples-321-v25';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png', './icon-512-maskable.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

function isHTML(req) {
  return req.mode === 'navigate' ||
         (req.headers.get('accept') || '').indexOf('text/html') > -1;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  /* 外部連結（Zoom、晨讀321…）一律交給瀏覽器，不攔截 */
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  /* 網頁本身：網路優先 → 拿得到新版就用新版，離線才回快取 */
  if (isHTML(req)) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  /* 圖示等靜態檔：先給快取（快），同時背景更新（新） */
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
