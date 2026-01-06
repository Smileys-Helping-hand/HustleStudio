/* global workbox */
const CACHE_VERSION = 'v4.2';
const APP_CACHE = `hustle-app-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Install event - cache offline page
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => {
      return cache.addAll([
        OFFLINE_URL,
        '/',
        '/manifest.webmanifest',
      ]).catch((error) => {
        console.warn('[ServiceWorker] Failed to cache during install:', error);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('hustle-') && name !== APP_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

const ASSET_CDN_BASE = 'https://cdn.hustlestudio.co.za/assets';
const ASSET_CDN_ORIGIN = new URL(ASSET_CDN_BASE).origin;

if (workbox) {
  workbox.setConfig({ debug: false });

  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

  // Shell - Network first with offline fallback
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    async ({ event }) => {
      try {
        return await fetch(event.request);
      } catch (error) {
        const cache = await caches.open(APP_CACHE);
        const cachedResponse = await cache.match(OFFLINE_URL);
        return cachedResponse || new Response('Offline');
      }
    }
  );

  // App resources - Network first
  workbox.routing.registerRoute(
    ({ request }) => ['document', 'script', 'style'].includes(request.destination),
    new workbox.strategies.NetworkFirst({
      cacheName: 'hustle-shell',
      plugins: [
        new workbox.expiration.ExpirationPlugin({ 
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );

  // CDN Assets - Stale while revalidate
  workbox.routing.registerRoute(
    ({ url }) => url.origin === ASSET_CDN_ORIGIN && url.pathname.startsWith('/assets/'),
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'hustle-assets',
      plugins: [
        new workbox.expiration.ExpirationPlugin({ 
          maxEntries: 100, 
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        }),
      ],
    })
  );

  // Media - Cache first
  workbox.routing.registerRoute(
    ({ url }) =>
      url.origin === ASSET_CDN_ORIGIN && 
      (url.pathname.endsWith('.mp3') || url.pathname.endsWith('.mp4') || url.pathname.endsWith('.webm')),
    new workbox.strategies.CacheFirst({
      cacheName: 'hustle-media',
      plugins: [
        new workbox.expiration.ExpirationPlugin({ 
          maxEntries: 10, 
          maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );

  // Images - Cache first
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'hustle-images',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        }),
      ],
    })
  );

  // Fonts - Cache first
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'font',
    new workbox.strategies.CacheFirst({
      cacheName: 'hustle-fonts',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 30,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );
} else {
  console.warn('[ServiceWorker] Workbox failed to load.');
}
