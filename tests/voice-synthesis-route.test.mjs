/* LEEWAY HEADER — DO NOT REMOVE
REGION: DEVICE.BRIDGE.VOICE.SYNTHESIS.TEST
TAG: AUTHENTICATED_CANONICAL_VOICE_FABRIC_ROUTE
WHO: LeeWay Industries; WHAT: identity-bound Voice Fabric synthesis regression.
WHY: prevent unauthorized or cross-agent audio; WHERE: Device Bridge tests.
WHEN: 2026-11-07; HOW: fixture-backed loopback gateway.
AUTHORITY: isolated test only; LICENSE: MIT. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,scryptSync} from 'node:crypto';
import {startVoiceAuthGateway} from '../operator/voice-auth-gateway.mjs';

const makeAuth=()=>{
 const salt=randomBytes(16).toString('hex'),pass='fixture-passphrase-for-testing';
 return {salt,pass,passwordHash:scryptSync(pass,Buffer.from(salt,'hex'),64).toString('hex')};
};
const admittedBinding={schema:'leeway-agent-voice-binding/v1.1',agentId:'agent-lee',
 authority:'LEEWAY_VOICE_FABRIC',voicePackageId:'kokoro-bm_lewis',provider:'kokoro',voiceId:'bm_lewis',
 selectionRevision:'a'.repeat(64),qualificationOnly:false,productionAdmitted:true};
const carrierHealth={identity:'LEEWAY_MACHINE_CONSCIOUSNESS',voice:{ready:true}};
const wav=Buffer.concat([Buffer.from('524946462400000057415645666d74201000000001000100401f0000803e0000020010006461746100000000','hex')]).toString('base64');
const response=(value,status=200)=>({ok:status>=200&&status<300,status,
 headers:{get:()=>null},json:async()=>value,text:async()=>JSON.stringify(value)});
const renderResult={voiceAuthority:'LEEWAY_VOICE_FABRIC',agentId:'agent-lee',voicePackageId:'kokoro-bm_lewis',
 selectionRevision:admittedBinding.selectionRevision,productionAdmitted:true,qualificationOnly:false,
 format:'wav',sampleRate:24000,audioContent:wav,state:'SYNTHESIZED_NOT_PLAYBACK_VERIFIED'};

test('Voice Fabric status and synthesis require owner session, CSRF, admitted identity and selected binding',async()=>{
 const {salt,pass,passwordHash}=makeAuth(),calls=[];
 const gateway=await startVoiceAuthGateway({port:0,passwordSalt:salt,passwordHash,fetchImpl:async(url,options={})=>{
  calls.push({url:String(url),method:options.method||'GET',body:options.body});
  if(String(url)==='http://127.0.0.1:8890/health')return response(carrierHealth);
  if(String(url)==='http://127.0.0.1:8890/voice/binding')return response({voiceBinding:admittedBinding});
  if(String(url)==='http://127.0.0.1:8890/render-voice')return response(renderResult);
  throw Error('Unexpected upstream '+url);
 }});
 const base='http://127.0.0.1:'+gateway.port,origin='https://4citeb4u.github.io';
 const request=(path,payload,extra={})=>fetch(base+path,{method:payload?'POST':'GET',headers:{origin,...(payload?{'content-type':'application/json'}:{}),...extra},...(payload?{body:JSON.stringify(payload)}:{})});
 const body={schema:'leeway.voice.synthesize.v1',agentId:'agent-lee',voicePackageId:'kokoro-bm_lewis',text:'Hello'};
 try{
  assert.equal((await request('/v1/voice/synthesize',body)).status,401);
  const login=await request('/v1/voice/login',{password:pass});
  assert.equal(login.status,200);
  const csrf=(await login.json()).csrfToken,cookie=login.headers.get('set-cookie').split(';')[0];
  const auth={cookie,'x-leeway-voice-csrf':csrf};
  assert.equal((await request('/v1/voice/synthesize',body,{cookie})).status,403);
  assert.equal((await request('/v1/voice/synthesize',{...body,voicePackageId:'../evil'},auth)).status,422);
  assert.equal((await request('/v1/voice/synthesize',{...body,agentId:'codex'},auth)).status,422);
  const wrongVoice=await request('/v1/voice/synthesize',{...body,voicePackageId:'kokoro-af_heart'},auth);
  assert.equal(wrongVoice.status,409);assert.equal((await wrongVoice.json()).error,'VOICE_SELECTION_MISMATCH');
  const status=await request('/v1/voice/synthesis-status',null,{cookie});
  assert.equal(status.status,200);
  assert.deepEqual(await status.json(),{schema:'leeway.voice.synthesis-status.v1',ready:true,
   authority:'LEEWAY_VOICE_FABRIC',agentId:'agent-lee',voicePackageId:'kokoro-bm_lewis',
   provider:'kokoro',voiceId:'bm_lewis',selectionRevision:admittedBinding.selectionRevision,playbackVerified:false});
  const good=await request('/v1/voice/synthesize',body,auth);
  assert.equal(good.status,200);
  const output=await good.json();
  assert.equal(output.schema,'leeway.voice.synthesis-result.v1');
  assert.equal(output.agentId,'agent-lee');assert.equal(output.playbackVerified,false);
  assert.deepEqual(calls.filter(x=>x.url.endsWith('/render-voice')).map(x=>JSON.parse(x.body)),[{text:'Hello'}]);
  assert.ok(calls.every(x=>!x.url.includes(':8877')));
 }finally{await new Promise(resolve=>gateway.server.close(resolve));}
});

test('Voice Fabric rejects unqualified bindings and mismatched renderer identity',async()=>{
 const {salt,pass,passwordHash}=makeAuth();let renderCalls=0;
 const gateway=await startVoiceAuthGateway({port:0,passwordSalt:salt,passwordHash,fetchImpl:async(url)=>{
  if(String(url)==='http://127.0.0.1:8890/health')return response(carrierHealth);
  if(String(url)==='http://127.0.0.1:8890/voice/binding')return response({voiceBinding:{...admittedBinding,productionAdmitted:false}});
  if(String(url)==='http://127.0.0.1:8890/render-voice'){renderCalls++;return response({...renderResult,agentId:'codex'});}
  throw Error('Unexpected upstream '+url);
 }});
 const base='http://127.0.0.1:'+gateway.port,origin='https://4citeb4u.github.io';
 const request=(path,payload,extra={})=>fetch(base+path,{method:payload?'POST':'GET',headers:{origin,...(payload?{'content-type':'application/json'}:{}),...extra},...(payload?{body:JSON.stringify(payload)}:{})});
 try{
  const login=await request('/v1/voice/login',{password:pass}),csrf=(await login.json()).csrfToken,cookie=login.headers.get('set-cookie').split(';')[0];
  const auth={cookie,'x-leeway-voice-csrf':csrf};
  const status=await request('/v1/voice/synthesis-status',null,{cookie});
  assert.equal(status.status,503);assert.equal((await status.json()).error,'LEEWAY_VOICE_BINDING_UNQUALIFIED');
  const blocked=await request('/v1/voice/synthesize',{schema:'leeway.voice.synthesize.v1',agentId:'agent-lee',voicePackageId:'kokoro-bm_lewis',text:'Hello'},auth);
  assert.equal(blocked.status,503);assert.equal((await blocked.json()).error,'LEEWAY_VOICE_BINDING_UNQUALIFIED');
  assert.equal(renderCalls,0);
 }finally{await new Promise(resolve=>gateway.server.close(resolve));}
});
