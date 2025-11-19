/* global workbox */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

const ASSET_CDN_BASE = 'https://cdn.hustlestudio.co.za/assets';
const ASSET_CDN_ORIGIN = new URL(ASSET_CDN_BASE).origin;

if (workbox) {
  workbox.setConfig({ debug: false });

  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

  workbox.routing.registerRoute(
    ({ request }) => ['document', 'script', 'style'].includes(request.destination),
    new workbox.strategies.NetworkFirst({
      cacheName: 'hustle-shell',
      plugins: [
        new workbox.expiration.ExpirationPlugin({ maxEntries: 50 }),
      ],
    })
  );

  workbox.routing.registerRoute(
    ({ url }) => url.origin === ASSET_CDN_ORIGIN && url.pathname.startsWith('/assets/'),
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'hustle-assets',
      plugins: [
        new workbox.expiration.ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      ],
    })
  );

  workbox.routing.registerRoute(
    ({ url }) =>
      url.origin === ASSET_CDN_ORIGIN && (url.pathname.endsWith('.mp3') || url.pathname.endsWith('.mp4')),
    new workbox.strategies.CacheFirst({
      cacheName: 'hustle-media',
      plugins: [
        new workbox.expiration.ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 7 }),
      ],
    })
  );
} else {
  console.warn('[ServiceWorker] Workbox failed to load.');
}
