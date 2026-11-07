/* LEEWAY HEADER — DO NOT REMOVE
REGION: DEVICE.BRIDGE.VOICE.C3.PREFLIGHT.TEST
TAG: HONEST_READINESS_AND_CONTINUUM_ADMISSION
WHO: LeeWay Industries; WHAT: C3 preflight classification contracts
WHY: no fixture or local audio demo may be mistaken for production C3
WHERE: tests; WHEN: 2026-11-07; HOW: pure classification tests
AUTHORITY: source contract only; no live audio or production session.
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import {assessC3Readiness,classifyHistoricalVoiceCalibration} from '../scripts/qualify-c3-live.mjs';

const complete={gateway:{status:200,body:{authority:'LEEWAY_DEVICE_BRIDGE_VOICE',upstreamQualified:true,
 productionConversationQualified:true,c3Qualified:true,
 c3Evidence:'CONTINUUM_HASH_VERIFIED_C3_DUPLEX_VERITAS_RECEIPT_ADMISSION'}},
 carrier:{health:{body:{voice:{ready:true},sources:{gpu:{provider:'LEEWAY_EDGE_GPU_GATEWAY',
 productionReady:true,dispatchAllowed:true}}}},binding:{body:{voiceBinding:{authority:'LEEWAY_VOICE_FABRIC',
 productionAdmitted:true,qualificationOnly:false,voicePackageId:'kokoro-bm_lewis'}}}},sessionStatus:200};

test('only a complete authenticated, live and Continuum-admitted C3 state qualifies',()=>{
 const report=assessC3Readiness(complete);
 assert.equal(report.qualification,'PASS');
 assert.equal(report.fullC3Executed,false,'read-only preflight never claims to have executed the physical session');
 assert.ok(Object.values(report.stages).every(stage=>stage==='PASS'));
});

test('an upstream readiness probe cannot promote an unqualified conversation or C3',()=>{
 const report=assessC3Readiness({...complete,gateway:{status:200,body:{authority:'LEEWAY_DEVICE_BRIDGE_VOICE',
  upstreamQualified:true,productionConversationQualified:false,c3Qualified:false,
  c3Evidence:'LIVE_DUPLEX_VERITAS_AND_RECEIPT_ADMISSION_NOT_YET_OBSERVED'}}});
 assert.equal(report.qualification,'BLOCKED');
 assert.equal(report.stages.upstreamQualification,'PASS');
 assert.equal(report.stages.productionConversation,'BLOCKED');
 assert.equal(report.stages.continuumC3Admission,'BLOCKED');
});

test('missing owner session, Voice Fabric readiness or LeeWay GPU dispatch blocks C3',()=>{
 const report=assessC3Readiness({...complete,sessionStatus:401,carrier:{...complete.carrier,
  health:{body:{voice:{ready:false},sources:{gpu:{provider:'LEEWAY_EDGE_GPU_GATEWAY',productionReady:false,dispatchAllowed:false}}}}}});
 assert.equal(report.qualification,'BLOCKED');
 assert.equal(report.stages.authenticatedSession,'OWNER_APPROVAL_REQUIRED');
 assert.equal(report.stages.voiceProvider,'BLOCKED');
 assert.equal(report.stages.leewayGpuInference,'BLOCKED');
});

test('the prior 16-segment Formula shadow is retained at its verified scope and never promoted to production',()=>{
 const result=classifyHistoricalVoiceCalibration({digestMatches:true,receiptId:'receipt-v4-001',document:{
  schema:'leeway.machine-consciousness.owner-voice-formula-veritas.v1',
  calibrationId:'owner-device-voice-runtime-v4-20261105',runId:'v4-veritas-20261105-001',
  status:'PASS_SHADOW_NOT_PROMOTED',checks:{sixteenBundles:true,continuumReadbacks:true,
   formulaRecalculation:true,productionAccepted:false,liveSpeechPolicyChanged:false}}});
 assert.equal(result.state,'VERIFIED_SHADOW_PASS');
 assert.equal(result.segments,16);
 assert.equal(result.productionAccepted,false);
 assert.equal(result.transcriptSource,'OWNER_DECLARED_PROMPT');
});

test('mismatched Continuum bytes or production promotion claims cannot qualify the historical calibration',()=>{
 const document={schema:'leeway.machine-consciousness.owner-voice-formula-veritas.v1',
  calibrationId:'owner-device-voice-runtime-v4-20261105',runId:'v4-veritas-20261105-001',
  status:'PASS_SHADOW_NOT_PROMOTED',checks:{sixteenBundles:true,continuumReadbacks:true,
   formulaRecalculation:true,productionAccepted:false,liveSpeechPolicyChanged:false}};
 assert.equal(classifyHistoricalVoiceCalibration({document,digestMatches:false,receiptId:'r'}).state,'UNVERIFIED');
 assert.equal(classifyHistoricalVoiceCalibration({document:{...document,checks:{...document.checks,productionAccepted:true}},
  digestMatches:true,receiptId:'r'}).state,'UNVERIFIED');
});
