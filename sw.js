const CACHE_NAME = 'sachindhisle-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/portfolio.html',
  '/video.html',
  '/about.html',
  '/services.html',
  '/contact.html',
  '/admin.html',
  '/css/main.css',
  '/css/components.css',
  '/css/portfolio.css',
  '/css/responsive.css',
  '/js/config.js',
  '/js/api.js',
  '/js/main.js',
  '/js/portfolio.js',
  '/js/video-player.js',
  '/js/contact.js',
  '/js/admin.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return caches.match('/index.html');
      });
    })
  );
});
