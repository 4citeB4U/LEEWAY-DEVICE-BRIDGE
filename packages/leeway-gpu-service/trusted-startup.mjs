/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.GPU_INFERENCE_TRUSTED_STARTUP
TAG: LEEWAY_GPU_INFERENCE_V1_RUNTIME_STARTUP_COMPOSITION
WHO: Creator-authorized LeeWay Runtime operator, not an HTTP request.
WHAT: Wire existing Runtime Fabric inference provider and Edge GPU SDK to Device Bridge.
WHEN: 2026-10-24. WHERE: packages/leeway-gpu-service.
WHY: The ordinary service launcher only constructs the unadmitted preview provider.
HOW: Exact reviewed source roots, root-signed enrollment, model qualification,
     owner-managed durable recovery check, authenticated client and local service.
AUTHORITY: No keys generated, no enrollment, no production certification or fallback.
LICENSE: Existing LeeWay repository terms.
*/
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {listenGpuService} from './service.mjs';

export const LEEWAY_INFERENCE_SCOPE='LEEWAY_GPU_INFERENCE_V1';
const REQUIRED=Object.freeze({
 authority:['authorize','consumeReplay','revalidate','release'],
 formula:['evaluate','replay'],
 veritas:['pre','post','commit'],
 modelSource:['open','verifyRead'],
 ldwmd:['admit','revalidate'],
 continuum:['open','stage','readback','commit','rollback','close'],
 receiptLedger:['append','readback'],
 learningLedger:['admit','readback']
});
const id=x=>typeof x==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$/.test(x);
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const fail=(code)=>{throw Object.assign(Error(code),{code});};
const root=x=>typeof x==='string'&&path.isAbsolute(x)&&path.normalize(x)===x&&
 !x.split(/[\\/]+/).includes('..')&&x.length<4096;
function key(x){return x instanceof Uint8Array&&x.byteLength>=32&&x.byteLength<=4096;}

/** No secret values, tokens or key material are returned in the readiness report. */
export function inspectTrustedGpuStartup(input={}){
 const missing=[], providers=input.providers||{}, trust=input.trust||{};
 for(const [family,methods] of Object.entries(REQUIRED))
  for(const method of methods)if(typeof providers[family]?.[method]!=='function')missing.push(family+'.'+method);
 for(const k of ['rootPublicKeySpki','issuerPublicKeySpki','veritasPublicKeySpki'])
  if(!key(trust[k]))missing.push('trust.'+k);
 if(!sha(trust.providerSetSha256))missing.push('trust.providerSetSha256');
 if(trust.enrollment?.schema!=='leeway.inference.startup-enrollment.v1'||
    !key(trust.enrollment?.signature)||!trust.enrollment.body)
    missing.push('trust.rootSignedEnrollment');
 if(!root(input.runtimeRoot))missing.push('runtimeRoot');
 if(!root(input.gpuRoot))missing.push('gpuRoot');
 if(!Array.isArray(input.models)||input.models.length===0)missing.push('qualifiedModelCatalog');
 if(!input.qualification)missing.push('independentGpuModelQualification');
 if(!id(input.deviceId))missing.push('deviceId');
 if(typeof input.authenticateClient!=='function')missing.push('authenticateClient');
 if(typeof input.deviceProvider?.getDevice!=='function')missing.push('deviceProvider.getDevice');
 if(typeof input.recoveryProvider?.verifyFreshProcessRecovery!=='function')
   missing.push('recoveryProvider.verifyFreshProcessRecovery');
 return Object.freeze({scope:LEEWAY_INFERENCE_SCOPE,state:missing.length?'UNAVAILABLE':'PREFLIGHT_COMPLETE_NOT_AUTHORIZED',
  missing:Object.freeze(missing),productionExecution:false});
}

/** Launch only from a trusted owner-controlled process with in-memory verified adapters.
 * Do NOT invoke from public request JSON or the preview CLI.
 * A recovery check never creates a production permit or replaces Veritas.
 */
export async function startTrustedLeeWayGpuInferenceService(input={}){
 const check=inspectTrustedGpuStartup(input);
 if(check.missing.length){
  const error=Object.assign(Error('LEEWAY_GPU_TRUSTED_STARTUP_INCOMPLETE'),{
   code:'LEEWAY_GPU_TRUSTED_STARTUP_INCOMPLETE',missing:[...check.missing]});
  throw error;
 }
 const runtimeImport=pathToFileURL(path.join(input.runtimeRoot,'adapters','edge-gpu','inference-binding.mjs')).href;
 const gpuImport=pathToFileURL(path.join(input.gpuRoot,'sdk','inference-provider.mjs')).href;
 const [runtime,gpu]=await Promise.all([import(runtimeImport),import(gpuImport)]);
 if(typeof runtime.createLeeWayInferenceBindingProvider!=='function'||
    typeof gpu.createLeeWayGpuInferenceProvider!=='function')fail('LEEWAY_GPU_STARTUP_SOURCE_CONTRACT_INVALID');
 const bindingProvider=runtime.createLeeWayInferenceBindingProvider({
  providers:input.providers,trust:input.trust,crypto:input.crypto,clock:input.clock
 });
 const readiness=await bindingProvider.readiness();
 if(readiness?.state!=='BOUND'||!sha(readiness.enrollmentReceiptSha256))
   fail('LEEWAY_GPU_SIGNED_STARTUP_ENROLLMENT_UNVERIFIED');
 // The existing Runtime release map only works within one process.
 // External owner recovery must independently reconcile durable Continuum and
 // both original ledgers before this service can accept any admitted work.
 const restored=await input.recoveryProvider.verifyFreshProcessRecovery({
  scope:LEEWAY_INFERENCE_SCOPE,enrollmentReceiptSha256:readiness.enrollmentReceiptSha256
 });
 // Require an independent custodian's actual signed snapshot, never a
 // self-asserted {status:'VERIFIED'} returned by the startup callback.
 const report=restored?.body;
 if(restored?.schema!=='leeway.gpu.fresh-process-recovery-attestation.v1'||
    !(restored.signature instanceof Uint8Array)||restored.signature.byteLength!==64||
    report?.scope!==LEEWAY_INFERENCE_SCOPE||report?.status!=='PASS'||
    report?.pending!==0||report?.freshProcessReadbackVerified!==true||
    report?.enrollmentReceiptSha256!==readiness.enrollmentReceiptSha256||
    !sha(report?.receiptLedgerReadbackSha256)||!sha(report?.learningLedgerReadbackSha256)||
    !sha(report?.continuumReadbackSha256)||
    !Number.isSafeInteger(report?.expiresAtMs)||
    report.expiresAtMs<=(input.clock?.()??Date.now()))
   fail('LEEWAY_GPU_DURABLE_RESTART_RECOVERY_UNQUALIFIED');
 const crypto=input.crypto??globalThis.crypto;
 const recoveryKey=await crypto.subtle.importKey('spki',input.trust.veritasPublicKeySpki,{name:'Ed25519'},false,['verify']);
 if(!await crypto.subtle.verify('Ed25519',recoveryKey,restored.signature,
     runtime.canonicalGpuSigningBytes(structuredClone(report))))
   fail('LEEWAY_GPU_DURABLE_RESTART_RECOVERY_SIGNATURE_INVALID');
 const inferenceProvider=gpu.createLeeWayGpuInferenceProvider({
  models:input.models,qualification:input.qualification,
  platform:input.platform??process.platform,deviceId:input.deviceId,
  bindingProvider,deviceProvider:input.deviceProvider,
  crypto:input.crypto,clock:input.clock,executeModel:input.executeModel
 });
 const capability=await inferenceProvider.capabilities();
 if(capability?.serviceId!=='leeway.gpu.service'||capability?.gpuVerified!==true||
    capability?.status!=='QUALIFIED_PROVIDER_REQUEST_AUTHORIZATION_REQUIRED'||
    !id(capability?.receiptId))fail('LEEWAY_GPU_INFERENCE_PROVIDER_QUALIFICATION_UNVERIFIED');
 // Nothing here changes the original owner switch, bypasses PRE/POST or supplies
 // missing independently authenticated provider implementations.
 const server=await listenGpuService({
  port:input.port??0,platform:input.platform??process.platform,
  preferenceFile:input.preferenceFile,
  inferenceProvider,authenticateClient:input.authenticateClient
 });
 return Object.freeze({server,scope:LEEWAY_INFERENCE_SCOPE,
  startup:'SIGNED_ENROLLMENT_AND_RESTART_CHECK_PASSED',
  perRequestAuthorization:'REQUIRED',productionExecution:false});
}
