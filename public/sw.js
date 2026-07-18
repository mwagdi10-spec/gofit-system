// Service Worker بسيط — شرط أساسي لقابلية التثبيت (installability) في Chrome/Android
const CACHE_NAME = 'gofit-shell-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  self.clients.claim();
});

// Network-first مع fallback بسيط — بدون caching معقد لتفادي مشاكل تحديث النسخة
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
