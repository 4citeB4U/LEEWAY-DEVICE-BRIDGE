/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.GPU_INFERENCE_TRUSTED_STARTUP_TESTS
TAG: LEEWAY_GPU_PROTECTED_STARTUP_FRESH_PROCESS_GATE_TEST
WHO: Creator-authorized LeeWay test engineering.
WHAT: Verify owner bundle wiring and independent signed recovery gate.
WHEN: 2026-10-24. WHERE: packages/leeway-gpu-service.
WHY: Preview factory cannot be mistaken for production enrollment.
HOW: Missing-provider preflight, fixture-signed startup with ephemeral keys,
     guarded HTTP loopback, forged recovery rejection and owner switch.
AUTHORITY: DIAGNOSTIC_FIXTURE_ONLY; never production grants or ledgers.
LICENSE: Existing LeeWay repository terms.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {inspectTrustedGpuStartup,startTrustedLeeWayGpuInferenceService,LEEWAY_INFERENCE_SCOPE} from './trusted-startup.mjs';

test('zero enrollment rejects ordinary launcher assumptions with exact missing methods',async()=>{
 const report=inspectTrustedGpuStartup();
 assert.equal(report.state,'UNAVAILABLE');
 assert.equal(report.missing.filter(x=>/^(authority|formula|veritas|modelSource|ldwmd|continuum|receiptLedger|learningLedger)\./.test(x)).length,23);
 assert.ok(report.missing.includes('veritas.pre'));
 assert.ok(report.missing.includes('veritas.post'));
 assert.ok(report.missing.includes('learningLedger.admit'));
 assert.ok(report.missing.includes('recoveryProvider.verifyFreshProcessRecovery'));
 await assert.rejects(startTrustedLeeWayGpuInferenceService(),{code:'LEEWAY_GPU_TRUSTED_STARTUP_INCOMPLETE'});
});

const runtimeRoot=process.env.LEEWAY_RUNTIME_SOURCE_ROOT,gpuRoot=process.env.LEEWAY_GPU_SOURCE_ROOT;
test('real Runtime and GPU SDK bind via signed owner enrollment, never preview fallback',
 {skip: !runtimeRoot||!gpuRoot?'Reviewed runtime/GPU source checkouts not provided':false},async t=>{
 const load=(r,p)=>import(pathToFileURL(resolve(r,p)).href);
 const {createInferenceFixture,H,J,K}=await load(runtimeRoot,'tests/fixtures/inference-binding-fixture.mjs');
 const {syntheticModelPlan}=await load(gpuRoot,'tests/fixtures/portable-model-plan.mjs');
 const {inferenceHash}=await load(gpuRoot,'core/inference-contract.mjs');
 const f=await createInferenceFixture();
 const plan=syntheticModelPlan();
 const qualifier=await f.sign('leeway.gpu.provider-qualification.v1',{
  serviceId:'leeway.gpu.service',deviceId:'diagnostic-device',platform:'WINDOWS',
  receiptId:'DIAGNOSTIC_FIXTURE_ONLY',expiresAtMs:Date.now()+30000,
  models:[{modelId:'fixture-model',modelSha256:H,tokenizerSha256:J,
    implementationSha256:K,planSha256:await inferenceHash(plan)}]
 },'veritas');
 const qualification={publicKeySpki:f.trust.veritasPublicKeySpki,envelope:qualifier};
 const temp=await mkdtemp(join(tmpdir(),'leeway-protected-startup-fixture-'));
 t.after(()=>rm(temp,{force:true,recursive:true}));
 const recoveryBody=(receiptSha256)=>({scope:LEEWAY_INFERENCE_SCOPE,status:'PASS',pending:0,
  freshProcessReadbackVerified:true,enrollmentReceiptSha256:receiptSha256,
  receiptLedgerReadbackSha256:H,learningLedgerReadbackSha256:J,continuumReadbackSha256:K,
  expiresAtMs:Date.now()+30000});
 const input={runtimeRoot,gpuRoot,platform:'win32',deviceId:'diagnostic-device',
  models:[{modelId:'fixture-model',plan}],qualification,
  providers:f.providers,trust:f.trust,
  authenticateClient:async()=>({clientId:'fixture-client'}),
  deviceProvider:{async getDevice(){return {lost:new Promise(()=>{})};}},
  preferenceFile:join(temp,'preferences.json'),
  recoveryProvider:{async verifyFreshProcessRecovery({enrollmentReceiptSha256}){
   return f.sign('leeway.gpu.fresh-process-recovery-attestation.v1',recoveryBody(enrollmentReceiptSha256),'veritas');
  }}
 };
 assert.equal(inspectTrustedGpuStartup(input).state,'PREFLIGHT_COMPLETE_NOT_AUTHORIZED');
 const service=await startTrustedLeeWayGpuInferenceService(input);
 t.after(async()=>{await new Promise(done=>service.server.close(done))});
 assert.equal(service.productionExecution,false);
 assert.equal(service.perRequestAuthorization,'REQUIRED');
 const base='http://127.0.0.1:'+service.server.address().port;
 const cap=await (await fetch(base+'/v1/capabilities')).json();
 assert.equal(cap.gpuVerified,true);
 assert.equal(cap.receiptId,'DIAGNOSTIC_FIXTURE_ONLY');
 const stat=await(await fetch(base+'/v1/status')).json();
 assert.equal(stat.productionReady,false);
 assert.equal(stat.dispatchAllowed,false);
 // Forge an unsigned object that merely echoes recovery state: it must NOT listen.
 await assert.rejects(startTrustedLeeWayGpuInferenceService({...input,recoveryProvider:{
  async verifyFreshProcessRecovery(){return {...recoveryBody(H),state:'VERIFIED'};}
 }}),{code:'LEEWAY_GPU_DURABLE_RESTART_RECOVERY_UNQUALIFIED'});
 // The signed enrollment is bound to this recovery request; forged subject is refused.
 await assert.rejects(startTrustedLeeWayGpuInferenceService({...input,recoveryProvider:{
  async verifyFreshProcessRecovery(){return f.sign('leeway.gpu.fresh-process-recovery-attestation.v1',
   recoveryBody(H),'veritas');}
 }}),{code:'LEEWAY_GPU_DURABLE_RESTART_RECOVERY_UNQUALIFIED'});
 // Corrupt the independent signer despite otherwise valid snapshot.
 await assert.rejects(startTrustedLeeWayGpuInferenceService({...input,recoveryProvider:{
  async verifyFreshProcessRecovery({enrollmentReceiptSha256}){
   const envelope=await f.sign('leeway.gpu.fresh-process-recovery-attestation.v1',
    recoveryBody(enrollmentReceiptSha256),'issuer');
   return envelope;
  }
 }}),{code:'LEEWAY_GPU_DURABLE_RESTART_RECOVERY_SIGNATURE_INVALID'});
});
