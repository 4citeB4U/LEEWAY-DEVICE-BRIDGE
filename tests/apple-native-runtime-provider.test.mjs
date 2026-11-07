/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.APPLE_NATIVE_RUNTIME.TEST
TAG: LEEWAY.APPLE.NATIVE_PROVIDER_FAIL_CLOSED_TEST
5WH:
WHAT = Qualify Bridge-native install provider with synthetic physical and worker fixtures.
WHY = Prevent owner-consent bypass, wrong device, unknown artifacts, and fabricated installation evidence.
WHO = LeeWay Device Bridge authorized engineering contributors.
WHERE = tests/apple-native-runtime-provider.test.mjs.
WHEN = 2026-11-07.
HOW = Fake host observations and fake worker process; never touches a real phone or Apple account.
LICENSE = MIT.
*/
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp, writeFile, rm, readFile} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {EventEmitter} from "node:events";
import {createAppleNativeInstallProvider} from "../operator/native-apple-installer/runtime-provider.mjs";
import {PhysicalAppleAdapter} from "../operator/physical-adapters.mjs";
import {requireTrustedRuntimeComposition} from "../apps/desktop/runtime-composition.mjs";

const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const deviceHardwareId = "a".repeat(24);
const deviceUDID = "00008020-001D2C3E0A12003A";
const requestId = "11111111-2222-4333-8444-555555555555";

async function fixture(fn) {
  const root = await mkdtemp(path.join(os.tmpdir(),"leeway-apple-native-test-"));
  try {
    const ipaPath=path.join(root,"LeeWay.ipa"), binaryPath=path.join(root,"worker");
    const manifestPath=path.join(root,"package.json");
    const ipa=Buffer.from("synthetic-not-a-real-ipa"),worker=Buffer.from("synthetic-executable");
    await writeFile(ipaPath,ipa);await writeFile(binaryPath,worker);
    const published = JSON.parse(await readFile("docs/package-manifest.json","utf8"));
    const packageEntry=published.packages.find(p=>p.platform==="ios");
    packageEntry.sha256=sha(ipa);packageEntry.sizeBytes=ipa.length;
    packageEntry.githubActionsQualification.ipaSha256=sha(ipa);
    packageEntry.githubActionsQualification.ipaSizeBytes=ipa.length;
    await writeFile(manifestPath,JSON.stringify(published));
    const calls={consent:0,secrets:0,spawn:0,stdin:[]};
    const observed = () => ({
      authority:"LEEWAY_DEVICE_BRIDGE_PHYSICAL_READBACK",
      hardwareId:deviceHardwareId,udid:deviceUDID,
      physicallyProbed:true,trustedPairing:true,installedAppState:"NONE"
    });
    function fakeSpawn() {
      calls.spawn++;
      const child=new EventEmitter(),stdout=new EventEmitter();
      stdout.setEncoding=()=>{};
      child.stdout=stdout;
      child.kill=()=>{};
      child.stdin={write(line) {
        calls.stdin.push(JSON.parse(line));
        queueMicrotask(()=>{
          stdout.emit("data",[
            {type:"leeway.apple.installer",stage:"INSTALL",state:"NATIVE_INSTALLER_ACKNOWLEDGED"},
            {type:"leeway.apple.installer",stage:"POST_INSTALL",state:"LEEWAY_BUNDLE_PRESENT",signedBundleId:"industries.leeway.devicebridge.ABCDEFGHIJ"},
            {type:"leeway.apple.installer",stage:"FINAL",state:"HOST_INSTALL_OBSERVED_NOT_INDEPENDENTLY_VERIFIED"}
          ].map(x=>JSON.stringify(x)).join("\n")+"\n");
          child.emit("close",0);
        });
      }};
      return child;
    }
    const conf={
      deviceHardwareId,deviceUDID,ipaPath,manifestPath,binaryPath,binarySha256:sha(worker),
      observePhysicalDevice:observed,
      approveOwnerAction:async ({requestId:id})=>(calls.consent++,{authority:"LEEWAY_RUNTIME_FABRIC",requestId:id,approved:true}),
      getHostCredentials:async ()=>(calls.secrets++,{
        appleId:"test@example.invalid",applePassword:"synthetic-secret",
        developerTeamId:"ABCDEFGHIJ",anisetteUrl:"https://example.invalid"
      }),
      handleTwoFactor:async ()=>({action:"abort"}),
      spawnBinary:fakeSpawn
    };
    await fn({conf,calls,published,ipaPath,manifestPath});
  } finally { await rm(root,{recursive:true,force:true}); }
}

test("trusted Native Apple capability requires exact device and a provider",async()=>{
  const bare=new PhysicalAppleAdapter({deviceId:deviceHardwareId});
  assert.equal((await bare.discover()).includes("device.apps.install.apple"),false);
  await assert.rejects(bare.execute("device.apps.install.apple",{}),/APPLE_NATIVE_INSTALL_PROVIDER_NOT_BOUND/);
  await fixture(async ({conf})=>{
    const provider=createAppleNativeInstallProvider(conf);
    const apple=new PhysicalAppleAdapter({deviceId:deviceHardwareId,appleInstallProvider:provider});
    assert.equal((await apple.discover()).includes("device.apps.install.apple"),true);
    assert.equal((await provider.health()).state,"READY_TO_EXECUTE");
    assert.equal((await provider.describe()).hostAuthority,"LEEWAY_RUNTIME_FABRIC_PRE_GATE_REQUIRED");
  });
});

test("absent owner approval blocks before any Apple secrets or native worker",async()=>{
  await fixture(async ({conf,calls,published})=>{
    conf.approveOwnerAction=async ()=>(calls.consent++,{approved:false});
    const p=createAppleNativeInstallProvider(conf);
    await assert.rejects(p.execute({deviceHardwareId,packageId:"apple-native",
      expectedSha256:published.packages.find(x=>x.platform==="ios").sha256,requestId}),/APPLE_OWNER_CONSENT_MISSING/);
    assert.equal(calls.secrets,0);
    assert.equal(calls.spawn,0);
  });
});

test("unknown exact iPhone cannot pass readiness; no command is started",async()=>{
  await fixture(async ({conf,calls,published})=>{
    const originalObservation=conf.observePhysicalDevice;
    conf.observePhysicalDevice=async ()=>({...await originalObservation(),hardwareId:"b".repeat(24)});
    const p=createAppleNativeInstallProvider(conf);
    assert.equal((await p.health()).state,"PHYSICAL_PREFLIGHT_NOT_READY");
    await assert.rejects(p.execute({deviceHardwareId,packageId:"apple-native",
      expectedSha256:published.packages.find(x=>x.platform==="ios").sha256,requestId}),/APPLE_PHYSICAL_DEVICE_NOT_QUALIFIED/);
    assert.equal(calls.consent,0);
    assert.equal(calls.secrets,0);
    assert.equal(calls.spawn,0);
  });
});

test("valid synthetic host pathway does not misrepresent independent Veritas",async()=>{
  await fixture(async ({conf,calls,published})=>{
    const p=createAppleNativeInstallProvider(conf);
    const adapter=new PhysicalAppleAdapter({deviceId:deviceHardwareId,appleInstallProvider:p});
    const result=await adapter.execute("device.apps.install.apple",{
      packageId:"apple-native",expectedSha256:published.packages.find(x=>x.platform==="ios").sha256,requestId
    });
    assert.equal(result.state,"HOST_INSTALL_OBSERVED_VERITAS_PENDING");
    assert.equal(result.veritasState,"NOT_INDEPENDENTLY_VERIFIED");
    assert.equal(result.nativeInstallAttempted,true);
    assert.equal(result.canonicalReceiptState,"NOT_ADMITTED");
    assert.equal(calls.consent,1);
    assert.equal(calls.secrets,1);
    assert.equal(calls.spawn,1);
    assert.equal(calls.stdin[0].action,"install-official-leeway-ipa");
    assert.equal(JSON.stringify(result).includes("synthetic-secret"),false);
  });
});

test("free Apple Account works without preexisting paid Developer Team ID",async()=>{
  await fixture(async ({conf,calls,published})=>{
    conf.getHostCredentials=async ()=>(calls.secrets++,{
      appleId:"test@example.invalid",applePassword:"synthetic-secret"
    });
    const provider=createAppleNativeInstallProvider(conf);
    const result=await provider.execute({
      deviceHardwareId,packageId:"apple-native",requestId,
      expectedSha256:published.packages.find(x=>x.platform==="ios").sha256
    });
    assert.equal(result.state,"HOST_INSTALL_OBSERVED_VERITAS_PENDING");
    assert.equal(result.installedBundleId,"industries.leeway.devicebridge.ABCDEFGHIJ");
    assert.equal(calls.stdin[0].developerTeamId,undefined);
    assert.equal(calls.stdin[0].anisetteUrl,undefined);
    assert.equal(calls.spawn,1);
  });
});

test("wrong signed bundle reported by worker never counts as a successful install",async()=>{
  await fixture(async ({conf,calls,published})=>{
    conf.spawnBinary=()=>{
      calls.spawn++;
      const child=new EventEmitter(), stdout=new EventEmitter();
      stdout.setEncoding=()=>{}; child.stdout=stdout;child.kill=()=>{};
      child.stdin={write:()=>queueMicrotask(()=>{
        stdout.emit("data",JSON.stringify({
          type:"leeway.apple.installer",stage:"POST_INSTALL",
          state:"LEEWAY_BUNDLE_PRESENT",signedBundleId:"com.example.otherapp.ABCDEFGHIJ"
        })+"\\n");
        child.emit("close",0);
      })};
      return child;
    };
    const provider=createAppleNativeInstallProvider(conf);
    await assert.rejects(provider.execute({
      deviceHardwareId,packageId:"apple-native",requestId,
      expectedSha256:published.packages.find(x=>x.platform==="ios").sha256
    }), /APPLE_POST_INSTALL_BUNDLE_IDENTITY_MISMATCH|APPLE_INSTALL_OR_READBACK_FAILED/);
  });
});

test("a missing or changed IPA hash cannot reach secret or installer callbacks",async()=>{
  await fixture(async ({conf,calls})=>{
    const p=createAppleNativeInstallProvider(conf);
    await assert.rejects(p.execute({deviceHardwareId,packageId:"apple-native",
      expectedSha256:"f".repeat(64),requestId}),/APPLE_MANIFEST_HASH_NOT_MATCHED/);
    assert.equal(calls.secrets,0);
    assert.equal(calls.spawn,0);
  });
});

test("Runtime composition accepts only trusted maps with complete provider methods",()=>{
  const admission=async()=>true,receiptSink=async()=>{};
  const badMap=new Map([["iphone",{execute:async()=>{}}]]);
  assert.throws(()=>requireTrustedRuntimeComposition({admission,receiptSink,appleInstallProviders:badMap}),
    /TRUSTED_APPLE_INSTALL_PROVIDER_CONFIGURATION_INVALID/);
  const validMap=new Map([["iphone",{execute:async()=>{},health:async()=>{},describe:async()=>{}}]]);
  const trusted=requireTrustedRuntimeComposition({admission,receiptSink,appleInstallProviders:validMap});
  assert.equal(trusted.appleInstallProviders,validMap);
});
