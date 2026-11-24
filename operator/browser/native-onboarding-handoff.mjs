/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.NATIVE_ONBOARDING_HANDOFF
TAG: LEEWAY.ORIGINAL_RUNTIME_DEVICE_BOOTSTRAP_HANDOFF_V1
5WH:
WHAT = Accept a one-time account-approved native enrollment handoff from ORIGINAL Runtime.
WHY = The same clean installer must support full setup and a quick additional device without transferring passwords/passports.
WHO = Original Runtime/Zitadel/approved signer and signed OS adapter; outside contributor only defines the boundary.
WHERE = operator/browser/native-onboarding-handoff.mjs.
WHEN = 2026-11-24.
HOW = Host evidence first, original Runtime atomic handoff consumption second; never authorize execution from browser state.
LICENSE = Existing repository terms, not an independent identity issuer.
*/
const validRef=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{32,128}$/.test(s);
function denied(why){throw Error('LEEWAY_NATIVE_HANDOFF_'+why)}
export function createOriginalRuntimeOnboardingHandoff({
 readNativeDeviceEvidence,consumeOriginalRuntimeHandoff,clock=()=>Date.now()
}={}){
 if(typeof readNativeDeviceEvidence!=='function'||typeof consumeOriginalRuntimeHandoff!=='function')
  denied('CANONICAL_PROVIDERS_UNBOUND');
 return Object.freeze({
  async receive({reference}={}){
   if(!validRef(reference))denied('REFERENCE_INVALID');
   // Never accept owner subject, enrollment mode, grant or session claim from a
   // static website, a browser extension, or the reference itself.
   const device=await readNativeDeviceEvidence();
   if(!device||device.source!=='ORIGINAL_SIGNED_OS_ADAPTER'||
      !validRef(device.deviceKeyId)||
      !['Windows','Linux','Android','Apple'].includes(device.osFamily)||
      !['desktop','phone','tablet'].includes(device.form)||
      device.proofOfPossessionBound!==true)
    denied('HOST_DEVICE_EVIDENCE_UNBOUND');
   // The original Runtime provider must re-authenticate the owner, check
   // device proof and consent, enforce one-time atomic consumption and expiry,
   // then return the enrollment intent. This module cannot issue that ticket.
   const result=await consumeOriginalRuntimeHandoff({
     reference,deviceKeyId:device.deviceKeyId,
     osFamily:device.osFamily,deviceProofReference:device.proofReference
   });
   if(!result||result.source!=='ORIGINAL_RUNTIME_ENROLLMENT_AUTHORITY'||
      result.status!=='OWNER_OIDC_AND_NEW_DEVICE_APPROVED'||
      !['FULL_DEVICE_SETUP','ADDITIONAL_DEVICE_QUICK_SETUP'].includes(result.path)||
      result.deviceKeyId!==device.deviceKeyId||
      !validRef(result.receiptReference)||
      !Number.isFinite(result.validUntil)||
      !Number.isFinite(clock())||
      clock()>result.validUntil)
     denied('RUNTIME_CONSENT_OR_EXPIRY_UNBOUND');
   return Object.freeze({
     status:'OWNER_DEVICE_HANDOFF_CONSUMED',
     path:result.path,osFamily:device.osFamily,form:device.form,
     deviceKeyId:device.deviceKeyId,
     runtimeReceiptReference:result.receiptReference,
     signedPassport:'NOT_ISSUED_BY_THIS_ADAPTER',
     trustedRegistration:'NOT_EXECUTED',
     physicalDeviceConnected:'NOT_ASSERTED',
     credentialsTransferred:false
   });
  }
 });
}
