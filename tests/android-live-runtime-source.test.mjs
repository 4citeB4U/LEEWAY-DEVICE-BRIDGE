import fs from "node:fs";
import assert from "node:assert/strict";

const base="apps/android/app/src/main";
const server=fs.readFileSync(base+"/java/industries/leeway/devicebridge/LocalBridgeServer.kt","utf8");
const secret=fs.readFileSync(base+"/java/industries/leeway/devicebridge/BridgeSecret.kt","utf8");
const selfTest=fs.readFileSync(base+"/java/industries/leeway/devicebridge/BridgeSelfTest.kt","utf8");
const activity=fs.readFileSync(base+"/java/industries/leeway/devicebridge/MainActivity.kt","utf8");
const manifest=fs.readFileSync(base+"/AndroidManifest.xml","utf8");
const gradle=fs.readFileSync("apps/android/app/build.gradle.kts","utf8");

assert.match(server,/127\.0\.0\.1/);
assert.doesNotMatch(server,/0\.0\.0\.0/);
assert.match(server,/Authorization:/);
assert.match(server,/AGENT_ACCESS_DISABLED/);
assert.match(server,/UNAUTHORIZED/);
assert.match(server,/\/passport/);
assert.match(server,/\/capabilities/);
assert.match(server,/\/receipts/);
assert.match(server,/ReceiptStore\.record/);

assert.match(secret,/SecureRandom/);
assert.match(secret,/ByteArray\(32\)/);
assert.match(selfTest,/ownerTokenAcceptedInternally/);
assert.match(selfTest,/secretExported/);
assert.match(selfTest,/FormulaF8Gate\.evaluate/);
assert.match(activity,/RUN BRIDGE SELF-TEST/);
assert.match(activity,/STOP AGENT ACCESS/);
assert.match(activity,/SHOW PAIRING TOKEN/);
assert.match(activity,/LocalBridgeServer\.start/);
assert.match(manifest,/android\.permission\.INTERNET/);
assert.match(gradle,/versionName = "0\.4\.0"/);

console.log("PASS android live runtime source contract");
