import fs from "node:fs";
import assert from "node:assert/strict";

const base="apps/android/app/src/main";
const manifest=fs.readFileSync(base+"/AndroidManifest.xml","utf8");
const overlay=fs.readFileSync(base+"/java/industries/leeway/devicebridge/FloatingAgentLeeOverlay.kt","utf8");
const activity=fs.readFileSync(base+"/java/industries/leeway/devicebridge/MainActivity.kt","utf8");
const relay=fs.readFileSync(base+"/java/industries/leeway/devicebridge/RemoteRelayService.kt","utf8");

assert.match(manifest,/android\.permission\.SYSTEM_ALERT_WINDOW/);
assert.match(overlay,/TYPE_APPLICATION_OVERLAY/);
assert.match(overlay,/TALK_TO_AGENT_LEE/);
assert.match(activity,/ENABLE AGENT LEE SIDE MIC/);
assert.match(activity,/ACTION_MANAGE_OVERLAY_PERMISSION/);
assert.match(activity,/TALK_TO_AGENT_LEE/);
assert.match(relay,/FloatingAgentLeeOverlay\.attach/);
assert.match(relay,/FloatingAgentLeeOverlay\.detach/);
console.log("PASS Agent Lee owner-authorized floating side microphone source contract");
