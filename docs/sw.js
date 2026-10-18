const CACHE = "leeway-device-bridge-v13";
const ASSETS = [
  "./",
  "./index.html",
  "./refresh.html",
  "./styles.css",
  "./apple-pwa.css",
  "./app.js",
  "./apple-pwa-diagnostics.js",
  "./icons/leeway-official-logo-512.png",
  "./icons/leeway-official-logo-192.png",
  "./brand/leeway-official-logo.png",
  "./manifest.webmanifest",
  "./device-discovery.js",
  "./llm-entrypoint.json",
  "./package-manifest.json",
  "./provider-registry.json",
  "./UNIVERSAL-DEVICE-HARNESS.md",
  "./PHONE-RUNTIME-CONTRACT.md",
  "./secondary-workstation-node.json",
  "./APPLE-PWA-DEVICE-BRIDGE.md",
  "./APPLE-PWA-WORKSTATION.md",
  "./APPLE-NATIVE-DELIVERY-PROTOCOL.md",
  "./APPLE-NATIVE-SIDELOAD-DELIVERY.md",
  "./APPLE-SIDESTORE-PREFLIGHT.md",
  "./SIDESTORE-UPDATE-CHANNEL.md"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
