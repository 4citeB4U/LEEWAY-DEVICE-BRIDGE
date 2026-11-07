/*
LEEWAY HEADER — DO NOT REMOVE
REGION: DEVICE.BRIDGE.VOICE.PASSWORDLESS.TEST
TAG: EXPLICIT_APPROVAL_ONLY_AND_SINGLE_USE
WHO: LeeWay Industries; WHAT: test app-bound owner approval and voice session
WHY: passwords and shared app secrets must not be required
WHERE: Device Bridge tests; WHEN: 2026-10-24
HOW: isolated temporary directory, real HMAC signature, fake voice backend
AUTHORITY: fixture approval only, not owner acceptance. LICENSE: MIT.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,scryptSync,createHash} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createVoicePairing,signVoiceOwnerApproval} from '../operator/voice-owner-pairing.mjs';
import {startVoiceAuthGateway} from '../operator/voice-auth-gateway.mjs';
test('owner approval gates a single app-specific, read-only voice session',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'leeway-voice-pairing-'));
 const approvalKey=randomBytes(32),salt=randomBytes(16);
 const passwordHash=scryptSync('sample-owner-password-only-for-fixture',salt,64).toString('hex');
 const pairing=createVoicePairing({root,approvalKey});
 let continuumBytes=Buffer.alloc(0),continuumDigest='';
 const gateway=await startVoiceAuthGateway({port:0,pairing,passwordHash,passwordSalt:salt.toString('hex'),
  fetchImpl:async(url,init)=>{
   const target=String(url);
   if(target==='http://127.0.0.1:8890/api/continuum/content?recordId=continuum-pair-fixture')return {
    ok:true,headers:{get:name=>name==='x-continuum-content-sha256'?continuumDigest:null},
    arrayBuffer:async()=>Buffer.from(continuumBytes)};
   const input=JSON.parse(init.body),text='Creator, Agent Lee here. Voice fixture.';
   const audio=Buffer.from('fixture-wav-audio-bytes');
   const telemetry={type:'transcript.final',source:'LEEWAY_EDGE_RTC',transcriptSource:'LEEWAY_EDGE_GPU_ASR',
    inferenceAuthority:'LEEWAY_EDGE_GPU_ONLY',inferenceRoute:'LEEWAY_EDGE_GPU',storageAuthority:'LEEWAY_CONTINUUM_ONLY',
    result:'RESPONSE_RENDERED',responseHash:createHash('sha256').update(Buffer.from(text,'utf8')).digest('hex'),
    audioHash:createHash('sha256').update(audio).digest('hex'),voicePackageId:'kokoro-bm_lewis',
    capture:{audioRecordId:input.audioRecordId,audioSha256:input.audioSha256,
     captureStartedAt:input.captureStartedAt,captureEndedAt:input.captureEndedAt}};
   continuumBytes=Buffer.from(JSON.stringify({schema:'leeway.machine-consciousness.voice-input-telemetry.v1',identity:'Agent Lee',telemetry}));
   continuumDigest=createHash('sha256').update(continuumBytes).digest('hex');
   return {ok:true,json:async()=>({state:'VERIFIED',type:'transcript.final',requestId:'voice-pair-test-0001',
    response:{text,personaDelivery:{state:'VERIFIED',identity:'Agent Lee'}},continuum:{recordId:'continuum-pair-fixture'},telemetry,
    voice:{voicePackageId:'kokoro-bm_lewis',audioContent:audio.toString('base64'),sampleRate:24000,format:'wav'}})};
  }});
 const base='http://127.0.0.1:'+gateway.port;
 const request=async(route,body,options={})=>{
  const response=await fetch(base+route,{method:'POST',
   headers:{origin:options.origin||'https://4citeb4u.github.io',
    'content-type':'application/json',...(options.cookie?{cookie:options.cookie}:{}),
    ...(options.csrf?{'x-leeway-voice-csrf':options.csrf}:{})},
   body:JSON.stringify(body)});
  return {status:response.status,body:await response.json(),
   cookie:response.headers.get('set-cookie')?.split(';')[0]};
 };
 try{
  assert.equal((await request('/v1/voice/pair/start',{appId:'unregistered.app'})).status,429);
  assert.equal((await request('/v1/voice/pair/start',{appId:'leeway.voice.studio'},
   {origin:'https://attacker.invalid'})).status,403);
  const started=await request('/v1/voice/pair/start',{appId:'leeway.voice.studio'});
  assert.equal(started.status,202);
  const claim={id:started.body.id,token:started.body.token};
  assert.equal((await request('/v1/voice/pair/claim',claim)).status,202);
  assert.equal((await request('/v1/voice/pair/claim',
   {...claim,token:randomBytes(32).toString('hex')})).status,403);
  await signVoiceOwnerApproval({root,approvalKey,id:claim.id});
  const approved=await request('/v1/voice/pair/claim',claim);
  assert.equal(approved.status,200);
  assert.equal(approved.body.authenticated,true);
  assert.equal(approved.body.appId,'leeway.voice.studio');
  assert.equal(approved.body.scope,'voice:turn:readonly');
  assert.equal((await request('/v1/voice/pair/claim',claim)).status,403);
  const turn={schema:'leeway.voice.turn.v1',source:'LEEWAY_EDGE_RTC',transcriptSource:'LEEWAY_EDGE_GPU_ASR',
   inferenceRoute:'LEEWAY_EDGE_GPU',inferenceAuthority:'LEEWAY_EDGE_GPU_ONLY',storageAuthority:'LEEWAY_CONTINUUM_ONLY',
   ownerDeviceId:'owner-device-test',segmentId:'pair-segment-001',audioRecordId:'audio-record-pair',
   audioSha256:'f'.repeat(64),captureStartedAt:'2026-11-07T11:00:00.000Z',captureEndedAt:'2026-11-07T11:00:02.000Z',
   final:true,text:'Hello Agent Lee',allowDeviceActions:false};
  assert.equal((await request('/v1/voice/turn',turn,{cookie:approved.cookie})).status,403);
  const reply=await request('/v1/voice/turn',turn,{
   cookie:approved.cookie,csrf:approved.body.csrfToken});
  assert.equal(reply.status,200);
  assert.equal(reply.body.source,'LEEWAY_MACHINE_CONSCIOUSNESS');
  assert.equal(reply.body.verified,true);
  assert.equal((await request('/v1/voice/turn',{...turn,allowDeviceActions:true},{
   cookie:approved.cookie,csrf:approved.body.csrfToken})).status,422);
 }finally{
  await new Promise(resolve=>gateway.server.close(resolve));
  await rm(root,{recursive:true,force:true});
 }
});
