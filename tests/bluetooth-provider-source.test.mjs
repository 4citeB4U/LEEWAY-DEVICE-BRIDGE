import fs from "node:fs";
import assert from "node:assert/strict";

const src=fs.readFileSync(
  "apps/android/app/src/main/java/industries/leeway/devicebridge/BluetoothProvider.kt",
  "utf8"
);
const manifest=fs.readFileSync("apps/android/app/src/main/AndroidManifest.xml","utf8");

assert.match(src,/device\.bluetooth\.list-bonded/);
assert.match(src,/BLUETOOTH_SCAN/);
assert.match(src,/BLUETOOTH_CONNECT/);
assert.match(src,/bondedDevices/);
assert.match(src,/PHONE_LOCAL_ANDROID_BLUETOOTH/);
assert.match(src,/supported/);
assert.match(src,/authorized/);
assert.match(src,/verified/);
assert.match(manifest,/android\.permission\.BLUETOOTH_SCAN/);
assert.match(manifest,/android\.permission\.BLUETOOTH_CONNECT/);

console.log("PASS Bluetooth provider source contract");
