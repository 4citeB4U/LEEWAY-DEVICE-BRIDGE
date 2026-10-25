/* LEEWAY HEADER — DO NOT REMOVE
REGION: DEVICE.BRIDGE.VOICE.SYNTHESIS.TEST
TAG: AUTHENTICATED_KOKORO_ROUTE
WHO: LeeWay Industries; WHAT: synthesis authorization regression.
WHY: prevent unauthorized audio execution; WHERE: Device Bridge tests.
WHEN: 2026-10-24; HOW: fixture-backed loopback gateway.
AUTHORITY: isolated test only; LICENSE: MIT. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,scryptSync} from 'node:crypto';
import {startVoiceAuthGateway} from '../operator/voice-auth-gateway.mjs';
test('Kokoro requires authenticated owner CSRF and valid speaker',async()=>{
 const salt=randomBytes(16).toString('hex'),pass='fixture-passphrase-for-testing';
 const passwordHash=scryptSync(pass,Buffer.from(salt,'hex'),64).toString('hex');
 const calls=[];
 const gateway=await startVoiceAuthGateway({port:0,passwordSalt:salt,passwordHash,fetchImpl:async(url,options)=>{
  calls.push(url);return {ok:true,headers:{get:()=>null},text:async()=>JSON.stringify({audioContent:'UklGRgAAAAA=',sampleRate:24000})};
 }});
 const base='http://127.0.0.1:'+gateway.port;
 const body={schema:'leeway.voice.synthesize.v1',voicePackageId:'kokoro-bm_lewis',text:'Hello'};
 const request=(path,payload,extra={})=>fetch(base+path,{method:'POST',headers:{origin:'https://4citeb4u.github.io','content-type':'application/json',...extra},body:JSON.stringify(payload)});
 try{
  assert.equal((await request('/v1/voice/synthesize',body)).status,401);
  const login=await request('/v1/voice/login',{password:pass});
  assert.equal(login.status,200);
  const csrf=(await login.json()).csrfToken,cookie=login.headers.get('set-cookie').split(';')[0];
  assert.equal((await request('/v1/voice/synthesize',body,{cookie})).status,403);
  assert.equal((await request('/v1/voice/synthesize',{...body,voicePackageId:'../evil'},{cookie,'x-leeway-voice-csrf':csrf})).status,422);
  const good=await request('/v1/voice/synthesize',body,{cookie,'x-leeway-voice-csrf':csrf});
  assert.equal(good.status,200);
  assert.equal((await good.json()).schema,'leeway.voice.synthesis-result.v1');
  assert.deepEqual(calls,['http://127.0.0.1:8877/api/local/synthesize']);
 }finally{await new Promise(resolve=>gateway.server.close(resolve));}
});