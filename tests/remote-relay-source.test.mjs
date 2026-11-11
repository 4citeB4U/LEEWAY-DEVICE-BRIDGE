import fs from "node:fs";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

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
assert.equal(config.relayUrl,"wss://agent-lee.tailb186e7.ts.net/api/device-relay");
assert.equal(config.relaySource,"github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE@e1332e640eb32fdd49c26af06fefaae81c5c5637");
assert.equal(config.relayDeployment,"SOVEREIGN_PERSISTENT_FUNNEL");
assert.equal(config.relayAuthority,"TRANSPORT_ONLY");
assert.equal(config.deliveryMode,"SOVEREIGN_PERSISTENT_FUNNEL_WEBSOCKET_V1");
assert.equal(config.volatileRoomState,false);
assert.deepEqual(config.remoteQualifiedCapabilities,[]);
assert.match(controller,/process\.env\.LEEWAY_RELAY_URL/);
assert.doesNotMatch(controller,/wss:\/\//);
assert.match(workstation,/const RELAY=CREDS\.relay/);
assert.match(workstation,/OWNER_BOUND_WSS_RELAY_REQUIRED/);
assert.doesNotMatch(workstation,/wss:\/\//);
assert.match(qualification,/owner-approved LEEWAY_DEVICE_ID and LEEWAY_RELAY_URL/);
assert.doesNotMatch(qualification,/LEEWAY_RELAY_URL:-wss:\/\//);
for(const adapterSource of [onePull,qualification]){
  assert.doesNotMatch(adapterSource,/Galaxy Fold|pc-primary|[A-Z]:\\/);
}
assert.match(onePull,/LEEWAY_TARGET_VERSION/);
assert.match(onePull,/REQUESTED_RELAY_URL/);
assert.match(onePull,/BOOTSTRAP_PARSE_JS=/);
assert.match(onePull,/process\.stdin/);
assert.doesNotMatch(onePull,/\beval\b/);
assert.doesNotMatch(onePull,/\$EVIDENCE_DIR\/(?:owner-bootstrap|bootstrap-precheck)\.json/);
assert.doesNotMatch(onePull,/printf[^\n]*\$BOOTSTRAP_JSON[^\n]*>/);
assert.doesNotMatch(onePull,/BOOTSTRAP_PRECHECK/);
assert.doesNotMatch(onePull,/decode_bootstrap_field\(\)[\s\S]{0,400}process\.argv/);
assert.match(onePull,/export LEEWAY_DEVICE_ID\s*\n/);
assert.doesNotMatch(onePull,/export LEEWAY_DEVICE_ID="\$DEVICE_ID"/);
const parserMatch=onePull.match(/BOOTSTRAP_PARSE_JS="\$\(cat <<'NODE_BOOTSTRAP_PARSE'\r?\n([\s\S]*?)\r?\nNODE_BOOTSTRAP_PARSE\r?\n\)"/);
assert.ok(parserMatch,"owner bootstrap parser heredoc must remain testable");
const parser=parserMatch[1];
const encode=(body)=>spawnSync(process.execPath,["-e",parser],{input:body,encoding:"utf8"});
const validBootstrap=JSON.stringify({ok:true,pairingToken:"A".repeat(43),deviceId:"LDB-01234567-89ab-cdef-0123-456789abcdef",relayUrl:"wss://bridge.example.test/mcp"});
const parsedBootstrap=encode(validBootstrap);
assert.equal(parsedBootstrap.status,0);
assert.deepEqual(parsedBootstrap.stdout.split("\n").map(value=>Buffer.from(value,"base64").toString("utf8")),[
  "A".repeat(43),
  "LDB-01234567-89ab-cdef-0123-456789abcdef",
  "wss://bridge.example.test/mcp"
]);
const unboundBootstrap=encode(JSON.stringify({ok:true,pairingToken:"A".repeat(43),deviceId:"LDB-unbound",relayUrl:null}));
assert.equal(unboundBootstrap.status,0);
assert.equal(unboundBootstrap.stdout.split("\n")[2],"_");
assert.notEqual(encode("not-json").status,0);
assert.notEqual(encode(JSON.stringify({ok:false})).status,0);
assert.notEqual(encode(JSON.stringify({ok:true,pairingToken:"short",deviceId:"LDB-test",relayUrl:null})).status,0);
assert.notEqual(encode(JSON.stringify({ok:true,pairingToken:"A".repeat(43),deviceId:"LDB-test\nexec",relayUrl:null})).status,0);
assert.notEqual(encode(JSON.stringify({ok:true,pairingToken:"A".repeat(43),deviceId:"LDB-test",relayUrl:"https://bridge.example.test/mcp"})).status,0);
assert.notEqual(encode(JSON.stringify({ok:true,pairingToken:"A".repeat(43),deviceId:"LDB-test",relayUrl:"wss://user:secret@bridge.example.test/mcp"})).status,0);
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
