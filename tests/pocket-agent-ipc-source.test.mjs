import fs from "node:fs";
import assert from "node:assert/strict";

const base="apps/android/app/src/main";
const grant=fs.readFileSync(base+"/java/industries/leeway/devicebridge/PocketGrantStore.kt","utf8");
const bridge=fs.readFileSync(base+"/java/industries/leeway/devicebridge/PocketBridgeActivity.kt","utf8");
const main=fs.readFileSync(base+"/java/industries/leeway/devicebridge/MainActivity.kt","utf8");
const manifest=fs.readFileSync(base+"/AndroidManifest.xml","utf8");

assert.match(grant,/pocket_agent_local_secret/);
assert.doesNotMatch(grant,/bridge_pairing_secret/);
assert.match(bridge,/industries\.leeway\.pocket/);
assert.match(bridge,/PocketGrantStore\.matches/);
assert.match(bridge,/RemoteCommandRouter\.execute/);
assert.match(bridge,/CAPABILITY_NOT_POCKET_QUALIFIED/);
assert.match(bridge,/"agent\.chat"/);
assert.match(main,/"POCKET_BOOTSTRAP"/);
assert.match(main,/Owner approved scoped Pocket Agent local bridge access/);
assert.match(main,/callingPackage/);
assert.match(manifest,/PocketBridgeActivity/);
assert.match(manifest,/Theme\.LeewayDeviceBridge\.Pocket/);

console.log("PASS scoped Pocket Agent IPC source contract");
