/*
LEEWAY HEADER — DO NOT REMOVE
REGION: DEVICE.BRIDGE.VOICE.DISCOVERY.TEST
TAG: DEVICE.BRIDGE.VOICE.READONLY.DISCOVERY.TEST
5WH:
WHAT = Validate authenticated voice status and sanitized voice catalog GET routes.
WHY = Refuse fabricated availability and private upstream data leakage.
WHO = LeeWay Industries; governed source test.
WHERE = tests/voice-get-discovery.test.mjs
WHEN = 2026-11-05
HOW = Local HTTP gateway with fixed in-memory upstream responses.
AUTHORIZED_ROLES: Test only; no production admission.
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import {scryptSync} from 'node:crypto';
import {startVoiceAuthGateway} from '../operator/voice-auth-gateway.mjs';
const origin='https://4citeb4u.github.io';
const pass='fixture-voice-password-not-real';
const salt='09'.repeat(16),passwordHash=scryptSync(pass,Buffer.from(salt,'hex'),64).toString('hex');
const json=(v,contentType='application/json')=>new Response(JSON.stringify(v),{headers:{'content-type':contentType}});
async function fixture(t,upstream){
 const g=await startVoiceAuthGateway({port:0,passwordHash,passwordSalt:salt,fetchImpl:upstream});
 t.after(()=>new Promise(resolve=>g.server.close(resolve)));
 const req=(route,opts={})=>fetch('http://127.0.0.1:'+g.port+route,{...opts,headers:{origin,...opts.headers}});
 const login=await req('/v1/voice/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:pass})});
 assert.equal(login.status,200);
 return {req,cookie:login.headers.get('set-cookie').split(';')[0]};
}
test('GET discovery requires session and approved origin',async t=>{
 let calls=0;
 const {req,cookie}=await fixture(t,async()=>{calls++;throw Error('SHOULD_NOT_READ')});
 assert.equal((await req('/v1/voice/status')).status,401);
 assert.equal((await req('/v1/voice/voices')).status,401);
 assert.equal((await req('/v1/voice/status',{headers:{cookie,origin:'https://bad.example'}})).status,403);
 assert.equal((await req('/v1/voice/status',{method:'POST',headers:{cookie}})).status,405);
 assert.equal(calls,0);
});
test('status uses only fixed voice studio observation and never claims production verification',async t=>{
 const calls=[];
 const {req,cookie}=await fixture(t,async(url,opt)=>{
  calls.push([String(url),opt.method,opt.redirect]);
  return json({kokoro:{ready:true,secret:'PRIVATE'},xtts:{ready:false},privateToken:'PRIVATE'});
 });
 const r=await req('/v1/voice/status',{headers:{cookie}}),x=await r.json();
 assert.equal(r.status,200);
 assert.deepEqual(x.providerReportedReady,{kokoro:true,xtts:false});
 assert.equal(x.productionExecutionQualified,false);
 assert.equal(x.physicalPlaybackVerified,false);
 assert.equal(x.deviceExecutionAuthorized,false);
 assert.equal(JSON.stringify(x).includes('PRIVATE'),false);
 assert.deepEqual(calls,[['http://127.0.0.1:8877/api/local/status','GET','error']]);
});
test('GET voice catalog sanitizes fields and refuses unqualified voice IDs',async t=>{
 let items=[{id:'kokoro-af_heart',voiceId:'af_heart',name:'Heart',provider:'kokoro',token:'PRIVATE'}];
 const calls=[];
 const {req,cookie}=await fixture(t,async url=>{
  calls.push(String(url));return json({voices:items,token:'PRIVATE'});
 });
 const r=await req('/v1/voice/voices',{headers:{cookie}}),x=await r.json();
 assert.equal(r.status,200);
 assert.equal(x.qualification,'CATALOG_ONLY');
 assert.deepEqual(x.voices,[{id:'kokoro-af_heart',voiceId:'af_heart',name:'Heart',provider:'kokoro',packageType:'MODEL_VOICE'}]);
 assert.equal(JSON.stringify(x).includes('PRIVATE'),false);
 assert.deepEqual(calls,['http://127.0.0.1:8877/api/local/voices']);
 items=[{id:'ios-system-voice',voiceId:'af_heart',name:'System',provider:'ios'}];
 const bad=await req('/v1/voice/voices',{headers:{cookie}});
 assert.equal(bad.status,503);
 assert.equal((await bad.json()).error,'VOICE_CATALOG_INVALID');
});
test('GET status fails closed on absent, HTML, and oversized upstream responses',async t=>{
 let mode='unavailable';
 const {req,cookie}=await fixture(t,async()=>{
  if(mode==='unavailable')throw Error('private failure');
  if(mode==='html')return json({kokoro:{ready:true}},'text/html');
  return new Response(' '.repeat(17000),{headers:{'content-type':'application/json'}});
 });
 for(const s of ['unavailable','html','large']){
  mode=s;
  const r=await req('/v1/voice/status',{headers:{cookie}});
  assert.equal(r.status,503);
  assert.equal((await r.json()).error,'VOICE_LOCAL_STATUS_UNAVAILABLE');
 }
});
