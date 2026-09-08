// ponytail: network-first so updates land immediately; cache is the offline fallback.
const CACHE = 'gspot-v1';
const FILES = ['./', './index.html', './app.js', './handicap.js', './courses.js', './manifest.json', './icon.svg'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(fetch(e.request).then(r => { caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r; })
    .catch(() => caches.match(e.request)));
});
