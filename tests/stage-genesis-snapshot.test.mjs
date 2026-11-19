/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.RECOVERY.TESTS
TAG: LEEWAY.GENESIS.PHOENIX.STAGING.NEGATIVE.V1
5WH:
WHAT = Test signed Genesis restoration staging through injected canonical provider fixtures.
WHY = Reject false owner grants, altered replica bytes and corrupted local readback before activation.
WHO = Creator-authorized Device Bridge contributors.
WHERE = tests/stage-genesis-snapshot.test.mjs.
WHEN = 2026-11-19.
HOW = Generate a real Ed25519 signed manifest and run bounded in-memory adapter fixtures.
LICENSE = Existing repository terms; no new rights asserted.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { stageGenesisSnapshot } from '../operator/recovery/stage-genesis-snapshot.mjs';
import { canonicalJson, capsuleMerkleRoot } from '../packages/protocol/sovereign-genesis-v1.mjs';

const ownerKeys = generateKeyPairSync('ed25519');
const plaintext = Buffer.from('owner permitted recovery review content');
const ciphertext = Buffer.from('ciphertext fixture: content already encrypted by Continuum in production');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const owner = 'owner-test-001';
const target = 'new-device-test-001';

function signedManifest() {
  const capsules = [{ id:'capsule-001', ciphertextSha256:sha256(ciphertext), ciphertextBytes:ciphertext.length, encryption:'AES-256-GCM' }];
  const body = {
    schemaVersion:'LEEWAY_GENESIS_V1', ownerSubject:owner, sequence:9, createdAt:'2026-11-19T14:00:00Z',
    covenant:{sha256:'a'.repeat(64),acceptanceRef:'consent-reference-001'},
    configuration:{issuer:'https://issuer.example',relayDiscoveryUrl:null,extensionChannel:'stable',standardsRef:'approved-standards',recoveryKeyRef:'owner-protected-key-ref'},
    snapshot:{snapshotId:'snap-009',rootSha256:capsuleMerkleRoot(capsules),capsules,capturedAt:'2026-11-19T14:00:00Z',encryptionKeyRef:'owner-protected-key-ref'}
  };
  return { body, signature:{algorithm:'Ed25519',valueBase64:sign(null,Buffer.from(canonicalJson(body)),ownerKeys.privateKey).toString('base64')} };
}

function fixture(overrides={}) {
  const calls = [];
  const stored = new Map();
  const authorizeRestore = async request => {
    calls.push('authorize');
    return {state:'AUTHORIZED',ownerSubject:request.ownerSubject,targetDeviceId:request.targetDeviceId,snapshotId:request.snapshotId,leaseRef:'runtime-test-lease'};
  };
  const replica = {readCiphertext:async () => {calls.push('fetch');return Buffer.from(ciphertext);}};
  const continuum = {decryptCapsule:async () => {calls.push('decrypt');return Buffer.from(plaintext);}};
  const staging = {
    begin:async () => {calls.push('begin');return {id:'staging-transaction'};},
    write:async (_,item) => {calls.push('write');stored.set(item.capsuleId,Buffer.from(item.bytes));},
    read:async (_,item) => {calls.push('read');return Buffer.from(stored.get(item.capsuleId));},
    seal:async () => {calls.push('seal');},
    abort:async () => {calls.push('abort');stored.clear();}
  };
  const options = {
    expectedOwnerSubject:owner, expectedIssuer:'https://issuer.example',trustedOwnerPublicKey:ownerKeys.publicKey,
    minimumSequence:9,targetDeviceId:target,authorizeRestore,replica,continuum,staging,...overrides
  };
  return { calls, stored, options };
}

test('valid signed owner manifest stages and reads back without activating',async()=>{
  const f=fixture();
  const result=await stageGenesisSnapshot(signedManifest(),f.options);
  assert.equal(result.state,'STAGED_FOR_OWNER_REVIEW_NOT_ACTIVATED');
  assert.equal(result.qualifiedRestore,false);
  assert.equal(result.activated,false);
  assert.equal(result.capsuleCount,1);
  assert.deepEqual(f.calls,['authorize','begin','fetch','decrypt','write','read','seal']);
  assert.deepEqual(f.stored.get('capsule-001'),plaintext);
});
test('wrong owner stops before any external side effect',async()=>{
  const f=fixture({expectedOwnerSubject:'another-tenant'});
  await assert.rejects(stageGenesisSnapshot(signedManifest(),f.options),/GENESIS_OWNER_MISMATCH/);
  assert.deepEqual(f.calls,[]);
});
test('stale signed sequence stops before authorization',async()=>{
  const f=fixture({minimumSequence:10});
  await assert.rejects(stageGenesisSnapshot(signedManifest(),f.options),/GENESIS_ROLLBACK_REJECTED/);
  assert.deepEqual(f.calls,[]);
});
test('a client boolean is not sufficient for a Runtime grant',async()=>{
  const f=fixture({authorizeRestore:async()=>({authorized:true,secondOauthConfirmed:true})});
  await assert.rejects(stageGenesisSnapshot(signedManifest(),f.options),/GENESIS_RESTORE_GRANT_DENIED/);
  assert.deepEqual(f.calls,[]);
});
test('a grant for another target device is denied',async()=>{
  const f=fixture({authorizeRestore:async req=>({state:'AUTHORIZED',ownerSubject:owner,targetDeviceId:'other-device',snapshotId:req.snapshotId,leaseRef:'lease'})});
  await assert.rejects(stageGenesisSnapshot(signedManifest(),f.options),/GENESIS_RESTORE_GRANT_DENIED/);
  assert.deepEqual(f.calls,[]);
});
test('replayed or revoked lease denial stops before replica access',async()=>{
  const f=fixture({authorizeRestore:async()=>{throw new Error('RUNTIME_GRANT_REPLAYED');}});
  await assert.rejects(stageGenesisSnapshot(signedManifest(),f.options),/RUNTIME_GRANT_REPLAYED/);
  assert.deepEqual(f.calls,[]);
});
test('ciphertext mutation causes staging abort and never seals',async()=>{
  const f=fixture({replica:{readCiphertext:async()=>{f.calls.push('fetch');return Buffer.from('altered')}}});
  await assert.rejects(stageGenesisSnapshot(signedManifest(),f.options),/GENESIS_CIPHERTEXT_SIZE_MISMATCH/);
  assert.ok(f.calls.includes('abort'));assert.ok(!f.calls.includes('seal'));
});
test('invalid local plaintext readback aborts before seal',async()=>{
  const f=fixture();
  f.options.staging.read=async()=>{f.calls.push('read');return Buffer.from('other');};
  await assert.rejects(stageGenesisSnapshot(signedManifest(),f.options),/GENESIS_STAGING_READBACK_MISMATCH/);
  assert.ok(f.calls.includes('abort'));assert.ok(!f.calls.includes('seal'));
});
test('missing Continuum and staging providers fail before authorization',async()=>{
  const f=fixture({continuum:null});
  await assert.rejects(stageGenesisSnapshot(signedManifest(),f.options),/GENESIS_CONTINUUM_UNBOUND/);
  assert.deepEqual(f.calls,[]);
});
test('wrong or tampered signer is rejected before authorization',async()=>{
  const f=fixture();const signed=signedManifest();
  signed.body.snapshot.snapshotId='tampered';
  await assert.rejects(stageGenesisSnapshot(signed,f.options),/GENESIS_SIGNATURE_REJECTED/);
  assert.deepEqual(f.calls,[]);
});
