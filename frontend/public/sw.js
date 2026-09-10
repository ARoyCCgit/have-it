// Have-it Service Worker — Progressive Web App (PWA)
const CACHE_NAME = 'haveit-pwa-v1';

// Static assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/chat',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-caching some assets failed:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip API calls, web sockets, Cloudinary media and OAuth endpoints from caching
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/socket.io') ||
    url.hostname.includes('cloudinary') ||
    url.hostname.includes('onrender.com') ||
    url.hostname.includes('google')
  ) {
    return;
  }

  // Network-first strategy with cache fallback for HTML navigation
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/chat') || caches.match('/');
      })
    );
    return;
  }

  // Cache-first for images, fonts, and static assets
  if (
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?|css|js)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return networkResponse;
        });
      })
    );
  }
});
