/*
LEEWAY HEADER — DO NOT REMOVE
REGION: DEVICE.BRIDGE.VOICE.C3.QUALIFICATION
TAG: READ_ONLY_GATEWAY_AND_CONTINUUM_PROOF_READBACK
WHO: LeeWay Industries; WHAT: inspect current C3 production admission state
WHY: prevent local audio demos from being reported as full C3 qualification
WHERE: Device Bridge operator; WHEN: 2026-11-07
HOW: read-only loopback Gateway and Machine Consciousness probes
AUTHORITY: no microphone, turn, playback, or interruption is initiated here.
LICENSE: MIT
*/
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const DEFAULT_GATEWAY='http://127.0.0.1:5332';
const DEFAULT_CARRIER='http://127.0.0.1:8890';
const APP_ORIGIN='https://4citeb4u.github.io';
const CALIBRATION_TITLE='owner-device-voice-runtime-v4-20261105.veritas-correction.json';
const CALIBRATION_ID='owner-device-voice-runtime-v4-20261105';

function loopbackOrigin(value,name){
 const url=new URL(value);
 if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||
  url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error(name+'_MUST_BE_LOOPBACK_HTTP_ORIGIN');
 return url.origin;
}
async function readJson(url,{origin,timeoutMs=4000}={}){
 const response=await fetch(url,{headers:origin?{origin}:undefined,signal:AbortSignal.timeout(timeoutMs),redirect:'error'});
 let body=null;try{body=await response.json()}catch{}
 return {status:response.status,body};
}
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

export function classifyHistoricalVoiceCalibration({document,digestMatches,receiptId}){
 const checks=document?.checks;
 const verified=digestMatches===true&&document?.schema==='leeway.machine-consciousness.owner-voice-formula-veritas.v1'&&
  document?.calibrationId===CALIBRATION_ID&&document?.status==='PASS_SHADOW_NOT_PROMOTED'&&
  checks?.sixteenBundles===true&&checks?.continuumReadbacks===true&&checks?.formulaRecalculation===true&&
  checks?.productionAccepted===false&&checks?.liveSpeechPolicyChanged===false&&typeof receiptId==='string'&&receiptId.length>0;
 return {state:verified?'VERIFIED_SHADOW_PASS':'UNVERIFIED',calibrationId:document?.calibrationId||null,
  runId:document?.runId||null,recordId:document?.recordId||null,receiptId:receiptId||null,
  segments:verified?16:null,productionAccepted:verified?false:null,
  transcriptSource:'OWNER_DECLARED_PROMPT',scope:'OWNER_VOICE_CALIBRATION_AND_FORMULA_SHADOW_ONLY'};
}

async function readHistoricalVoiceCalibration(carrierOrigin){
 const query=new URL('/api/continuum/search',carrierOrigin);query.searchParams.set('query',CALIBRATION_TITLE);query.searchParams.set('limit','10');
 const search=await fetch(query,{headers:{origin:carrierOrigin},signal:AbortSignal.timeout(5000),redirect:'error'});
 const index=await search.json().catch(()=>null);
 if(!search.ok||index?.ok!==true)return {state:'UNAVAILABLE',scope:'OWNER_VOICE_CALIBRATION_AND_FORMULA_SHADOW_ONLY'};
 const item=index?.result?.hits?.find(hit=>hit.title===CALIBRATION_TITLE&&hit.recordId&&/^[a-f0-9]{64}$/i.test(hit.contentSha256||''));
 if(!item)return {state:'NOT_FOUND',scope:'OWNER_VOICE_CALIBRATION_AND_FORMULA_SHADOW_ONLY'};
 const response=await fetch(new URL('/api/continuum/content?recordId='+encodeURIComponent(item.recordId),carrierOrigin),
  {headers:{origin:carrierOrigin},signal:AbortSignal.timeout(5000),redirect:'error'});
 if(!response.ok)return {state:'READBACK_FAILED',recordId:item.recordId,receiptId:item.receiptId||null,
  scope:'OWNER_VOICE_CALIBRATION_AND_FORMULA_SHADOW_ONLY'};
 const bytes=Buffer.from(await response.arrayBuffer()),digest=sha256(bytes);
 let document=null;try{document=JSON.parse(bytes.toString('utf8'))}catch{}
 const verified=digest.toLowerCase()===item.contentSha256.toLowerCase()&&
  response.headers.get('x-continuum-content-sha256')?.toLowerCase()===digest.toLowerCase();
 return {...classifyHistoricalVoiceCalibration({document,digestMatches:verified,receiptId:item.receiptId}),
  recordId:item.recordId,contentSha256:digest};
}

export function assessC3Readiness({gateway,carrier,sessionStatus}){
 const health=gateway?.body;
 const voice=carrier?.health?.body?.voice;
 const gpu=carrier?.health?.body?.sources?.gpu;
 const binding=carrier?.binding?.body?.voiceBinding;
 const telemetry=carrier?.telemetry?.body?.gateway;
 const stages={
  gateway:gateway?.status===200&&health?.ready===true&&health?.authority==='LEEWAY_DEVICE_BRIDGE_VOICE'?'PASS':'BLOCKED',
  authenticatedSession:sessionStatus===200?'PASS':sessionStatus===401?'OWNER_APPROVAL_REQUIRED':'BLOCKED',
  voiceProvider:voice?.ready===true?'PASS':'BLOCKED',
  productionVoiceBinding:binding?.authority==='LEEWAY_VOICE_FABRIC'&&binding?.productionAdmitted===true&&binding?.qualificationOnly===false?'PASS':'BLOCKED',
  leewayGpuInference:gpu?.provider==='LEEWAY_EDGE_GPU_GATEWAY'&&gpu?.productionReady===true&&gpu?.dispatchAllowed===true?'PASS':'BLOCKED',
  governedAgentTelemetry:telemetry?.identity==='Agent Lee'&&telemetry?.inferenceAuthority==='LEEWAY_EDGE_GPU_ONLY'&&
   telemetry?.storageAuthority==='LEEWAY_CONTINUUM_ONLY'?'PASS':'BLOCKED',
  upstreamQualification:health?.upstreamQualified===true?'PASS':'BLOCKED',
 };
 const readyForLiveRun=Object.values(stages).every(value=>value==='PASS');
 const postRunGates={
  productionConversation:health?.productionConversationQualified===true&&
   health?.productionConversationEvidence==='CONTINUUM_READBACK_AUTHENTICATED_GPU_ASR_AGENT_LEE_TURN'?'PASS':'NOT_YET_OBSERVED',
  continuumC3Admission:health?.c3Qualified===true&&
   health?.c3Evidence==='CONTINUUM_HASH_VERIFIED_C3_DUPLEX_VERITAS_RECEIPT_ADMISSION'?'PASS':'NOT_YET_OBSERVED',
 };
 return {schema:'leeway.device-bridge.c3-preflight.v1',mode:'READ_ONLY_PREFLIGHT',
  readiness:readyForLiveRun?'READY_FOR_LIVE_C3_RUN':'BLOCKED',
  qualification:'NOT_EXECUTED',liveRunAllowed:readyForLiveRun,fullC3Executed:false,stages,postRunGates,
  observed:{gatewayEvidence:health?.c3Evidence||null,upstreamProbe:health?.upstreamProbe||null,
   voiceState:voice?.state||null,gpuState:gpu?.state||null,gpuReason:gpu?.reason||null,
   voiceBindingAuthority:binding?.authority||null,voicePackageId:binding?.voicePackageId||null,
   telemetryIdentity:telemetry?.identity||null, inferenceAuthority:telemetry?.inferenceAuthority||null,
   storageAuthority:telemetry?.storageAuthority||null,sessionHttpStatus:sessionStatus??null},
  limits:['This preflight never qualifies C3; it does not activate the microphone or send a conversation turn.',
   'C3 PASS is accepted only when the Gateway reads back a hash-verified Continuum record with all live gates, independent Veritas PASS, and an admitted receipt chain.']};
}

export async function runC3Preflight({gatewayOrigin=process.env.LEEWAY_VOICE_GATEWAY_ORIGIN||DEFAULT_GATEWAY,
 carrierOrigin=process.env.LEEWAY_MACHINE_CONSCIOUSNESS_ORIGIN||DEFAULT_CARRIER}={}){
 const gateway=loopbackOrigin(gatewayOrigin,'LEEWAY_VOICE_GATEWAY_ORIGIN');
 const carrierBase=loopbackOrigin(carrierOrigin,'LEEWAY_MACHINE_CONSCIOUSNESS_ORIGIN');
 const [gatewayHealth,capabilities,session,carrierHealth,binding,telemetry,historicalVoiceCalibration]=await Promise.all([
  readJson(gateway+'/health'),
  readJson(gateway+'/v1/voice/capabilities',{origin:APP_ORIGIN}),
  readJson(gateway+'/v1/voice/session',{origin:APP_ORIGIN}),
  readJson(carrierBase+'/health'),
  readJson(carrierBase+'/voice/binding'),
  readJson(carrierBase+'/voice/telemetry'),
  readHistoricalVoiceCalibration(carrierBase).catch(()=>({state:'UNAVAILABLE',scope:'OWNER_VOICE_CALIBRATION_AND_FORMULA_SHADOW_ONLY'})),
 ]);
 const report=assessC3Readiness({gateway:gatewayHealth,carrier:{health:carrierHealth,binding,telemetry},sessionStatus:session.status});
 report.observed.gatewayHttpStatus=gatewayHealth.status;
 report.observed.capabilitiesHttpStatus=capabilities.status;
 report.observed.sessionAuthority=capabilities.body?.authorization||null;
 report.observed.carrierIdentity=carrierHealth.body?.identity||null;
 report.observed.telemetryIdentity=telemetry.body?.gateway?.identity||null;
 report.historicalEvidence={ownerVoiceCalibration:historicalVoiceCalibration};
 return report;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const report=await runC3Preflight();
  console.log(JSON.stringify(report,null,2));
  if(report.liveRunAllowed!==true)process.exitCode=2;
 }catch(error){
  console.error(JSON.stringify({schema:'leeway.device-bridge.c3-preflight.v1',qualification:'BLOCKED',
   fullC3Executed:false,error:error instanceof Error?error.message:'PREFLIGHT_FAILED'},null,2));
  process.exitCode=2;
 }
}
