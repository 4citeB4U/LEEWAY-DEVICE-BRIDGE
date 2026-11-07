/*
LEEWAY HEADER — DO NOT REMOVE
REGION: DEVICE.BRIDGE.VOICE.AUTH.TEST
TAG: AUTH_SESSION_CSRF_AND_READ_ONLY_UPSTREAM
WHO: LeeWay Industries; WHAT: local voice gateway contract tests
WHY: reject unauthenticated and forged browser traffic
WHERE: tests; WHEN: 2026-10-24
HOW: test fixture-only backend; no real model, GPU or external TLS.
AUTHORITY: offline test. LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,scryptSync,createHash} from 'node:crypto';
import {createVoiceAuthGateway,startVoiceAuthGateway} from '../operator/voice-auth-gateway.mjs';
const salt=randomBytes(16).toString('hex');
const hash=scryptSync('this-is-an-owner-only-test-passphrase',Buffer.from(salt,'hex'),64).toString('hex');
test('voice authentication is login, CSRF and origin bound',async()=>{
 const executed=[];
 const env=await startVoiceAuthGateway({port:0,passwordSalt:salt,passwordHash:hash,
  fetchImpl:async(url,init)=>{
   executed.push({url,init});
   const input=init?.body?JSON.parse(init.body):null;
   return {ok:true,json:async()=>input?.type==='speech.interrupt'?{
    state:'VERIFIED',type:'speech.interrupt',interruptionEpoch:1,continuum:{recordId:'continuum-interrupt-fixture'}
   }:{
    state:'VERIFIED',type:'transcript.final',requestId:'voice-test-request-0001',
    response:{text:'Creator, Agent Lee here. Voice fixture response.',personaDelivery:{state:'VERIFIED',identity:'Agent Lee'}},
    continuum:{recordId:'continuum-fixture-record'},telemetry:{result:'RESPONSE_RENDERED',
     transcriptSource:'LEEWAY_EDGE_GPU_ASR',inferenceRoute:'LEEWAY_EDGE_GPU',
     capture:{audioRecordId:'audio-record-test',audioSha256:'a'.repeat(64)}},
    voice:{voicePackageId:'kokoro-bm_lewis',audioContent:'UklGRg==',sampleRate:24000,format:'wav'}
   }};
  }});
 const origin='http://127.0.0.1:'+env.port;
 const req=async(route,{method='GET',data,cookie,csrf,front='https://4citeb4u.github.io'}={})=>{
  const headers={origin:front};
  if(data){headers['content-type']='application/json'}
  if(cookie){headers.cookie=cookie}
  if(csrf){headers['x-leeway-voice-csrf']=csrf}
  const r=await fetch(origin+route,{method,headers,body:data?JSON.stringify(data):undefined});
  const value=await r.json();
  return {code:r.status,body:value,cookie:r.headers.get('set-cookie')};
 };
 try{
  assert.equal((await req('/v1/voice/session')).code,401);
  assert.equal((await req('/v1/voice/login',{method:'POST',data:{
   password:'this-is-an-owner-only-test-passphrase'},front:'https://evil.example'})).code,403);
  assert.equal((await req('/v1/voice/login',{method:'POST',data:{
   password:'a-completely-wrong-passphrase'}})).code,401);
  const login=await req('/v1/voice/login',{method:'POST',data:{
   password:'this-is-an-owner-only-test-passphrase'}});
  assert.equal(login.code,200);
  assert.match(login.cookie,/HttpOnly; Secure; SameSite=None/);
  assert.ok(!JSON.stringify(login.body).includes('this-is-an-owner-only-test'));
  const cookie=login.cookie.split(';')[0],csrf=login.body.csrfToken;
  assert.equal((await req('/v1/voice/session',{cookie})).body.authenticated,true);
  const body={schema:'leeway.voice.turn.v1',source:'LEEWAY_EDGE_RTC',transcriptSource:'LEEWAY_EDGE_GPU_ASR',
   inferenceRoute:'LEEWAY_EDGE_GPU',inferenceAuthority:'LEEWAY_EDGE_GPU_ONLY',storageAuthority:'LEEWAY_CONTINUUM_ONLY',
   ownerDeviceId:'owner-device-test',segmentId:'segment-test-0001',audioRecordId:'audio-record-test',
   audioSha256:'a'.repeat(64),captureStartedAt:'2026-11-07T11:00:00.000Z',captureEndedAt:'2026-11-07T11:00:02.000Z',
   text:'Hello Agent Lee',final:true,allowDeviceActions:false};
  assert.equal((await req('/v1/voice/turn',{method:'POST',data:body,cookie})).code,403);
  assert.equal((await req('/v1/voice/turn',{method:'POST',data:{
   ...body,allowDeviceActions:true},cookie,csrf})).code,422);
  assert.equal((await req('/v1/voice/turn',{method:'POST',data:{
   ...body,transcriptSource:'BROWSER_SPEECH_RECOGNITION'},cookie,csrf})).code,422);
  assert.equal(executed.length,0);
  const result=await req('/v1/voice/turn',{method:'POST',data:body,cookie,csrf});
  assert.equal(result.code,200);
  assert.equal(result.body.source,'LEEWAY_MACHINE_CONSCIOUSNESS');
  assert.equal(result.body.identity,'Agent Lee');
  assert.equal(result.body.verified,true);
  assert.equal(result.body.veritasStatus,'NOT_ASSERTED');
  assert.equal(executed.length,1);
  assert.equal(String(executed[0].url),'http://127.0.0.1:8890/voice/input');
  assert.equal(JSON.parse(executed[0].init.body).type,'transcript.final');
  assert.equal(JSON.parse(executed[0].init.body).transcriptSource,'LEEWAY_EDGE_GPU_ASR');
  const interrupt={schema:'leeway.voice.interrupt.v1',source:'LEEWAY_EDGE_RTC',transcriptSource:'LEEWAY_EDGE_GPU_ASR',
   inferenceRoute:'LEEWAY_EDGE_GPU',inferenceAuthority:'LEEWAY_EDGE_GPU_ONLY',storageAuthority:'LEEWAY_CONTINUUM_ONLY',
   ownerDeviceId:'owner-device-test',segmentId:'interrupt-segment-01'};
  assert.equal((await req('/v1/voice/interrupt',{method:'POST',data:interrupt,cookie,csrf})).body.staleOutputGuard,'EPOCH_ADVANCED');
  assert.equal(String(executed[1].url),'http://127.0.0.1:8890/voice/input');
  assert.equal(JSON.parse(executed[1].init.body).type,'speech.interrupt');
  const health=await (await fetch(origin+'/health')).json();
  assert.equal(health.productionConversationQualified,true);
  console.log('VOICE_SESSION_AND_READONLY_TURN_PASS');
 }finally{await new Promise(resolve=>env.server.close(resolve))}
});
test('health restores production conversation proof from a hash-verified Continuum record',async()=>{
 const sourceCommit='b'.repeat(40);
 const persisted=JSON.stringify({schema:'leeway.machine-consciousness.voice-input-telemetry.v1',identity:'Agent Lee',
  telemetry:{type:'transcript.final',source:'LEEWAY_EDGE_RTC',transcriptSource:'LEEWAY_EDGE_GPU_ASR',
   inferenceRoute:'LEEWAY_EDGE_GPU',inferenceAuthority:'LEEWAY_EDGE_GPU_ONLY',storageAuthority:'LEEWAY_CONTINUUM_ONLY',
   result:'RESPONSE_RENDERED',audioHash:'c'.repeat(64),voicePackageId:'kokoro-bm_lewis',responseHash:'d'.repeat(64),
   ownerDeviceId:'owner-device',capture:{audioRecordId:'audio-record-1',audioSha256:'e'.repeat(64),
    captureStartedAt:'2026-11-07T10:00:00.000Z',captureEndedAt:'2026-11-07T10:00:02.000Z'}}});
 const digest=createHash('sha256').update(persisted).digest('hex');
 const env=await startVoiceAuthGateway({port:0,passwordSalt:salt,passwordHash:hash,sourceCommit,
  fetchImpl:async(url)=>{
   const target=String(url);
   if(target==='http://127.0.0.1:8890/health')return {ok:true,json:async()=>({identity:'LEEWAY_MACHINE_CONSCIOUSNESS',voice:{ready:true}})};
   if(target==='http://127.0.0.1:8890/voice/binding')return {ok:true,json:async()=>({voiceBinding:{authority:'LEEWAY_VOICE_FABRIC',agentId:'agent-lee',productionAdmitted:true,qualificationOnly:false}})};
   if(target==='http://127.0.0.1:8890/voice/telemetry')return {ok:true,json:async()=>({gateway:{identity:'Agent Lee',inferenceAuthority:'LEEWAY_EDGE_GPU_ONLY',storageAuthority:'LEEWAY_CONTINUUM_ONLY'}})};
   if(target.startsWith('http://127.0.0.1:8890/api/continuum/search'))return {ok:true,json:async()=>({ok:true,result:{hits:[{recordId:'continuum-production-proof',contentSha256:digest}]}})};
   if(target==='http://127.0.0.1:8890/api/continuum/content?recordId=continuum-production-proof')return {ok:true,text:async()=>persisted};
   throw Error('Unexpected health probe '+target);
  }});
 try{
  const value=await (await fetch('http://127.0.0.1:'+env.port+'/health')).json();
  assert.equal(value.productionConversationQualified,true);
  assert.equal(value.productionConversationEvidence,'CONTINUUM_READBACK_AUTHENTICATED_GPU_ASR_AGENT_LEE_TURN');
 }finally{await new Promise(resolve=>env.server.close(resolve))}
});
test('gateway needs operator secret material and rejects public binding',async()=>{
 assert.throws(()=>startVoiceAuthGateway({port:0}),/HASH_AND_SALT_REQUIRED/);
 assert.throws(()=>startVoiceAuthGateway({port:0,host:'0.0.0.0',
  passwordHash:hash,passwordSalt:salt}),/VOICE_HTTPS_PROXY_REQUIRED/);
});
test('health reports the exact running source commit for lifecycle reconciliation',async()=>{
 const sourceCommit='a'.repeat(40);
 const env=await startVoiceAuthGateway({port:0,passwordSalt:salt,passwordHash:hash,sourceCommit,
  fetchImpl:async(url)=>{
   if(String(url)==='http://127.0.0.1:8890/health')return {ok:true,status:200,json:async()=>({identity:'LEEWAY_MACHINE_CONSCIOUSNESS',voice:{ready:true}})};
   if(String(url)==='http://127.0.0.1:8890/voice/binding')return {ok:true,status:200,json:async()=>({voiceBinding:{authority:'LEEWAY_VOICE_FABRIC',agentId:'agent-lee',productionAdmitted:true,qualificationOnly:false}})};
   if(String(url)==='http://127.0.0.1:8890/voice/telemetry')return {ok:true,status:200,json:async()=>({gateway:{identity:'Agent Lee',inferenceAuthority:'LEEWAY_EDGE_GPU_ONLY',storageAuthority:'LEEWAY_CONTINUUM_ONLY'}})};
   throw Error('Unexpected health probe '+url);
  }});
 try{
  const response=await fetch('http://127.0.0.1:'+env.port+'/health');
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{ready:true,authority:'LEEWAY_DEVICE_BRIDGE_VOICE',
   internetPublished:false,upstreamQualified:true,
   upstreamQualificationScope:'OWNER_LOCAL_MACHINE_CONSCIOUSNESS_AND_VOICE_BINDING_READINESS',
   upstreamProbe:'READ_ONLY_PRODUCTION_CARRIER_BINDING_CHECK_PASS',productionConversationQualified:false,
   productionConversationEvidence:'AUTHENTICATED_PRODUCTION_TURN_NOT_YET_OBSERVED',c3Qualified:false,
   c3Evidence:'LIVE_DUPLEX_VERITAS_AND_RECEIPT_ADMISSION_NOT_YET_OBSERVED',sourceCommit});
  assert.throws(()=>createVoiceAuthGateway({passwordSalt:salt,passwordHash:hash,sourceCommit:'not-a-commit'}),
   /VOICE_SOURCE_COMMIT_INVALID/);
 }finally{await new Promise(resolve=>env.server.close(resolve))}
});
test('health keeps upstream unqualified when the route or carrier check fails',async()=>{
 const env=await startVoiceAuthGateway({port:0,passwordSalt:salt,passwordHash:hash,
  fetchImpl:async(url)=>String(url)==='http://127.0.0.1:8890/health'?
   {ok:false,status:503,json:async()=>({error:'UNAVAILABLE'})}:
   {ok:true,status:200,json:async()=>({})}});
 try{
  const value=await (await fetch('http://127.0.0.1:'+env.port+'/health')).json();
  assert.equal(value.upstreamQualified,false);
  assert.equal(value.upstreamProbe,'PRODUCTION_CARRIER_BINDING_MISMATCH');
  assert.equal(value.productionConversationQualified,false);
  assert.equal(value.c3Qualified,false);
 }finally{await new Promise(resolve=>env.server.close(resolve))}
});
