// Service worker - no caching, always fetch from network

// Install - skip waiting immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Activate - clear all caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch - always go to network, no caching
// Skip cross-origin requests to avoid mixed-content issues
self.addEventListener('fetch', (event) => {
  if (new URL(event.request.url).origin !== self.location.origin) {
    return;
  }
  event.respondWith(fetch(event.request));
});
