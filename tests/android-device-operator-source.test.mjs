/*
REGION: LeeWay Android Device Operator source qualification
TAG: LEEWAY-DEVICE-OPERATOR-ANDROID-TEST
WHO: Veritas / CI
WHAT: Verify native operator wiring is present and evidence-bounded.
WHEN: Every Android source qualification.
WHERE: Canonical LEEWAY-DEVICE-BRIDGE tests.
WHY: Prevent generated source from being mistaken for an integrated operator.
HOW: Inspect manifest/router/adapter/package broker invariants.
LICENSE: MIT
*/
import fs from "node:fs";
import assert from "node:assert/strict";

const manifest=fs.readFileSync("apps/android/app/src/main/AndroidManifest.xml","utf8");
const service=fs.readFileSync("apps/android/app/src/main/java/industries/leeway/devicebridge/DeviceOperatorAccessibilityService.kt","utf8");
const router=fs.readFileSync("apps/android/app/src/main/java/industries/leeway/devicebridge/RemoteCommandRouter.kt","utf8");
const broker=fs.readFileSync("apps/android/app/src/main/java/industries/leeway/devicebridge/PackageInstallBroker.kt","utf8");
const apps=fs.readFileSync("apps/android/app/src/main/java/industries/leeway/devicebridge/AppOperator.kt","utf8");
const media=fs.readFileSync("apps/android/app/src/main/java/industries/leeway/devicebridge/MediaOperator.kt","utf8");

assert.match(manifest,/DeviceOperatorAccessibilityService/);
assert.match(manifest,/BIND_ACCESSIBILITY_SERVICE/);
assert.match(manifest,/REQUEST_INSTALL_PACKAGES/);
assert.match(manifest,/androidx\.core\.content\.FileProvider/);
assert.match(service,/dispatchGesture/);
assert.match(service,/performGlobalAction/);
assert.match(service,/ACTION_SET_TEXT/);
assert.match(service,/takeScreenshot/);
assert.match(router,/"device\.ui\.snapshot"/);
assert.match(router,/"device\.apps\.list"/);
assert.match(router,/"device\.apps\.launch"/);
assert.match(router,/"device\.media\.scan"/);
assert.match(router,/"device\.media\.delete\.request"/);
assert.match(router,/"device\.apps\.install"/);
assert.match(router,/valueOk/);
assert.match(broker,/SHA256_MISMATCH/);
assert.match(broker,/silentInstall", false/);
assert.match(broker,/device\.apps\.install\.handoff/);
assert.match(apps,/getLaunchIntentForPackage/);
assert.match(apps,/queryIntentActivities/);
assert.match(media,/MediaStore\.createDeleteRequest/);
assert.match(media,/zeroBytes/);
assert.match(media,/deletion not yet verified/);

console.log("PASS Android Device Operator source integration");
