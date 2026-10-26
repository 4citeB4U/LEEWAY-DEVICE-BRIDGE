/*
LEEWAY HEADER — DO NOT REMOVE
REGION: DEVICE.BRIDGE.VOICE.APPLICATION.REGISTRY.TEST
TAG: MANY_APP_ORIGIN_ALLOWLIST_WITHOUT_SHARED_SECRETS
WHO: LeeWay Industries; WHAT: confirm registration scale and deny unsafe origins
WHY: many LeeWay apps should reuse one governed API securely
WHERE: tests; WHEN: 2026-10-24
HOW: generated fixtures; no real apps enrolled.
AUTHORITY: test only. LICENSE: MIT.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateVoiceAppRegistry} from '../operator/voice-app-registry.mjs';
test('voice registry validates 1600 separate application registrations',()=>{
 const apps={'leeway.voice.studio':'https://4citeb4u.github.io'};
 for(let i=0;i<1600;i++)apps['leeway.app.'+i]='https://app-'+i+'.example.test';
 const validated=validateVoiceAppRegistry(apps);
 assert.equal(Object.keys(validated).length,1601);
 assert.equal(validated['leeway.app.1599'],'https://app-1599.example.test');
 assert.equal(Object.isFrozen(validated),true);
});
test('wildcard, insecure and unapproved origins are rejected',()=>{
 const apps={'leeway.voice.studio':'https://4citeb4u.github.io'};
 for(const unsafe of ['http://example.org','https://*.example.org',
  'https://localhost','https://example.org/path','https://user:pass@example.org']){
  assert.throws(()=>validateVoiceAppRegistry({...apps,'leeway.bad':unsafe}),/ORIGIN_INVALID/);
 }
 assert.throws(()=>validateVoiceAppRegistry({'leeway.other':'https://other.example.org'}),
  /CANONICAL_VOICE_STUDIO/);
});

test('registered second app has exact-origin HTTPS CORS, unknown apps are rejected',async()=>{
 const {randomBytes,scryptSync}=await import('node:crypto');
 const {startVoiceAuthGateway}=await import('../operator/voice-auth-gateway.mjs');
 const salt=randomBytes(16),passwordHash=scryptSync('fixture-second-app-not-real',salt,64).toString('hex');
 const apps={'leeway.voice.studio':'https://4citeb4u.github.io',
   'leeway.maps':'https://maps.example.test'};
 const s=await startVoiceAuthGateway({port:0,passwordHash,passwordSalt:salt.toString('hex'),
   registeredApps:apps});
 try{
  const root='http://127.0.0.1:'+s.port;
  const allowed=await fetch(root+'/v1/voice/capabilities',{headers:{origin:'https://maps.example.test'}});
  assert.equal(allowed.status,200);
  assert.equal(allowed.headers.get('access-control-allow-origin'),'https://maps.example.test');
  const result=await allowed.json();
  assert.equal(result.schema,'leeway.voice.api.v1');
  assert.equal(result.registeredAppCount,2);
  const unknown=await fetch(root+'/v1/voice/capabilities',{headers:{origin:'https://evil.example.test'}});
  assert.equal(unknown.status,403);
  assert.equal(unknown.headers.get('access-control-allow-origin'),null);
 }finally{await new Promise(resolve=>s.server.close(resolve))}
});
