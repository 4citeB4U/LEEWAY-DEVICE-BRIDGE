/* LeeWay browser-only app shell. Never cache identity, runtime, device, receipt or customer API responses. */
const PREFIX = '/LEEWAY-DEVICE-BRIDGE/';
const CACHE = 'leeway-device-bridge-public-shell-v1';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([
    PREFIX, PREFIX + 'manifest.webmanifest',
    PREFIX + 'icons/leeway-official-logo-192.png',
    PREFIX + 'icons/leeway-official-logo-512.png'
  ])));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('leeway-device-bridge-public-shell-') && key !== CACHE)
      .map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || req.mode === 'navigate') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(PREFIX)) return;
  if (/\/(?:api|mcp|auth|session|onboarding|device|receipts|registry)(?:\/|$)/i.test(url.pathname)) return;
  if (!(/\/(?:assets|icons)\/[^/]+\.(?:js|css|png|jpg|jpeg|svg|webp)$/.test(url.pathname) ||
        url.pathname === PREFIX + 'manifest.webmanifest')) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const match = await cache.match(req);
    if (match) return match;
    const response = await fetch(req);
    if (response.ok && response.type === 'basic') await cache.put(req, response.clone());
    return response;
  }));
});
