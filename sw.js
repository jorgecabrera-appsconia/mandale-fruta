const CACHE_NAME = 'mandalefruta-v1';
const ASSETS = ['/', '/index.html', '/icon.jpg', '/manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  if (url.hostname.includes('supabase') || url.pathname.includes('/rest/')) {
    e.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  e.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
