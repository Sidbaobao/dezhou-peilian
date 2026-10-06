/* 德州陪练 · 离线缓存。下面的版本号由 build.js 写入构建时间，每次发布自动刷新缓存。 */
const VERSION = '20261006191354';
const CACHE = 'dezhou-peilian-' + VERSION;
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './src/tokens.css', './src/styles.css',
  './src/engine.js', './src/coach.js', './src/ai.js', './src/narrate.js', './src/app.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // 字体等外部资源走网络
  event.respondWith(
    caches.match(req).then(cached => {
      const fetched = fetch(req).then(res => {
        if (res && res.ok) caches.open(CACHE).then(cache => cache.put(req, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
