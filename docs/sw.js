const CACHE = "leeway-device-bridge-v20-account-first-release-hold";
const ASSETS = [
  "./",
  "./index.html",
  "./refresh.html",
  "./styles.css",
  "./dashboard.css",
  "./dashboard-ui.js",
  "./onboarding.js",
  "./onboarding.css",
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
  // Never cache or serve a stale public native installer. A GitHub Pages
  // PWA cannot qualify a signed Android package, even if a historical asset
  // remains on the same static host.
  if (/\.(apk|ipa|crx|xpi)$/i.test(url.pathname)) return;
  // The account-first front door and package authority are always fetched
  // from the network, never replaced by older cached Workstation/Debug UI.
  const critical = url.origin === self.location.origin &&
    (/\/(?:index\.html)?$/.test(url.pathname) ||
      /\/(?:package-manifest\.json|leeway-device-bridge-android-latest\.json)$/.test(url.pathname));
  if(critical){
    event.respondWith(fetch(event.request,{cache:"no-store"}));
    return;
  }
  event.respondWith(
    fetch(event.request).then(response=>{
      if(response.ok && url.origin === self.location.origin){
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});
      }
      return response;
    }).catch(()=>caches.match(event.request))
  );
});
