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
const nodeRelay=fs.readFileSync("packages/agent-relay/index.mjs","utf8");
const nodeClient=fs.readFileSync("clients/remote-controller/client.mjs","utf8");
const phoneWorker=fs.readFileSync("clients/phone-workstation/worker.mjs","utf8");
const relayConfig=fs.readFileSync("docs/remote-relay.json","utf8");

assert.match(service,/START_STICKY/);
assert.match(service,/WebSocketListener/);
assert.match(service,/BridgeSecret\.ensure/);
assert.match(service,/DeviceIdentity\.ensure/);
assert.match(service,/scheduleReconnect/);
assert.match(service,/hello-ack/);
assert.match(service,/RemoteCommandRouter\.execute/);
assert.match(service,/seenCommandIds/);
assert.doesNotMatch(state,/wss:\/\/agent-lee-x\.vercel\.app/);
assert.match(service,/RELAY_ENDPOINT_NOT_CONFIGURED/);
assert.match(state,/github\.io\/LEEWAY-DEVICE-BRIDGE\/docs\/remote-relay\.json/);
assert.match(nodeRelay,/RELAY_ENDPOINT_REQUIRED/);
assert.match(nodeRelay,/LEGACY_RELAY_ENDPOINT_REJECTED/);
assert.match(nodeClient,/LEEWAY_RELAY_URL is required/);
assert.match(phoneWorker,/RELAY_ENDPOINT_REQUIRED/);
assert.match(relayConfig,/UNCONFIGURED_CANONICAL_ENDPOINT_REQUIRED/);
assert.doesNotMatch(relayConfig,/agent-lee-x\.vercel\.app/);
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
