/* 321 夫妻成長營 — 英文版
   部署網址：https://spch321-sudo.github.io/321couples-en/
   Service Worker v27：HTML 改為「網路優先」，改版後家人一開就是新版，不會再卡舊畫面。
   快取名稱加上語言代碼（en），避免三個語言版本（繁/簡/英）共用同一個 github.io
   網域時，彼此的快取清除動作互相影響。
   只快取成功的回應，避免偶發的失敗回應被誤存進快取。
   ※ 每次改版只要把下面的版本號 +1（v27 → v28），並上傳這個檔案即可。 */
const CACHE = 'couples321-en-v27';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png', './icon-512-maskable.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k.indexOf('couples321-en-') === 0 && k !== CACHE).map(k => caches.delete(k)))
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

/* 只快取「真的成功」的回應，避免把偶發的錯誤頁面存進快取 */
function cachePut(req, res) {
  if (res && res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
  }
  return res;
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
      fetch(req).then(res => cachePut(req, res))
        .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  /* 圖示等靜態檔：先給快取（快），同時背景更新（新） */
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => cachePut(req, res)).catch(() => hit);
      return hit || net;
    })
  );
});
