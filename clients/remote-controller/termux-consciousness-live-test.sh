#!/data/data/com.termux/files/usr/bin/bash
# LEEWAY HEADER — DO NOT REMOVE
# REGION: DEVICE.MACHINE_CONSCIOUSNESS.LIVE_TEST
# TAG: DEVICE.LEEWAY.MACHINE_CONSCIOUSNESS.L1_PHYSICAL_TEST
# WHAT = Baseline + observe-only shadow + physical Calculator prediction test on the Galaxy Fold
# WHY = Prove real phone cognition observations without allowing the experimental layer to change answers or action authority
# WHO = Leeway Industries / Creator-authorized Agent Lee
# WHERE = Termux -> owner bootstrap -> durable relay -> Device Bridge
# WHEN = MC live integration L1
# HOW = Capture baseline -> optional shadow OFF/ON A/B -> predict Calculator foreground -> execute existing governed launch -> observe -> receipt
set -euo pipefail

PKG="industries.leeway.devicebridge"
DEFAULT_RELAY="wss://agent-lee-x.vercel.app/api/device-relay"
ROOT="$HOME/.leeway/mc-live-shadow"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
EVIDENCE="$HOME/leeway-evidence/mc-live-shadow-$STAMP"
NODE="$ROOT/live-test.mjs"

mkdir -p "$ROOT" "$EVIDENCE"
chmod 700 "$ROOT"

say(){ printf '\n[LeeWay] %s\n' "$*"; }
pass(){ printf '[LeeWay][PASS] %s\n' "$*"; }
obs(){ printf '[LeeWay][OBSERVED] %s\n' "$*"; }
blocked(){ printf '[LeeWay][BLOCKED] %s\n' "$*"; }

for cmd in curl node npm am; do
  command -v "$cmd" >/dev/null 2>&1 || { blocked "Missing required command: $cmd"; exit 2; }
done

say "MC LIVE L1 — BASELINE / SHADOW / PHYSICAL TEST"
say "Evidence: $EVIDENCE"
say "No APK install occurs in this script."

NONCE="$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")"
am start -n "$PKG/.MainActivity" --es leeway_action TERMUX_BOOTSTRAP --es leeway_nonce "$NONCE" >/dev/null 2>&1 || {
  blocked "Could not start owner bootstrap. Capture remains BLOCKED."
  exit 3
}

BOOT=""
for i in $(seq 1 40); do
  BOOT="$(curl -fsS --max-time 2 "http://127.0.0.1:5323/owner-bootstrap?nonce=$NONCE" 2>/dev/null || true)"
  [ -n "$BOOT" ] && break
  sleep 0.5
done
unset NONCE

[ -n "$BOOT" ] || { blocked "Owner bootstrap did not respond."; exit 4; }

eval "$(printf '%s' "$BOOT" | node -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
 const v=JSON.parse(s); if(v.ok!==true)process.exit(3);
 const q=x=>JSON.stringify(String(x||""));
 console.log("LEEWAY_DEVICE_ID="+q(v.deviceId));
 console.log("LEEWAY_PAIRING_TOKEN="+q(v.pairingToken));
 console.log("LEEWAY_RELAY_URL="+q(v.relayUrl||process.env.DEFAULT_RELAY));
});' )"

export DEFAULT_RELAY
export LEEWAY_DEVICE_ID
export LEEWAY_PAIRING_TOKEN
export LEEWAY_RELAY_URL
export LEEWAY_EVIDENCE="$EVIDENCE"

cat > "$ROOT/package.json" <<'JSON'
{"name":"leeway-mc-live-shadow","private":true,"type":"module","dependencies":{"ws":"8.18.3"}}
JSON

(
 cd "$ROOT"
 npm install --ignore-scripts --no-audit --no-fund >/dev/null 2>&1
)

cat > "$NODE" <<'NODE'
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import WebSocket from "ws";

const relay=process.env.LEEWAY_RELAY_URL;
const deviceId=process.env.LEEWAY_DEVICE_ID;
const token=process.env.LEEWAY_PAIRING_TOKEN;
const evidence=process.env.LEEWAY_EVIDENCE;
const ws=new WebSocket(relay);
const pending=new Map();

const write=(name,v)=>fs.writeFileSync(path.join(evidence,name+".json"),JSON.stringify(v,null,2));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const connected=new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error("RELAY_AUTH_TIMEOUT")),20000);
  ws.on("open",()=>ws.send(JSON.stringify({type:"hello",role:"client",deviceId,token})));
  ws.on("message",raw=>{
    let m; try{m=JSON.parse(raw.toString())}catch{return}
    if(m.type==="hello-ack"){clearTimeout(timer);resolve(m);return}
    if(m.type==="result"&&m.id){
      const p=pending.get(m.id); if(!p)return;
      pending.delete(m.id);clearTimeout(p.timer);p.resolve(m);return;
    }
    if(m.type==="error"&&!pending.size){clearTimeout(timer);reject(new Error(m.error||"RELAY_ERROR"))}
  });
  ws.on("error",reject);
});

function command(capability,args={},timeout=60000){
  return new Promise((resolve,reject)=>{
    const id=crypto.randomUUID();
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error("COMMAND_TIMEOUT:"+capability))},timeout);
    pending.set(id,{resolve,reject,timer});
    ws.send(JSON.stringify({type:"command",id,capability,arguments:args}));
  });
}

async function run(cap,args={},timeout=60000){
  const env=await command(cap,args,timeout);
  if(env.ok!==true) return {ok:false,error:env.error||"REMOTE_FAILED",capability:cap};
  return {ok:true,value:env.result,capability:cap};
}

function responseOf(x){return x?.value?.response||""}
function foregroundOf(x){return x?.value?.tree?.packageName||null}
function has15(s){return /(^|\D)15(\D|$)/.test(String(s||""))}

const summary={
  schemaVersion:"0.1.0",
  testId:"MC-L1-LIVE-"+new Date().toISOString(),
  deviceId,
  relay,
  sourceClass:"REAL_PHONE_EXECUTION",
  shadowCapability:false,
  baseline:{},
  shadow:{},
  physical:{},
  overall:"UNVERIFIED"
};

try{
  const hello=await connected;
  summary.relayHello={
    deliveryMode:hello.deliveryMode||null,
    presenceMode:hello.presenceMode||null,
    phoneOnlineHint:hello.phoneOnline??null
  };

  const health=await run("device.health");
  const model=await run("model.status");
  const capabilities=await run("device.capabilities");
  write("device-health",health);
  write("model-status",model);
  write("device-capabilities",capabilities);

  const names=Array.isArray(capabilities?.value?.remoteQualified)
    ? capabilities.value.remoteQualified.map(String)
    : [];
  summary.shadowCapability=names.includes("consciousness.shadow.status") &&
    names.includes("consciousness.shadow.set");

  async function chatSet(label){
    const prompts=[
      ["greeting","Hello, Agent Lee."],
      ["arithmetic","What is 7 + 8? Answer with only the number."],
      ["q69","Does six-bit binary directly represent all 70 LeeWay Q69 states from 0 through 69?"]
    ];
    const out={};
    for(const [name,prompt] of prompts){
      const r=await run("agent.chat",{prompt,speak:false},180000);
      out[name]=r;
      write(label+"-"+name,r);
      await sleep(100);
    }
    return out;
  }

  if(summary.shadowCapability){
    const status=await run("consciousness.shadow.status");
    write("shadow-status-initial",status);
    await run("consciousness.shadow.set",{enabled:false});
  }

  const off=await chatSet("chat-off");
  summary.baseline={
    greetingResponse:responseOf(off.greeting),
    arithmeticResponse:responseOf(off.arithmetic),
    arithmeticCorrect:has15(responseOf(off.arithmetic)),
    q69Response:responseOf(off.q69),
    shadowMetadataPresent:Object.values(off).some(x=>Boolean(x?.value?.shadowCognition))
  };

  if(summary.shadowCapability){
    await run("consciousness.shadow.set",{enabled:true});
    const on=await chatSet("chat-on");
    summary.shadow={
      greetingResponse:responseOf(on.greeting),
      arithmeticResponse:responseOf(on.arithmetic),
      arithmeticCorrect:has15(responseOf(on.arithmetic)),
      q69Response:responseOf(on.q69),
      greetingUnchanged:responseOf(on.greeting)===responseOf(off.greeting),
      q69Unchanged:responseOf(on.q69)===responseOf(off.q69),
      metadataPresent:Object.values(on).every(x=>Boolean(x?.value?.shadowCognition)),
      predictionErrors:Object.fromEntries(
        Object.entries(on).map(([k,x])=>[k,x?.value?.shadowCognition?.predictionError??null])
      )
    };
  }

  const apps=await run("device.apps.list");
  write("apps-list",apps);
  const appRows=Array.isArray(apps?.value?.apps)?apps.value.apps:[];
  const calculators=appRows.filter(x=>/calculator/i.test(String(x?.label||"")));
  summary.physical.calculatorCandidates=calculators.map(x=>({
    label:x.label||null,packageName:x.packageName||null
  }));

  if(calculators.length===1){
    const target=String(calculators[0].packageName||"");
    const before=await run("device.ui.snapshot");
    write("ui-before",before);
    summary.physical.prediction={
      action:"device.apps.launch",
      targetPackage:target,
      expectedForegroundPackage:target
    };
    const launch=await run("device.apps.launch",{packageName:target});
    write("calculator-launch",launch);
    await sleep(1200);
    const after=await run("device.ui.snapshot");
    write("ui-after",after);
    const actual=foregroundOf(after);
    summary.physical.beforePackage=foregroundOf(before);
    summary.physical.actualForegroundPackage=actual;
    summary.physical.launchOk=Boolean(launch.ok);
    summary.physical.predictionError=actual===target?0:1;
    summary.physical.verified=actual===target;
    await run("device.ui.back");
  }else{
    summary.physical.blocked="CALCULATOR_NOT_UNIQUE";
  }

  if(summary.shadowCapability){
    await run("consciousness.shadow.set",{enabled:false});
    const finalStatus=await run("consciousness.shadow.status");
    write("shadow-status-final",finalStatus);
    summary.shadow.rolledBack=finalStatus?.value?.enabled===false;
  }

  const physicalPass=summary.physical.verified===true;
  const baselinePass=summary.baseline.greetingResponse.length>0 &&
    summary.baseline.q69Response.length>0;
  const shadowPass=!summary.shadowCapability || (
    summary.baseline.shadowMetadataPresent===false &&
    summary.shadow.metadataPresent===true &&
    summary.shadow.greetingUnchanged===true &&
    summary.shadow.q69Unchanged===true &&
    summary.shadow.rolledBack===true
  );

  summary.overall=baselinePass&&physicalPass&&shadowPass
    ? (summary.shadowCapability?"SHADOW_L1_PHYSICAL_PASS":"BASELINE_PHYSICAL_PASS")
    : "PARTIAL_OR_BLOCKED";
}catch(error){
  summary.fatal=String(error?.message||error);
  summary.overall="BLOCKED";
}finally{
  summary.digest=crypto.createHash("sha256").update(JSON.stringify(summary)).digest("hex");
  write("mc-live-summary",summary);
  try{ws.close()}catch{}
}

console.log(JSON.stringify({
  overall:summary.overall,
  shadowCapability:summary.shadowCapability,
  baseline:summary.baseline,
  shadow:summary.shadow,
  physical:summary.physical,
  digest:summary.digest,
  evidence
},null,2));
process.exit(summary.overall.includes("PASS")?0:20);
NODE

say "Running live baseline/shadow/physical campaign."
node "$NODE"
RC=$?

unset LEEWAY_PAIRING_TOKEN
exit "$RC"
