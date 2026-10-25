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
import {randomBytes,scryptSync} from 'node:crypto';
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
 const gateway=await startVoiceAuthGateway({port:0,pairing,passwordHash,passwordSalt:salt.toString('hex'),
  fetchImpl:async()=>({ok:true,json:async()=>({
   source:'OLLAMA_QWEN35_4B',status:'GENERATED_NOT_VERITAS_VERIFIED',
   gpuInferenceVerified:false,text:'Voice fixture',results:[],
  })})});
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
  const turn={schema:'leeway.voice.turn.v1',mode:'llm',final:true,text:'Hello Agent Lee',allowDeviceActions:false};
  assert.equal((await request('/v1/voice/turn',turn,{cookie:approved.cookie})).status,403);
  const reply=await request('/v1/voice/turn',turn,{
   cookie:approved.cookie,csrf:approved.body.csrfToken});
  assert.equal(reply.status,200);
  assert.equal(reply.body.source,'OLLAMA_QWEN35_4B');
  assert.equal(reply.body.verified,false);
  assert.equal((await request('/v1/voice/turn',{...turn,allowDeviceActions:true},{
   cookie:approved.cookie,csrf:approved.body.csrfToken})).status,422);
 }finally{
  await new Promise(resolve=>gateway.server.close(resolve));
  await rm(root,{recursive:true,force:true});
 }
});
