/**
 * Offline-first service worker.
 *
 * Everything is precached at install, so after the first load the app never
 * needs the network. The asset list and cache version are injected at build time.
 *
 * iOS note: Safari evicts script-created storage after 7 days without user
 * interaction, but installing to the home screen exempts the app. The app also
 * calls navigator.storage.persist() on boot. Backup codes remain the real
 * safety net — IndexedDB on iOS has a history of loss around OS updates.
 */
const VERSION = '__VERSION__';
const CACHE = 'mng-' + VERSION;
const ASSETS = __ASSETS__;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;
  e.respondWith(
    caches.match(request, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(request)
        .then(res => {
          if (res && res.ok && new URL(request.url).origin === location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(request, copy));
          }
          return res;
        })
        .catch(() => request.mode === 'navigate' ? caches.match('./index.html') : undefined);
    })
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
