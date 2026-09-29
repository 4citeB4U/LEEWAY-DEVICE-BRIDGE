import fs from "node:fs";
import assert from "node:assert/strict";

const server=fs.readFileSync("apps/android/app/src/main/java/industries/leeway/devicebridge/LocalBridgeServer.kt","utf8");
const activity=fs.readFileSync("apps/android/app/src/main/java/industries/leeway/devicebridge/MainActivity.kt","utf8");
const script=fs.readFileSync("clients/remote-controller/termux-one-pull.sh","utf8");
const gradle=fs.readFileSync("apps/android/app/build.gradle.kts","utf8");

assert.match(server,/armOwnerBootstrap/);
assert.match(server,/ownerBootstrapNonce/);
assert.match(server,/120_000L/);
assert.match(server,/\/owner-bootstrap/);
assert.match(server,/BOOTSTRAP_NONCE_MISMATCH/);
assert.match(server,/OWNER_LOCAL_LOOPBACK_BOOTSTRAP/);
assert.match(activity,/TERMUX_BOOTSTRAP/);
assert.match(activity,/leeway_nonce/);
assert.match(activity,/RemoteRelayService\.stop/);
assert.match(activity,/RemoteRelayService\.start/);
assert.match(script,/TERMUX_BOOTSTRAP/);
assert.match(script,/owner-bootstrap\?nonce=/);
assert.doesNotMatch(script,/Pairing token:/);
assert.match(gradle,/versionName = "0\.8\.4"/);
assert.match(gradle,/versionCode = 11/);

console.log("PASS Termux one-time owner bootstrap contract");