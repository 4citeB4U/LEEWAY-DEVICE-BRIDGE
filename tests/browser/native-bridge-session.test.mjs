/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.BROWSER.NATIVE_SESSION.TEST
TAG: LEEWAY.BRIDGE_NATIVE_BROWSER_OWNER_READBACK.TEST.V1
5WH:
WHAT = Test real native browser adapter source using synthetic injected original authority fixtures.
WHY = Deny extension impersonation, unbound passport, no physical device and old owner credentials.
WHO = Creator-authorized Bridge test contributors; no production Zitadel, physical machine or Veritas is used.
WHERE = tests/browser/native-bridge-session.test.mjs.
WHEN = 2026-11-23.
HOW = Bounded synthetic owner/registry/health callbacks and negative case requests.
LICENSE = MIT; fixture observations are not production receipts.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeBridgeBrowserSession} from '../../operator/browser/native-bridge-session.mjs';
const origin='chrome-extension://'+'a'.repeat(32)+'/';
const hello={type:'leeway.extension.hello',version:3,
 helloId:'12345678-1234-4444-8888-123456789abc',
 requestedCapabilities:['device.bridge.discovery.read','tablet.session.open']};
const providers=()=>({
 readOwnerRuntime:async()=>({
  ownerSubject:'owner-subject-001',
  ownerBinding:'ZITADEL_OWNER_SUB_VERIFIED',
  runtimeStatus:'AVAILABLE',runtimeAuthentication:'OIDC_ACCESS_TOKEN_VERIFIED',
  grants:['device.bridge.discovery.read','tablet.session.open']
 }),
 readRegisteredDevices:async()=>({
  registrationState:'TRUSTED_REGISTRY_READ',devices:['approved-device-01']
 }),
 readPhysicalHealth:async({deviceId})=>({
  deviceId,platform:'windows',reachability:'REACHABLE',
  registrationState:'TRUSTED_REGISTRY_READ',physicallyObserved:true,
  receiptReference:'fixture-receipt-001'
 }),
 readTabletSession:async()=>({
  state:'OWNER_SESSION_AUTHORIZED',display:'LEEWAY_AGENT_VIRTUAL_TABLET',
  url:'https://owner-workspace.example.com/tablet/'
 })
});
function host(overrides={},opts={}){
 return createNativeBridgeBrowserSession({
  extensionOrigin:origin,approvedOrigins:[origin],
  providers:{...providers(),...overrides},...opts
 });
}
async function connected(instance){
 const ack=await instance.handle(hello);
 assert.equal(ack.type,'leeway.extension.hello-ack');
 assert.equal(ack.authenticated,true);
 return ack;
}
const snap=ack=>({
 type:'leeway.extension.bridge-snapshot-request',version:3,
 requestId:'99999999-aaaa-4444-8888-333333333333',
 sessionId:ack.sessionId,
 requestedCapabilities:['device.bridge.discovery.read','tablet.session.open']
});

test('native host requires exact published allowed origin and original providers',()=>{
 assert.throws(()=>host({}, {extensionOrigin:'chrome-extension://'+'b'.repeat(32)+'/'}),/ORIGIN_NOT_APPROVED/);
 assert.throws(()=>host({}, {approvedOrigins:[]}),/ORIGIN_NOT_APPROVED/);
 assert.throws(()=>createNativeBridgeBrowserSession({
  extensionOrigin:origin,approvedOrigins:[origin],providers:{}
 }),/PROVIDER_MISSING/);
});

test('authenticated Native hello is conditional on original Runtime grants',async()=>{
 const h=host();const ack=await connected(h);
 assert.deepEqual(ack.capabilities,[
  'device.bridge.discovery.read','tablet.session.open'
 ]);
 const hBad=host({readOwnerRuntime:async()=>({
   ownerSubject:'owner-subject-001',ownerBinding:'UNKNOWN',
   runtimeStatus:'AVAILABLE',runtimeAuthentication:'OIDC_ACCESS_TOKEN_VERIFIED',
   grants:['device.bridge.discovery.read','tablet.session.open']
 })});
 const denied=await hBad.handle(hello);
 assert.equal(denied.type,'leeway.extension.denied');
 assert.match(denied.reason,/OWNER_RUNTIME_GRANTS_UNBOUND/);
});

test('real canonical provider callbacks can produce bounded Tablet display-only snapshot',async()=>{
 const h=host();const ack=await connected(h);
 const result=await h.handle(snap(ack));
 assert.equal(result.type,'leeway.extension.bridge-snapshot');
 assert.equal(result.registrationState,'TRUSTED_REGISTRY_READ');
 assert.equal(result.devices[0].id,'approved-device-01');
 assert.equal(result.tablet.state,'OWNER_SESSION_AUTHORIZED');
 assert.equal(result.runtimeAuthentication,'OIDC_ACCESS_TOKEN_VERIFIED');
 assert.equal(result.execution,undefined);
});

test('missing, untrusted, or unreachable device cannot qualify browser Tablet',async()=>{
 const examples=[
  {readRegisteredDevices:async()=>({registrationState:'REGISTRATION_AUTHORITY_UNBOUND',devices:[]})},
  {readRegisteredDevices:async()=>({registrationState:'TRUSTED_REGISTRY_READ',devices:[]})},
  {readPhysicalHealth:async({deviceId})=>({deviceId,platform:'windows',
    registrationState:'TRUSTED_REGISTRY_READ',reachability:'NOT_PROBED'})},
  {readPhysicalHealth:async({deviceId})=>({deviceId,platform:'windows',
    registrationState:'TRUSTED_REGISTRY_READ',reachability:'REACHABLE',
    physicallyObserved:false,receiptReference:'fixture-receipt-001'})}
 ];
 for(const change of examples){
  const h=host(change);const ack=await connected(h);
  const result=await h.handle(snap(ack));
  assert.equal(result.type,'leeway.extension.denied');
 }
});

test('owner changed after handshake and stale sessions cannot read devices',async()=>{
 let changed=false;
 const p=providers();
 const original=p.readOwnerRuntime;
 p.readOwnerRuntime=async()=>({...await original(),ownerSubject:changed?'other-owner-002':'owner-subject-001'});
 const h=host(p);
 const ack=await connected(h);
 changed=true;
 const denied=await h.handle(snap(ack));
 assert.equal(denied.reason,'BRIDGE_NATIVE_OWNER_CHANGED');
 const hExpired=host({}, {clock:(()=>{let value=1000;return ()=>{value+=50000;return value;}})()});
 const ack2=await connected(hExpired);
 const expired=await hExpired.handle(snap(ack2));
 assert.equal(expired.reason,'BRIDGE_NATIVE_SESSION_NOT_ADMITTED');
});

test('browser cannot set owner, registration or capabilities by request JSON',async()=>{
 const h=host();const ack=await connected(h);
 const result=await h.handle({...snap(ack),
  ownerSubject:'attacker',registrationState:'TRUSTED_REGISTRY_READ',
  devices:[{id:'fake',reachability:'REACHABLE'}],capabilities:['device.bridge.execute']});
 assert.equal(result.type,'leeway.extension.bridge-snapshot');
 assert.deepEqual(result.capabilities,['device.bridge.discovery.read','tablet.session.open']);
 assert.equal(result.devices[0].id,'approved-device-01');
});
