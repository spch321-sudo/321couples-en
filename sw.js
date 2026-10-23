/* 本版已併入主 App（繁／简／EN 同一個網址），這個舊的 Service Worker 清掉自己的快取後退場 */
self.addEventListener('install',function(e){self.skipWaiting();});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k.indexOf('couples321-en-')===0;}).map(function(k){return caches.delete(k);}));}).then(function(){return self.registration.unregister();}).then(function(){return self.clients.matchAll({type:'window'});}).then(function(cs){cs.forEach(function(c){try{c.navigate(c.url);}catch(e){}});}));});
