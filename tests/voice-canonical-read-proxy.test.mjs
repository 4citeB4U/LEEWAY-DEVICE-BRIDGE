/* LEEWAY HEADER — DO NOT REMOVE
REGION: DEVICE.BRIDGE.VOICE.CANONICAL.TEST
TAG: OWNER_PINNED_READ_ONLY_BINDING
WHO: LeeWay Industries. WHAT: Session gated owner voice readback.
WHY: cross-device LeeWay voice only, no other owner's identity.
WHERE: tests. WHEN: 2026-10-24. HOW: in-memory isolated gateway fixtures.
AUTHORITY: TEST_ONLY. LICENSE: MIT. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {scryptSync,randomBytes} from 'node:crypto';
import {startVoiceAuthGateway} from '../operator/voice-auth-gateway.mjs';
const origin='https://4citeb4u.github.io';
async function harness(config,run){
 const pass='fixture-nonproduction-passphrase',salt=randomBytes(16).toString('hex');
 const passwordHash=scryptSync(pass,Buffer.from(salt,'hex'),64).toString('hex');
 const g=await startVoiceAuthGateway({port:0,passwordHash,passwordSalt:salt,...config});
 const base='http://127.0.0.1:'+g.port;
 const req=(url,init={})=>fetch(base+url,{headers:{origin,...init.headers},...init});
 try{await run({req,pass});}finally{await new Promise(r=>g.server.close(r));}
}
test('denies anonymous, wrong origin and unbound owner',()=>harness({},async({req,pass})=>{
 assert.equal((await req('/v1/voice/canonical-binding')).status,401);
 assert.equal((await req('/v1/voice/canonical-binding',{headers:{origin:'https://other.example'}})).status,403);
 const login=await req('/v1/voice/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:pass})});
 const cookie=login.headers.get('set-cookie').split(';')[0];
 assert.equal((await req('/v1/voice/canonical-binding',{headers:{cookie}})).status,503);
}));
test('authenticated client receives only canonical speaker and version, never owner data',()=>harness({
 voiceOwnerId:'fixture-owner',readCanonicalVoice:async ({ownerId})=>{
  assert.equal(ownerId,'fixture-owner');
  return {authority:'LEEWAY_VOICE_FABRIC',voicePackageId:'kokoro-bm_lewis',revision:'a'.repeat(64),
   privateKey:'never',csrf:'not-disclosed',otherOwners:['irrelevant']};
 }
},async({req,pass})=>{
 const login=await req('/v1/voice/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:pass})});
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const result=await req('/v1/voice/canonical-binding?ownerId=other-owner',{headers:{cookie}});
 assert.equal(result.status,200);
 const body=await result.json();
 assert.equal(body.binding.voicePackageId,'kokoro-bm_lewis');
 assert.equal(body.recordRevision,'a'.repeat(64));
 assert.equal(JSON.stringify(body).includes('never'),false);
 assert.equal(body.ownerId,undefined);
}));
test('unverified system speaker cannot become LeeWay canonical voice',()=>harness({
 voiceOwnerId:'fixture-owner',readCanonicalVoice:async()=>({authority:'LEEWAY_VOICE_FABRIC',voicePackageId:'ios-device-voice',revision:'a'.repeat(64)})
},async({req,pass})=>{
 const login=await req('/v1/voice/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:pass})});
 const cookie=login.headers.get('set-cookie').split(';')[0];
 assert.equal((await req('/v1/voice/canonical-binding',{headers:{cookie}})).status,503);
}));
