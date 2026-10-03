import fs from "node:fs";
import assert from "node:assert/strict";

const activity=fs.readFileSync("apps/android/app/src/main/java/industries/leeway/devicebridge/MainActivity.kt","utf8");
const gradle=fs.readFileSync("apps/android/app/build.gradle.kts","utf8");

assert.match(activity,/COPY PAIRING TOKEN/);
assert.match(activity,/setTextIsSelectable\(true\)/);
assert.match(activity,/ClipboardManager/);
assert.match(activity,/ClipData\.newPlainText\("LeeWay pairing token", pairingToken\)/);
assert.match(activity,/TERMUX_BOOTSTRAP/);
assert.match(activity,/Pairing mode opened by Termux/);
assert.match(gradle,/versionCode = 26/);
assert.match(gradle,/versionName = "0\.9\.8-pocket-rc8"/);

console.log("PASS pairing-copy UX source contract");
