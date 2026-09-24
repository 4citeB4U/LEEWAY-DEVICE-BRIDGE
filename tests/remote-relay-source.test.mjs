import fs from "node:fs";
import assert from "node:assert/strict";

const base="apps/android/app/src/main";
const service=fs.readFileSync(
  base+"/java/industries/leeway/devicebridge/RemoteRelayService.kt",
  "utf8"
);
const state=fs.readFileSync(
  base+"/java/industries/leeway/devicebridge/RemoteRelayState.kt",
  "utf8"
);
const router=fs.readFileSync(
  base+"/java/industries/leeway/devicebridge/RemoteCommandRouter.kt",
  "utf8"
);
const boot=fs.readFileSync(
  base+"/java/industries/leeway/devicebridge/BootReceiver.kt",
  "utf8"
);
const manifest=fs.readFileSync(base+"/AndroidManifest.xml","utf8");

assert.match(service,/START_STICKY/);
assert.match(service,/WebSocketListener/);
assert.match(service,/BridgeSecret\.ensure/);
assert.match(service,/DeviceIdentity\.ensure/);
assert.match(service,/scheduleReconnect/);
assert.match(service,/hello-ack/);
assert.match(service,/RemoteCommandRouter\.execute/);
assert.match(service,/seenCommandIds/);
assert.match(state,/agent-lee-x\.vercel\.app/);
assert.match(state,/github\.io\/LEEWAY-DEVICE-BRIDGE\/docs\/remote-relay\.json/);
assert.match(router,/FormulaF8Gate\.evaluate/);
assert.match(router,/FORMULA_HOLD/);
assert.match(router,/model\.inference/);
assert.match(router,/device\.network\.discover/);
assert.match(boot,/ACTION_BOOT_COMPLETED/);
assert.match(manifest,/FOREGROUND_SERVICE_REMOTE_MESSAGING/);
assert.match(manifest,/foregroundServiceType="remoteMessaging"/);
assert.match(manifest,/RECEIVE_BOOT_COMPLETED/);

console.log("PASS remote relay source contract");
