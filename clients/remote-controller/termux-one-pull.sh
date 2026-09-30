#!/data/data/com.termux/files/usr/bin/bash
# LEEWAY HEADER — DO NOT REMOVE
# REGION: DEVICE.PHONE.ONE_PULL
# TAG: DEVICE.LEEWAY.TERMUX.ONEPULL
# 5WH:
# WHAT = Single-run Termux qualification controller for LeeWay Device Bridge on the Galaxy Fold
# WHY = Eliminate PC dependency and multi-command setup while preserving owner authority
# WHO = LeeWay Industries / Agent Lee / Creator
# WHERE = Termux -> production Device Bridge relay -> phone-local runtime
# WHEN = 2026-09-28
# HOW = self-install dependencies, capability-detect Device Bridge, one-time local owner bootstrap, durable relay campaign, evidence
set -uo pipefail

PKG="industries.leeway.devicebridge"
RELAY_URL="wss://agent-lee-x.vercel.app/api/device-relay"
WORK_ROOT="${HOME}/.leeway/device-bridge-one-pull"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
EVIDENCE_DIR="${HOME}/leeway-evidence/device-bridge-${STAMP}"
NODE_CLIENT="${WORK_ROOT}/controller.mjs"
TARGET_VERSION="0.8.5"
LATEST_META_URL="https://4citeb4u.github.io/LEEWAY-DEVICE-BRIDGE/docs/downloads/leeway-device-bridge-android-latest.json"
LATEST_APK_URL="https://4citeb4u.github.io/LEEWAY-DEVICE-BRIDGE/docs/downloads/leeway-device-bridge-android-latest-debug.apk"
RAW_META_URL="https://raw.githubusercontent.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/main/docs/downloads/leeway-device-bridge-android-latest.json"
RAW_APK_URL="https://raw.githubusercontent.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/main/docs/downloads/leeway-device-bridge-android-latest-debug.apk"
APK_FILE="${WORK_ROOT}/leeway-device-bridge-latest.apk"

say(){ printf '\n[LeeWay] %s\n' "$*"; }
pass(){ printf '[LeeWay][PASS] %s\n' "$*"; }
obs(){ printf '[LeeWay][OBSERVED] %s\n' "$*"; }
blocked(){ printf '[LeeWay][BLOCKED] %s\n' "$*"; }
fail(){ printf '[LeeWay][FAIL] %s\n' "$*" >&2; }

mkdir -p "$WORK_ROOT" "$EVIDENCE_DIR"
chmod 700 "$WORK_ROOT"

say "ONE-PULL PHONE QUALIFICATION"
say "Evidence directory: $EVIDENCE_DIR"
say "The pairing token stays only in this Termux process. It is never printed or written to evidence."

command -v pkg >/dev/null 2>&1 || { fail "Run this inside Termux."; exit 2; }

if ! command -v curl >/dev/null 2>&1; then
  say "Installing curl..."
  pkg install -y curl || exit 3
fi
if ! command -v node >/dev/null 2>&1; then
  say "Installing Node.js..."
  pkg install -y nodejs || exit 4
fi
command -v npm >/dev/null 2>&1 || { fail "npm is unavailable."; exit 5; }

probe_owner_bootstrap(){
  local nonce body
  nonce="$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")"
  am start -n "$PKG/.MainActivity" \
    --es leeway_action TERMUX_BOOTSTRAP \
    --es leeway_nonce "$nonce" >/dev/null 2>&1 || return 1
  for i in $(seq 1 24); do
    body="$(curl -fsS --max-time 2 "http://127.0.0.1:5323/owner-bootstrap?nonce=$nonce" 2>/dev/null || true)"
    if [ -n "$body" ]; then
      printf '%s\n' "$body"
      return 0
    fi
    sleep 0.5
  done
  return 1
}

install_latest_bridge(){
  say "Checking verified Device Bridge package."
  local meta sha version
  meta="$(curl -fsSL --max-time 20 "$LATEST_META_URL" 2>/dev/null || true)"
  if [ -z "$meta" ]; then
    obs "GitHub Pages metadata not ready; falling back to raw GitHub."
    meta="$(curl -fsSL --max-time 20 "$RAW_META_URL" 2>/dev/null || true)"
  fi
  if [ -z "$meta" ]; then
    fail "Verified Device Bridge package metadata is unavailable from both Pages and raw GitHub."
    return 1
  fi
  printf '%s\n' "$meta" > "$EVIDENCE_DIR/latest-package.json"
  version="$(node -e 'const v=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(String(v.versionName||""))' "$EVIDENCE_DIR/latest-package.json")"
  sha="$(node -e 'const v=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(String(v.sha256||""))' "$EVIDENCE_DIR/latest-package.json")"
  if [ "$version" != "$TARGET_VERSION" ] || [ -z "$sha" ]; then
    obs "GitHub Pages manifest is stale or incomplete; retrying from raw GitHub."
    meta="$(curl -fsSL --max-time 20 "$RAW_META_URL" 2>/dev/null || true)"
    [ -n "$meta" ] || { fail "Raw GitHub package metadata is unavailable."; return 1; }
    printf '%s\n' "$meta" > "$EVIDENCE_DIR/latest-package.json"
    version="$(node -e 'const v=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(String(v.versionName||""))' "$EVIDENCE_DIR/latest-package.json")"
    sha="$(node -e 'const v=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(String(v.sha256||""))' "$EVIDENCE_DIR/latest-package.json")"
  fi
  if [ "$version" != "$TARGET_VERSION" ] || [ -z "$sha" ]; then
    fail "Neither Pages nor raw GitHub exposes the qualified $TARGET_VERSION package."
    return 1
  fi
  if ! curl -fL --max-time 240 "$LATEST_APK_URL" -o "$APK_FILE"; then
    obs "GitHub Pages APK not ready; falling back to raw GitHub."
    curl -fL --max-time 240 "$RAW_APK_URL" -o "$APK_FILE" || return 1
  fi
  local actual
  actual="$(sha256sum "$APK_FILE" | awk '{print $1}')"
  if [ "$actual" != "$sha" ]; then
    fail "Downloaded APK hash mismatch."
    return 1
  fi
  pass "Verified Device Bridge $TARGET_VERSION APK downloaded."

  if command -v termux-open >/dev/null 2>&1; then
    termux-open --view "$APK_FILE" >/dev/null 2>&1 || true
  else
    am start -a android.intent.action.VIEW -d "file://$APK_FILE" -t application/vnd.android.package-archive >/dev/null 2>&1 || true
  fi
  say "Android installer opened. Approve the update/install; this script will detect completion automatically."

  for i in $(seq 1 120); do
    if probe_owner_bootstrap >/dev/null 2>&1; then
      pass "Device Bridge owner-bootstrap capability is live."
      return 0
    fi
    if [ $((i % 10)) -eq 0 ]; then say "Waiting for Android update confirmation... ${i}s"; fi
    sleep 1
  done

  blocked "In-place update did not complete. Opening Android uninstall confirmation for the old debug-signed app."
  am start -a android.intent.action.DELETE -d "package:$PKG" >/dev/null 2>&1 || true
  for i in $(seq 1 120); do
    [ -z "$(cmd package path "$PKG" 2>/dev/null || true)" ] && break
    if [ $((i % 10)) -eq 0 ]; then say "Waiting for Android uninstall confirmation... ${i}s"; fi
    sleep 1
  done
  if [ -n "$(cmd package path "$PKG" 2>/dev/null || true)" ]; then
    fail "Old Device Bridge package is still installed; Android did not approve removal."
    return 1
  fi

  if command -v termux-open >/dev/null 2>&1; then
    termux-open --view "$APK_FILE" >/dev/null 2>&1 || true
  else
    am start -a android.intent.action.VIEW -d "file://$APK_FILE" -t application/vnd.android.package-archive >/dev/null 2>&1 || true
  fi
  say "Approve Install. The script will continue as soon as Device Bridge $TARGET_VERSION is present."
  for i in $(seq 1 180); do
    if probe_owner_bootstrap >/dev/null 2>&1; then
      pass "Device Bridge owner-bootstrap capability is live."
      return 0
    fi
    if [ $((i % 10)) -eq 0 ]; then say "Waiting for Android install confirmation... ${i}s"; fi
    sleep 1
  done
  fail "Device Bridge $TARGET_VERSION was not installed."
  return 1
}

if BOOTSTRAP_PRECHECK="$(probe_owner_bootstrap 2>/dev/null)"; then
  pass "Device Bridge owner-bootstrap capability already live; package reinstall skipped."
  printf '%s\n' "$BOOTSTRAP_PRECHECK" > "$EVIDENCE_DIR/bootstrap-precheck.json"
  unset BOOTSTRAP_PRECHECK
else
  obs "Owner-bootstrap capability is not live yet; installing verified Device Bridge $TARGET_VERSION."
  install_latest_bridge || exit 5
fi

PACKAGE_PATH="$(cmd package path "$PKG" 2>/dev/null | head -n1 || true)"
if [ -z "$PACKAGE_PATH" ]; then
  PACKAGE_PATH="$(pm path "$PKG" 2>/dev/null | head -n1 || true)"
fi
if [ -n "$PACKAGE_PATH" ]; then
  pass "LeeWay Device Bridge package discovered."
  printf '%s\n' "$PACKAGE_PATH" > "$EVIDENCE_DIR/package-path.txt"
else
  blocked "LeeWay Device Bridge package could not be confirmed from Termux."
fi

LOCAL_HEALTH="$(curl -fsS --max-time 4 http://127.0.0.1:5323/health 2>/dev/null || true)"
if [ -n "$LOCAL_HEALTH" ]; then
  printf '%s\n' "$LOCAL_HEALTH" > "$EVIDENCE_DIR/local-health.json"
  node - "$EVIDENCE_DIR/local-health.json" <<'NODE_LOCAL' || true
const fs=require('fs');
const v=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
console.log('[LeeWay]['+(v.running?'PASS':'BLOCKED')+'] localBridgeRunning='+Boolean(v.running));
console.log('[LeeWay]['+(v.agentAccessEnabled?'PASS':'BLOCKED')+'] localAgentAccessEnabled='+Boolean(v.agentAccessEnabled));
console.log('[LeeWay][OBSERVED] localAuthority='+String(v.authority||'UNKNOWN'));
NODE_LOCAL
else
  obs "Local loopback server is not listening; the remote phone path will still be tested."
fi

say "Starting owner-authorized Termux bootstrap."
BOOTSTRAP_NONCE="$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")"

if ! command -v am >/dev/null 2>&1; then
  fail "Android activity manager command is unavailable in this Termux environment."
  exit 6
fi

am start -n "$PKG/.MainActivity" \
  --es leeway_action TERMUX_BOOTSTRAP \
  --es leeway_nonce "$BOOTSTRAP_NONCE" >/dev/null 2>&1 || {
    fail "Could not launch LeeWay Device Bridge bootstrap activity."
    exit 6
  }

say "Waiting for the one-time loopback owner handoff."
BOOTSTRAP_JSON=""
for attempt in $(seq 1 40); do
  BOOTSTRAP_JSON="$(curl -fsS --max-time 2 \
    "http://127.0.0.1:5323/owner-bootstrap?nonce=$BOOTSTRAP_NONCE" 2>/dev/null || true)"
  if [ -n "$BOOTSTRAP_JSON" ]; then
    break
  fi
  sleep 0.5
done
unset BOOTSTRAP_NONCE

if [ -z "$BOOTSTRAP_JSON" ]; then
  fail "Device Bridge did not provide the one-time owner bootstrap within 20 seconds."
  printf 'The installed app may be older than the owner-bootstrap build.\n'
  exit 6
fi

printf '%s\n' "$BOOTSTRAP_JSON" > "$EVIDENCE_DIR/owner-bootstrap.json"

eval "$(node - "$EVIDENCE_DIR/owner-bootstrap.json" <<'NODE_BOOTSTRAP'
const fs=require('fs');
const v=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(v.ok!==true) process.exit(20);
const q=s=>JSON.stringify(String(s||""));
console.log("LEEWAY_PAIRING_TOKEN="+q(v.pairingToken));
console.log("LEEWAY_DEVICE_ID="+q(v.deviceId));
console.log("LEEWAY_RELAY_URL="+q(v.relayUrl));
NODE_BOOTSTRAP
)" || {
  fail "Owner bootstrap response was invalid."
  exit 6
}

TOKEN_LEN=${#LEEWAY_PAIRING_TOKEN}
if [ "$TOKEN_LEN" -lt 20 ] || [ "$TOKEN_LEN" -gt 256 ]; then
  fail "Owner bootstrap returned an invalid credential length."
  unset LEEWAY_PAIRING_TOKEN
  exit 6
fi

pass "Owner bootstrap completed with no copy/paste."
pass "Local bridge authority and remote relay restart were requested by Device Bridge."

LOCAL_HEALTH_AFTER="$(curl -fsS --max-time 4 http://127.0.0.1:5323/health 2>/dev/null || true)"
if [ -n "$LOCAL_HEALTH_AFTER" ]; then
  printf '%s\n' "$LOCAL_HEALTH_AFTER" > "$EVIDENCE_DIR/local-health-after-owner-gate.json"
  node - "$EVIDENCE_DIR/local-health-after-owner-gate.json" <<'NODE_LOCAL_AFTER' || true
const fs=require('fs');
const v=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
console.log('[LeeWay]['+(v.running?'PASS':'BLOCKED')+'] localBridgeRunningAfterOwnerGate='+Boolean(v.running));
console.log('[LeeWay]['+(v.agentAccessEnabled?'PASS':'BLOCKED')+'] localAgentAccessAfterOwnerGate='+Boolean(v.agentAccessEnabled));
NODE_LOCAL_AFTER
else
  blocked "Local bridge is not listening after bootstrap."
fi

cat > "$WORK_ROOT/package.json" <<'JSON_PACKAGE'
{"name":"leeway-termux-one-pull","private":true,"type":"module","dependencies":{"ws":"8.18.3"}}
JSON_PACKAGE

cat > "$NODE_CLIENT" <<'NODE_CONTROLLER'
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import WebSocket from "ws";

const relay=process.env.LEEWAY_RELAY_URL;
const deviceId=process.env.LEEWAY_DEVICE_ID;
const token=process.env.LEEWAY_PAIRING_TOKEN;
const evidenceDir=process.env.LEEWAY_EVIDENCE_DIR;

if(!relay||!deviceId||!token||!evidenceDir)throw new Error("MISSING_CONTROLLER_ENV");

const commands=[
  ["device-health","device.health",{},30000],
  ["device-capabilities","device.capabilities",{},30000],
  ["model-status","model.status",{},30000],
  ["model-install","model.install",{},600000],
  ["voice-status-before","voice.status",{},30000],
  ["model-inference","model.inference",{prompt:"Respond briefly and include this marker: LEEWAY_PHONE_MODEL_READY"},180000],
  ["voice-speak","voice.speak",{text:"Agent Lee phone voice execution path is verified."},60000],
  ["voice-status-after","voice.status",{},30000],
  ["agent-chat","agent.chat",{prompt:"Respond briefly. Confirm this response was generated by the phone-local model, and end with: Direct phone path verified.",speak:true},180000],
  ["device-receipts","device.receipts",{},60000]
];

const write=(name,value)=>fs.writeFileSync(path.join(evidenceDir,name+".json"),JSON.stringify(value,null,2));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ws=new WebSocket(relay);
const pending=new Map();
let hello=null;

const connected=new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error("RELAY_AUTH_TIMEOUT")),20000);
  ws.on("open",()=>ws.send(JSON.stringify({type:"hello",role:"client",deviceId,token})));
  ws.on("message",raw=>{
    let msg; try{msg=JSON.parse(raw.toString())}catch{return}
    if(msg.type==="hello-ack"){
      hello=msg; clearTimeout(timer); resolve(msg); return;
    }
    if(msg.type==="result"&&msg.id){
      const p=pending.get(msg.id); if(!p)return;
      pending.delete(msg.id); clearTimeout(p.timer); p.resolve(msg); return;
    }
    if(msg.type==="error"&&!hello){
      clearTimeout(timer); reject(new Error(msg.error||"RELAY_AUTH_ERROR"));
    }
  });
  ws.on("error",e=>{if(!hello){clearTimeout(timer);reject(e)}});
  ws.on("close",()=>{for(const [id,p] of pending){clearTimeout(p.timer);p.reject(new Error("RELAY_CLOSED"));pending.delete(id)}});
});

function command(capability,args,timeoutMs){
  return new Promise((resolve,reject)=>{
    const id=crypto.randomUUID();
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error("COMMAND_TIMEOUT:"+capability))},timeoutMs);
    pending.set(id,{resolve,reject,timer});
    ws.send(JSON.stringify({type:"command",id,capability,arguments:args}));
  });
}

function classify(name,envelope){
  const result=envelope?.result;
  if(envelope?.ok!==true)return {relayOk:false,phoneOk:false,error:envelope?.error||"RELAY_RESULT_FAIL"};
  if(["model-inference","voice-speak","agent-chat"].includes(name)){
    return {relayOk:true,phoneOk:result?.ok===true,error:result?.ok===true?null:(result?.error||"PHONE_RESULT_FAIL")};
  }
  return {relayOk:true,phoneOk:true,error:null};
}

const summary={
  schema:"leeway-termux-one-pull-v2-durable-relay",
  testedAt:new Date().toISOString(),
  deviceId,
  relay,
  hello:null,
  checks:{},
  observations:{},
  overall:"UNVERIFIED"
};

try{
  const ack=await connected;
  const durable=ack.deliveryMode==="VERCEL_QUEUE_DURABLE_V1";
  summary.hello={
    role:ack.role,
    phoneOnlineHint:ack.phoneOnline??null,
    presenceMode:ack.presenceMode||null,
    deliveryMode:ack.deliveryMode||null,
    queueRegion:ack.queueRegion||null,
    relayAuthority:ack.relayAuthority||null
  };
  console.log("[LeeWay][PASS] Relay controller session established.");
  console.log("[LeeWay][OBSERVED] deliveryMode="+String(ack.deliveryMode||"LEGACY_OR_UNKNOWN"));
  console.log("[LeeWay][OBSERVED] presenceMode="+String(ack.presenceMode||"LEGACY_HINT"));
  if(!durable && ack.phoneOnline===false)throw new Error("LEGACY_RELAY_PHONE_OFFLINE");

  for(const [name,cap,args,timeout] of commands){
    if(name==="model-install" && summary.observations?.model?.verified===true){
      summary.checks[name]={relayOk:true,phoneOk:true,capability:cap,elapsedMs:0,skipped:"ALREADY_VERIFIED"};
      console.log("[LeeWay][PASS] model.install skipped; model already verified.");
      continue;
    }
    const started=Date.now();
    console.log("[LeeWay][RUNNING] "+cap);
    const heartbeat=setInterval(()=>{
      console.log("[LeeWay][RUNNING] "+cap+" elapsedMs="+(Date.now()-started));
    },15000);
    try{
      const envelope=await command(cap,args,timeout);
      clearInterval(heartbeat);
      const elapsedMs=Date.now()-started;
      write(name,envelope);
      const state=classify(name,envelope);
      summary.checks[name]={...state,capability:envelope?.capability||cap,elapsedMs};
      console.log("[LeeWay]["+(state.relayOk&&state.phoneOk?"PASS":"BLOCKED")+"] "+cap+" elapsedMs="+elapsedMs+(state.error?" error="+state.error:""));
      const value=envelope?.result;
      if(name==="device-health"){
        summary.observations.phoneAuthority=value?.authority||null;
        summary.observations.agentAccessEnabled=value?.agentAccessEnabled??null;
        summary.observations.remote=value?.remote||null;
      }else if(name==="model-status" || name==="model-install"){
        summary.observations.model={
          modelId:value?.modelId||null,
          verified:Boolean(value?.verified),
          runtime:value?.runtime||null,
          backend:value?.backend||null,
          sizeBytes:value?.sizeBytes??null,
          sha256:value?.sha256||null
        };
      }else if(name==="voice-status-after"){
        summary.observations.voice={
          engine:value?.engine||null,
          ready:Boolean(value?.ready),
          available:Boolean(value?.available),
          language:value?.language||null
        };
      }else if(name==="model-inference"){
        summary.observations.modelResponse=value?.response||null;
      }else if(name==="agent-chat"){
        summary.observations.agentChat={
          modelId:value?.modelId||null,
          response:value?.response||null,
          elapsedMs:value?.elapsedMs??null,
          voice:value?.voice||null,
          authority:value?.authority||null
        };
      }
    }catch(error){
      clearInterval(heartbeat);
      const elapsedMs=Date.now()-started;
      const detail=String(error?.message||error);
      summary.checks[name]={relayOk:false,phoneOk:false,capability:cap,elapsedMs,error:detail};
      console.log("[LeeWay][BLOCKED] "+cap+" error="+detail);
      if(name==="device-health"){
        throw new Error(
          "DEVICE_HEALTH_UNREACHABLE: the controller reached the durable relay but no phone runtime answered. "+
          "Verify the owner pairing token matches the phone and the always-on remote bridge has reconnected."
        );
      }
    }
    await wait(150);
  }

  const required=["device-health","model-status","model-install","voice-speak","agent-chat"];
  summary.overall=required.every(n=>summary.checks[n]?.relayOk&&summary.checks[n]?.phoneOk)?"EXECUTION_PASS":"PARTIAL_OR_BLOCKED";
}catch(error){
  summary.fatal=String(error?.message||error);
  summary.overall="BLOCKED";
  console.log("[LeeWay][BLOCKED] Controller campaign stopped: "+summary.fatal);
}finally{
  write("qualification-summary",summary);
  try{ws.close()}catch{}
}

console.log("[LeeWay][RESULT] "+summary.overall);
console.log("[LeeWay][EVIDENCE] "+path.join(evidenceDir,"qualification-summary.json"));
process.exit(summary.overall==="EXECUTION_PASS"?0:20);
NODE_CONTROLLER

(
  cd "$WORK_ROOT"
  npm install --ignore-scripts --no-audit --no-fund >/dev/null 2>&1
) || { fail "Could not install the local WebSocket controller dependency."; unset LEEWAY_PAIRING_TOKEN; exit 7; }

export LEEWAY_DEVICE_ID="$DEVICE_ID"
export LEEWAY_RELAY_URL="$RELAY_URL"
export LEEWAY_EVIDENCE_DIR="$EVIDENCE_DIR"
export LEEWAY_PAIRING_TOKEN

say "Running complete phone capability campaign in one authenticated relay session."
node "$NODE_CLIENT"
CONTROLLER_RC=$?

unset LEEWAY_PAIRING_TOKEN

SUMMARY="$EVIDENCE_DIR/qualification-summary.json"
SHARE="$EVIDENCE_DIR/share-summary.txt"
if [ -f "$SUMMARY" ]; then
  node - "$SUMMARY" > "$SHARE" <<'NODE_SHARE'
const fs=require('fs');
const s=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
console.log("LEEWAY_PHONE_QUALIFICATION="+s.overall);
console.log("relayDeliveryMode="+String(s.hello?.deliveryMode||"UNKNOWN"));
console.log("relayPresenceMode="+String(s.hello?.presenceMode||"UNKNOWN"));
console.log("deviceHealth="+(s.checks?.["device-health"]?.relayOk&&s.checks?.["device-health"]?.phoneOk?"PASS":"BLOCKED"));
console.log("agentAccessEnabled="+String(s.observations?.agentAccessEnabled));
console.log("modelId="+String(s.observations?.model?.modelId||"UNKNOWN"));
console.log("modelVerified="+Boolean(s.observations?.model?.verified));
console.log("modelRuntime="+String(s.observations?.model?.runtime||"UNKNOWN"));
console.log("voiceEngine="+String(s.observations?.voice?.engine||"UNKNOWN"));
console.log("voiceReady="+Boolean(s.observations?.voice?.ready));
console.log("agentChatAuthority="+String(s.observations?.agentChat?.authority||"UNKNOWN"));
for(const [name,v] of Object.entries(s.checks||{})){
  console.log(name+"="+(v.relayOk&&v.phoneOk?"PASS":"BLOCKED")+(v.error?":"+v.error:""));
}
console.log("PAIRING_TOKEN=REDACTED_NOT_INCLUDED");
NODE_SHARE

  printf '\n================ SANITIZED RESULT ================\n'
  cat "$SHARE"
  printf '==================================================\n'
  if command -v termux-clipboard-set >/dev/null 2>&1; then
    termux-clipboard-set < "$SHARE" 2>/dev/null && pass "Sanitized result copied to clipboard."
  fi
fi

printf '\nEvidence directory: %s\n' "$EVIDENCE_DIR"
printf 'Human acoustic check: did you hear both spoken tests?\n'
printf 'No pairing token is present in the share summary.\n'

exit $CONTROLLER_RC
