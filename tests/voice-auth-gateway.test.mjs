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
import {randomBytes,scryptSync} from 'node:crypto';
import {startVoiceAuthGateway} from '../operator/voice-auth-gateway.mjs';
const salt=randomBytes(16).toString('hex');
const hash=scryptSync('this-is-an-owner-only-test-passphrase',Buffer.from(salt,'hex'),64).toString('hex');
test('voice authentication is login, CSRF and origin bound',async()=>{
 const executed=[];
 const env=await startVoiceAuthGateway({port:0,passwordSalt:salt,passwordHash:hash,
  fetchImpl:async(url,init)=>{
   executed.push({url,init});
   return {ok:true,json:async()=>({
    source:'OLLAMA_QWEN35_4B',status:'GENERATED_NOT_VERITAS_VERIFIED',
    gpuInferenceVerified:false,text:'Qwen response for fixture',results:[]
   })};
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
  const body={schema:'leeway.voice.turn.v1',mode:'llm',
   text:'Hello Agent Lee',final:true,allowDeviceActions:false};
  assert.equal((await req('/v1/voice/turn',{method:'POST',data:body,cookie})).code,403);
  assert.equal((await req('/v1/voice/turn',{method:'POST',data:{
   ...body,allowDeviceActions:true},cookie,csrf})).code,422);
  const result=await req('/v1/voice/turn',{method:'POST',data:body,cookie,csrf});
  assert.equal(result.code,200);
  assert.equal(result.body.source,'OLLAMA_QWEN35_4B');
  assert.equal(result.body.verified,false);
  assert.equal(executed.length,1);
  assert.equal(JSON.parse(executed[0].init.body).mode,'llm');
  assert.equal(JSON.parse(executed[0].init.body).final,true);
  console.log('VOICE_SESSION_AND_READONLY_TURN_PASS');
 }finally{await new Promise(resolve=>env.server.close(resolve))}
});
test('gateway needs operator secret material and rejects public binding',async()=>{
 assert.throws(()=>startVoiceAuthGateway({port:0}),/HASH_AND_SALT_REQUIRED/);
 assert.throws(()=>startVoiceAuthGateway({port:0,host:'0.0.0.0',
  passwordHash:hash,passwordSalt:salt}),/VOICE_HTTPS_PROXY_REQUIRED/);
});
