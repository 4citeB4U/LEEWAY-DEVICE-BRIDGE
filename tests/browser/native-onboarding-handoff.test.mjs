/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.NATIVE_ONBOARDING_HANDOFF.TEST
TAG: LEEWAY.ORIGINAL_RUNTIME_DEVICE_BOOTSTRAP_HANDOFF.NEGATIVE_V1
5WH:
WHAT = Verify real Runtime provider requirement before native first/additional-device enrollment.
WHY = Neither GitHub Pages, Chrome nor the account's prior device can forge a new passport or Owner role.
WHO = Creator-authorized QA source only; these callback fixtures are NOT production Runtime evidence.
WHERE = tests/browser/native-onboarding-handoff.test.mjs.
WHEN = 2026-11-24.
HOW = Negative synthetic cases for identity, expiry, browser claims, owner consent and one-time redemption.
LICENSE = Existing repository terms.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import {createOriginalRuntimeOnboardingHandoff} from '../../operator/browser/native-onboarding-handoff.mjs';
const reference='d'.repeat(48),key='k'.repeat(48),proof='p'.repeat(48),receipt='r'.repeat(48);
const now=1000000;
const device=()=>({source:'ORIGINAL_SIGNED_OS_ADAPTER',deviceKeyId:key,
 osFamily:'Android',form:'phone',proofReference:proof,proofOfPossessionBound:true});
const response=()=>({source:'ORIGINAL_RUNTIME_ENROLLMENT_AUTHORITY',
 status:'OWNER_OIDC_AND_NEW_DEVICE_APPROVED',
 deviceKeyId:key,receiptReference:receipt,validUntil:now+30000,path:'FULL_DEVICE_SETUP'});
function host(overrides={},once=true){
 let spent=false;
 const native={...device(),...overrides.device};
 const runtime={...response(),...overrides.runtime};
 const calls=[];
 const h=createOriginalRuntimeOnboardingHandoff({
   readNativeDeviceEvidence:async()=>native,
   consumeOriginalRuntimeHandoff:async request=>{
     calls.push(request);
     if(once&&spent)throw Error('RUNTIME_SINGLE_USE_REDEEMED');
     spent=true;return runtime;
   },
   clock:()=>now
 });
 return {h,calls};
}
test('authenticated original Runtime handoff returns only readiness, never another device passport',async()=>{
 const {h,calls}=host();
 const result=await h.receive({reference,ownerRole:'CREATOR',signedPassport:'FAKE'});
 assert.equal(result.status,'OWNER_DEVICE_HANDOFF_CONSUMED');
 assert.equal(result.path,'FULL_DEVICE_SETUP');
 assert.equal(result.osFamily,'Android');
 assert.equal(result.signedPassport,'NOT_ISSUED_BY_THIS_ADAPTER');
 assert.equal(result.trustedRegistration,'NOT_EXECUTED');
 assert.equal(result.credentialsTransferred,false);
 assert.equal(calls[0].deviceKeyId,key);
 assert.equal(calls[0].osFamily,'Android');
 assert.equal('ownerRole' in calls[0],false);
});
test('additional-device path comes only from Runtime, never a browser selection',async()=>{
 const {h}=host({runtime:{path:'ADDITIONAL_DEVICE_QUICK_SETUP'}});
 const result=await h.receive({reference,path:'FULL_DEVICE_SETUP',admin:true});
 assert.equal(result.path,'ADDITIONAL_DEVICE_QUICK_SETUP');
 assert.equal(result.physicalDeviceConnected,'NOT_ASSERTED');
});
test('invalid browser reference and missing canonical provider refuse admission',async()=>{
 assert.throws(()=>createOriginalRuntimeOnboardingHandoff(),/CANONICAL_PROVIDERS_UNBOUND/);
 const {h}=host();
 await assert.rejects(()=>h.receive({reference:'123'}),/REFERENCE_INVALID/);
});
test('website UA spoof, absent per-device key evidence and missing PoP are denied before Runtime',async()=>{
 const fixtures=[
  {source:'BROWSER_USER_AGENT'},
  {deviceKeyId:'browser-claimed-id'},
  {proofReference:null},
  {proofOfPossessionBound:false},
  {osFamily:'Unknown'}
 ];
 for(const faulty of fixtures){
  const {h,calls}=host({device:faulty});
  await assert.rejects(()=>h.receive({reference}),/HOST_DEVICE_EVIDENCE_UNBOUND/);
  assert.equal(calls.length,0);
 }
});
test('wrong owner/consent/receipt, expired or mismatched device proof never qualifies',async()=>{
 const cases=[
  {source:'SECONDARY_RUNTIME'},
  {status:'OWNER_NOT_APPROVED'},
  {deviceKeyId:'other-device-key-id'},
  {receiptReference:'unknown'},
  {validUntil:now-1},
  {path:'CREATOR_OVERRIDE'}
 ];
 for(const faulty of cases){
  const {h}=host({runtime:faulty});
  await assert.rejects(()=>h.receive({reference}),/RUNTIME_CONSENT_OR_EXPIRY_UNBOUND/);
 }
});
test('one-time Runtime consumption is mandatory; no local reuse fallback',async()=>{
 const {h}=host();
 await h.receive({reference});
 await assert.rejects(()=>h.receive({reference}),/RUNTIME_SINGLE_USE_REDEEMED/);
});
