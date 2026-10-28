/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.CONTINUUM.LIVE_PROBE.TEST
TAG: LEEWAY.CONTINUUM.READBACK_QUALIFIER.TEST.V1
WHO: LeeWay Industries / owner-authorized maintainers
WHAT: Prove injected Continuum readback fail-closed without relying on real owner data
WHEN: 2026-10-28
WHERE: tests/mcp/continuum-readback-qualification.test.mjs
WHY: Deny fake provider, wrong owner, corrupt bytes, or mutated hashes
HOW: Deterministic Node fixtures; no writes, no external network or live claims
AUTHORITY: Synthetic tests only
LICENSE: MIT
*/
import { createHash } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { qualifyCanonicalContinuumReadback } from '../../operator/identity/qualify-canonical-continuum-readback.mjs';

const bytes = new Uint8Array(Buffer.from('existing-record-fixture'));
const digest = createHash('sha256').update(bytes).digest('hex');
const context = { ownerId:'owner-test', bodyId:'body-test', capabilities:['continuum.read'] };
function fixture({ observedBytes=bytes, reportedDigest=digest, liveOwner='owner-test' }={}) {
  let status=0,read=0;
  const consumer={
    descriptor:{consumerId:'device-bridge',capabilityRef:'leeway.continuum',ownerId:'owner-test',bodyId:'body-test',writeEnabled:false},
    async status() { status++;return {ownerId:liveOwner,bodyId:'body-test'}; },
    async getContent() {read++;return {bytes:observedBytes,record:{contentSha256:reportedDigest}};}
  };
  return {consumer,calls:()=>({status,read})};
}

test('exact readback succeeds with no writes and does not grant production',async()=>{
  const f=fixture();
  const r=await qualifyCanonicalContinuumReadback({consumer:f.consumer,context,recordId:'record-1',expectedSha256:digest});
  assert.equal(r.result,'OBSERVED_PASS');
  assert.equal(r.productionAdmission,'NOT_GRANTED_BY_PROBE');
  assert.equal(r.independentVeritas,'NOT_PROBED');
  assert.deepEqual(f.calls(),{status:1,read:1});
});

test('unbound and writable consumer denied before access',async()=>{
  await assert.rejects(qualifyCanonicalContinuumReadback({context,recordId:'record-1',expectedSha256:digest}),/CANONICAL_CONTINUUM_READONLY_CONSUMER_REQUIRED/);
  const f=fixture();f.consumer.descriptor.writeEnabled=true;
  await assert.rejects(qualifyCanonicalContinuumReadback({consumer:f.consumer,context,recordId:'record-1',expectedSha256:digest}),/CANONICAL_CONTINUUM_READONLY_CONSUMER_REQUIRED/);
});

test('wrong owner or missing read scope denied',async()=>{
  const f=fixture();
  await assert.rejects(qualifyCanonicalContinuumReadback({consumer:f.consumer,context:{...context,ownerId:'other-owner'},recordId:'record-1',expectedSha256:digest}),/CONTINUUM_READBACK_OWNER_SCOPE_DENIED/);
  await assert.rejects(qualifyCanonicalContinuumReadback({consumer:f.consumer,context:{...context,capabilities:[]},recordId:'record-1',expectedSha256:digest}),/CONTINUUM_READBACK_OWNER_SCOPE_DENIED/);
  assert.deepEqual(f.calls(),{status:0,read:0});
});

test('live status mismatch denies before content retrieval',async()=>{
  const f=fixture({liveOwner:'different'});
  await assert.rejects(qualifyCanonicalContinuumReadback({consumer:f.consumer,context,recordId:'record-1',expectedSha256:digest}),/CONTINUUM_READBACK_LIVE_IDENTITY_MISMATCH/);
  assert.deepEqual(f.calls(),{status:1,read:0});
});

test('wrong expected digest or altered bytes denied',async()=>{
  const f=fixture();
  await assert.rejects(qualifyCanonicalContinuumReadback({consumer:f.consumer,context,recordId:'record-1',expectedSha256:'0'.repeat(64)}),/CONTINUUM_READBACK_DIGEST_MISMATCH/);
  const corrupted=fixture({observedBytes:new Uint8Array(Buffer.from('tampered'))});
  await assert.rejects(qualifyCanonicalContinuumReadback({consumer:corrupted.consumer,context,recordId:'record-1',expectedSha256:digest}),/CONTINUUM_READBACK_DIGEST_MISMATCH/);
});

test('expected receipt identity and SHA must be supplied',async()=>{
  const f=fixture();
  await assert.rejects(qualifyCanonicalContinuumReadback({consumer:f.consumer,context,recordId:'',expectedSha256:digest}),/CONTINUUM_READBACK_EXPECTATION_REQUIRED/);
  await assert.rejects(qualifyCanonicalContinuumReadback({consumer:f.consumer,context,recordId:'record-1',expectedSha256:'x'}),/CONTINUUM_READBACK_EXPECTATION_REQUIRED/);
});
