// B-Mak ServicePro - No caching SW
// This SW unregisters itself to prevent caching issues
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
// Pass all requests directly to network - no caching
self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request));
});
