import fs from "node:fs";
import assert from "node:assert/strict";

const src=fs.readFileSync(
  "apps/android/app/src/main/java/industries/leeway/devicebridge/NetworkDiscoveryProvider.kt",
  "utf8"
);
const manifest=fs.readFileSync("apps/android/app/src/main/AndroidManifest.xml","utf8");
const main=fs.readFileSync(
  "apps/android/app/src/main/java/industries/leeway/devicebridge/MainActivity.kt",
  "utf8"
);

assert.match(src,/device\.network\.discover/);
assert.match(src,/239\.255\.255\.250/);
assert.match(src,/M-SEARCH/);
assert.match(src,/_home-assistant\._tcp\./);
assert.match(src,/_googlecast\._tcp\./);
assert.match(src,/PHONE_LOCAL_ANDROID_NETWORK_DISCOVERY/);
assert.match(src,/actuationAvailable", false/);
assert.match(manifest,/CHANGE_WIFI_MULTICAST_STATE/);
assert.match(manifest,/ACCESS_WIFI_STATE/);
assert.match(main,/DISCOVER LAN PROVIDERS/);

console.log("PASS network discovery provider source contract");
