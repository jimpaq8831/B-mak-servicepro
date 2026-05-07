// ServicePro — cache buster
// This SW deletes all caches and unregisters itself
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => {
      console.log('Deleting cache:', k);
      return caches.delete(k);
    }))).then(() => self.clients.claim())
  );
});
// No caching — all requests go straight to network
self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request).catch(() => new Response('Offline', {status: 503})));
});
