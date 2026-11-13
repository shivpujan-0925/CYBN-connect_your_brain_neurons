/**
 * CYBN Service Worker — Progressive Web App offline shell & cache engine
 */

const CACHE_NAME = 'cybn-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './dashboard.html',
  './problems.html',
  './problem.html',
  './add-problem.html',
  './stats.html',
  './login.html',
  './signup.html',
  './forgot-password.html',
  './reset-password.html',
  './css/output.css',
  './js/config.js',
  './js/theme.js',
  './js/api.js',
  './js/palette.js',
  './js/dashboard.js',
  './js/pwa.js',
  './manifest.json',
  './assets/cybn-icon.svg',
  './assets/cybn-minimal.svg',
  './assets/cybn-logo-full.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-192.png',
  './assets/icon-maskable-512.png',
];

// Install: precache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Precache non-critical warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key.startsWith('cybn-') && key !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Stale-While-Revalidate for app assets, Network-Only/Network-First for API
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip non-GET requests
  if (req.method !== 'GET') return;

  // API requests: Network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req).catch(() => {
        return new Response(
          JSON.stringify({ ok: false, message: 'You are currently offline. Please reconnect to sync with CYBN.' }),
          { headers: { 'Content-Type': 'application/json' }, status: 503 }
        );
      })
    );
    return;
  }

  // App shell and static assets: Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

