/* 321 夫妻成長營 — English
   部署網址：https://spch321-sudo.github.io/321couples-en/
   Service Worker（自動更新版，依 321 App 規格）
   ‧ VER 每次發佈都不同 → 瀏覽器發現 sw.js 改變就安裝新 SW
   ‧ install：skipWaiting；預載用 cache:'reload' 繞過 GitHub Pages 約 10 分鐘的 HTTP 快取
   ‧ activate：只刪這個 App 自己的舊快取（同網域還有其他 321 App）、clients.claim，
     通知所有頁面有新版；背景中的舊頁面直接重新導向到新版（連沒有更新程式的舊版頁面也會換新）
   ‧ fetch：網頁、JS、JSON 網路優先（no-cache），離線才用快取；圖示快取優先；
     version.json 永不快取；影音與 Range 請求不攔截
   ※ 每次改版：index.html 的 APPVER、這裡的 VER、version.json 三處要一致。 */
var VER = 'v32.202610180455';
var PFX = 'couples321-en-';
var CACHE = PFX + VER;
var SHELL = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png', './icon-512-maskable.png'];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(SHELL.map(function (u) {
      return fetch(new Request(u, { cache: 'reload' })).then(function (r) { if (r && r.ok) return c.put(u, r); })['catch'](function () {});
    }));
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf(PFX) === 0 && k !== CACHE; }).map(function (k) { return caches['delete'](k); }));
  }).then(function () { return self.clients.claim(); }).then(function () {
    return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  }).then(function (cs) {
    cs.forEach(function (c) {
      try { c.postMessage({ t: 'sw-updated', v: VER }); } catch (x) {}
      if (c.visibilityState === 'hidden' && c.navigate) { try { c.navigate(c.url); } catch (x) {} }
    });
  }));
});

self.addEventListener('message', function (e) { if (e.data === 'skip' || e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', function (e) {
  var r = e.request; if (r.method !== 'GET') return;
  var u; try { u = new URL(r.url); } catch (x) { return; }
  if (u.origin !== self.location.origin) return;
  var p = u.pathname;
  if (/\.(mp3|m4a|aac|wav|ogg|opus|mp4|mov|webm)$/i.test(p) || r.headers.get('range')) return;
  if (/version\.json$/.test(p)) {
    e.respondWith(fetch(p + '?t=' + Date.now(), { cache: 'no-store' })['catch'](function () { return new Response('{}', { headers: { 'Content-Type': 'application/json' } }); }));
    return;
  }
  var nav = r.mode === 'navigate' || /\.html$/.test(p) || /\/$/.test(p);
  var key = nav ? './index.html' : (/\.(json|js|webmanifest|css)$/.test(p) ? u.origin + p : r);
  if (nav || /\.(json|js|css|webmanifest)$/.test(p)) {
    e.respondWith(fetch(nav ? u.origin + p + u.search : r.url, { cache: 'no-cache', credentials: 'same-origin' }).then(function (resp) {
      if (resp && resp.ok) { var cp = resp.clone(); caches.open(CACHE).then(function (c) { c.put(key, cp); }); }
      return resp;
    })['catch'](function () {
      return caches.match(key).then(function (h) { return h || caches.match(r, { ignoreSearch: true }).then(function (h2) { return h2 || caches.match('./index.html'); }); });
    }));
    return;
  }
  e.respondWith(caches.match(r, { ignoreSearch: true }).then(function (h) {
    return h || fetch(r).then(function (resp) { if (resp && resp.ok) { var cp = resp.clone(); caches.open(CACHE).then(function (c) { c.put(r, cp); }); } return resp; });
  }));
});
