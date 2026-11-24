const CACHE = "leeway-device-bridge-v20-secure-onboarding-no-debug";
const ASSETS = [
  "./",
  "./index.html",
  "./refresh.html",
  "./styles.css",
  "./dashboard.css",
  "./dashboard-ui.js",
  "./device-onboarding-policy.mjs",
  "./device-onboarding.js",
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
  "./APPLE-SIDESTORE-0.7.0-REPAIR.md",
  "./APPLE-DIRECT-ILOADER-DELIVERY.md",
  "./ILOADER-PERSISTENCE.md",
  "./SIDESTORE-UPDATE-CHANNEL.md",
  "./PACKAGE-UPDATE-PROTOCOL.md"
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
  const url = new URL(event.request.url);
  // Previously cached developer APKs are not legitimate customer installers.
  // Fail closed for scope-controlled pages, even if an old link remains cached.
  if (url.origin === self.location.origin &&
      /\/leeway-device-bridge-android-latest-debug\.apk$/i.test(url.pathname)) {
    event.respondWith(new Response("Developer debug package is not an approved LeeWay device release.", {
      status: 410, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then(response => {
        // Only cache safe UI and documentation. Never APK/IPA binaries or
        // unverified customer packages; the native signed updater owns those.
        if (response.ok && !/\.(?:apk|ipa|exe|msix|dmg|pkg|deb|rpm)$/i.test(url.pathname)) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
