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
const config=JSON.parse(fs.readFileSync("docs/remote-relay.json","utf8"));
const controller=fs.readFileSync("clients/remote-controller/client.mjs","utf8");
const qualification=fs.readFileSync("clients/remote-controller/termux-qualify.sh","utf8");
const workstation=fs.readFileSync("clients/phone-workstation/worker.mjs","utf8");
const onePull=fs.readFileSync("clients/remote-controller/termux-one-pull.sh","utf8");

assert.match(service,/START_STICKY/);
assert.match(service,/WebSocketListener/);
assert.match(service,/BridgeSecret\.ensure/);
assert.match(service,/DeviceIdentity\.ensure/);
assert.match(service,/scheduleReconnect/);
assert.match(service,/hello-ack/);
assert.match(service,/RemoteCommandRouter\.execute/);
assert.match(service,/seenCommandIds/);
assert.match(state,/getString\(URL,\s*null\)/);
assert.match(state,/clearRelayUrl/);
assert.doesNotMatch(state,/DEFAULT_RELAY_URL/);
assert.match(service,/RELAY_ENDPOINT_UNBOUND/);
assert.match(service,/clearRelayUrl/);
assert.equal(config.relayUrl,null);
assert.equal(config.relayDeployment,"NOT_BOUND");
assert.deepEqual(config.remoteQualifiedCapabilities,[]);
assert.match(controller,/process\.env\.LEEWAY_RELAY_URL/);
assert.doesNotMatch(controller,/wss:\/\//);
assert.match(workstation,/const RELAY=CREDS\.relay/);
assert.match(workstation,/OWNER_BOUND_WSS_RELAY_REQUIRED/);
assert.doesNotMatch(workstation,/wss:\/\//);
assert.match(qualification,/owner-approved LEEWAY_DEVICE_ID and LEEWAY_RELAY_URL/);
assert.doesNotMatch(qualification,/LEEWAY_RELAY_URL:-wss:\/\//);
assert.match(onePull,/LEEWAY_TARGET_VERSION/);
assert.match(onePull,/REQUESTED_RELAY_URL/);
assert.match(state,/github\.io\/LEEWAY-DEVICE-BRIDGE\/docs\/remote-relay\.json/);
assert.match(router,/FormulaF8Gate\.evaluate/);
assert.match(router,/LOCAL_ELIGIBILITY_HOLD/);
assert.match(router,/canonicalFormulaState/);
assert.match(router,/model\.inference/);
assert.match(router,/device\.network\.discover/);
assert.match(boot,/ACTION_BOOT_COMPLETED/);
assert.match(manifest,/FOREGROUND_SERVICE_REMOTE_MESSAGING/);
assert.match(manifest,/foregroundServiceType="remoteMessaging"/);
assert.match(manifest,/RECEIVE_BOOT_COMPLETED/);

console.log("PASS remote relay source contract");
