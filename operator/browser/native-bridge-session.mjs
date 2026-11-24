/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.BROWSER.NATIVE_SESSION
TAG: LEEWAY.BRIDGE_NATIVE_BROWSER_OWNER_READBACK.V1
5WH:
WHAT = Adapt original owner-authenticated Runtime and canonical Device Bridge readback to Chrome/Edge native messaging.
WHY = Browser couriers and public Tablet previews cannot establish enrolled devices or trusted Tablet sessions.
WHO = Creator-authorized Device Bridge contributor; Runtime, Zitadel, Device Bridge, Veritas and receipts retain their original authorities.
WHERE = operator/browser/native-bridge-session.mjs.
WHEN = 2026-11-23.
HOW = Require host-injected owner/runtime/device/Tablet callbacks; never accept authority or credentials from browser messages.
LICENSE = MIT; no new execution or issuer authority.
*/
import {randomUUID} from 'node:crypto';

const VERSION=3;
const required=['device.bridge.discovery.read','tablet.session.open'];
const id=value=>typeof value==='string'&&/^[A-Za-z0-9._:-]{8,128}$/.test(value);
const safeCode=e=>typeof e?.message==='string'&&/^[A-Z][A-Z0-9_]{2,127}$/.test(e.message)
  ? e.message : 'BRIDGE_NATIVE_ADMISSION_DENIED';
function requireProviderFunctions(providers){
 if(!providers||typeof providers!=='object')throw Error('BRIDGE_NATIVE_CANONICAL_PROVIDERS_UNBOUND');
 for(const key of ['readOwnerRuntime','readRegisteredDevices','readPhysicalHealth','readTabletSession'])
  if(typeof providers[key]!=='function')throw Error('BRIDGE_NATIVE_CANONICAL_PROVIDER_MISSING_'+key.toUpperCase());
}
function approvedExtensionCaller(origin,allowedOrigins){
 if(typeof origin!=='string'||!/^chrome-extension:\/\/[a-p]{32}\/$/.test(origin)||
    !Array.isArray(allowedOrigins)||!allowedOrigins.includes(origin))
  throw Error('BRIDGE_NATIVE_EXTENSION_ORIGIN_NOT_APPROVED');
}
function properOwner(state){
 if(!state||state.ownerBinding!=='ZITADEL_OWNER_SUB_VERIFIED'||
    state.runtimeStatus!=='AVAILABLE'||
    state.runtimeAuthentication!=='OIDC_ACCESS_TOKEN_VERIFIED'||
    !id(state.ownerSubject)||!Array.isArray(state.grants)||
    required.some(x=>!state.grants.includes(x)))
  throw Error('BRIDGE_NATIVE_OWNER_RUNTIME_GRANTS_UNBOUND');
 return state.ownerSubject;
}
function cleanRequest(message,type){
 return message&&typeof message==='object'&&!Array.isArray(message)&&
  message.type===type&&message.version===VERSION&&id(message.requestId)&&
  id(message.sessionId);
}
export function createNativeBridgeBrowserSession({
 extensionOrigin, approvedOrigins, providers, clock=()=>Date.now()
}={}){
 approvedExtensionCaller(extensionOrigin,approvedOrigins);
 requireProviderFunctions(providers);
 let active=null;
 async function handle(message){
  if(!message||typeof message!=='object'||Array.isArray(message))
   return {type:'leeway.extension.denied',reason:'BRIDGE_NATIVE_MESSAGE_INVALID'};
  if(message.type==='leeway.extension.hello'){
   try {
    if(message.version!==VERSION||!id(message.helloId)||
      !Array.isArray(message.requestedCapabilities)||
      required.some(x=>!message.requestedCapabilities.includes(x)))
      throw Error('BRIDGE_NATIVE_HELLO_INVALID');
    const owner=await providers.readOwnerRuntime();
    const ownerSubject=properOwner(owner);
    const now=clock();
    if(!Number.isFinite(now))throw Error('BRIDGE_NATIVE_CLOCK_UNAVAILABLE');
    active={sessionId:randomUUID(),ownerSubject,validUntil:now+90000};
    return {
     type:'leeway.extension.hello-ack',version:VERSION,
     helloId:message.helloId,authenticated:true,
     sessionId:active.sessionId,
     capabilities:[...required]
    };
   }catch(error){active=null;return {
     type:'leeway.extension.denied',reason:safeCode(error)
   }}
  }
  if(message.type==='leeway.extension.bridge-snapshot-request'){
   if(!cleanRequest(message,'leeway.extension.bridge-snapshot-request')||
      !active||active.sessionId!==message.sessionId||
      clock()>active.validUntil||
      !Array.isArray(message.requestedCapabilities)||
      required.some(x=>!message.requestedCapabilities.includes(x)))
    return {type:'leeway.extension.denied',
       requestId:message.requestId,reason:'BRIDGE_NATIVE_SESSION_NOT_ADMITTED'};
   try{
    // Owner is freshly validated through original Zitadel/Runtime every time.
    const owner=await providers.readOwnerRuntime();
    if(properOwner(owner)!==active.ownerSubject)throw Error('BRIDGE_NATIVE_OWNER_CHANGED');
    const registry=await providers.readRegisteredDevices({ownerSubject:active.ownerSubject});
    if(registry?.registrationState!=='TRUSTED_REGISTRY_READ'||
       !Array.isArray(registry.devices)||registry.devices.length<1||registry.devices.length>32)
      throw Error('BRIDGE_NATIVE_DEVICE_REGISTRY_UNBOUND');
    const used=new Set(),devices=[];
    for(const candidate of registry.devices){
      if(typeof candidate!=='string'||!id(candidate)||used.has(candidate))
        throw Error('BRIDGE_NATIVE_DEVICE_ID_INVALID');
      used.add(candidate);
      const observed=await providers.readPhysicalHealth({
       ownerSubject:active.ownerSubject,deviceId:candidate
      });
      // A registered adapter is not automatically physically reachable.
      if(!observed||observed.deviceId!==candidate||
         !['windows','linux','android','apple'].includes(observed.platform)||
         !['REACHABLE','OFFLINE','NOT_PROBED'].includes(observed.reachability)||
         observed.registrationState!=='TRUSTED_REGISTRY_READ')
        throw Error('BRIDGE_NATIVE_DEVICE_OBSERVATION_INVALID');
      if(observed.reachability==='REACHABLE'&&
         (observed.physicallyObserved!==true||!id(observed.receiptReference)))
        throw Error('BRIDGE_NATIVE_PHYSICAL_EVIDENCE_UNBOUND');
      devices.push({
       id:candidate,platform:observed.platform,reachability:observed.reachability,
       registrationState:'TRUSTED_REGISTRY_READ'
      });
    }
    if(!devices.some(x=>x.reachability==='REACHABLE'))
      throw Error('BRIDGE_NATIVE_NO_REACHABLE_DEVICE');
    const tablet=await providers.readTabletSession({ownerSubject:active.ownerSubject});
    if(!tablet||tablet.state!=='OWNER_SESSION_AUTHORIZED'||
       tablet.display!=='LEEWAY_AGENT_VIRTUAL_TABLET'||typeof tablet.url!=='string')
      throw Error('BRIDGE_NATIVE_TABLET_SESSION_UNBOUND');
    // URL admission is additionally checked in the extension; this provider
    // must independently establish the real session via original Runtime.
    return {
      type:'leeway.extension.bridge-snapshot',
      version:VERSION,requestId:message.requestId,sessionId:active.sessionId,
      authority:'LEEWAY_DEVICE_BRIDGE_CANONICAL_PROTOCOL',
      ownerBinding:'ZITADEL_OWNER_SUB_VERIFIED',
      runtimeStatus:owner.runtimeStatus,
      runtimeAuthentication:owner.runtimeAuthentication,
      registrationState:'TRUSTED_REGISTRY_READ',
      observedAt:new Date(clock()).toISOString(),
      capabilities:[...required],devices,
      tablet:{state:tablet.state,display:tablet.display,url:tablet.url}
    };
   }catch(error){return {
     type:'leeway.extension.denied',
     requestId:message.requestId,sessionId:active.sessionId,
     reason:safeCode(error)
   }}
  }
  return {type:'leeway.extension.denied',reason:'BRIDGE_NATIVE_MESSAGE_UNSUPPORTED'};
 }
 return Object.freeze({handle});
}
