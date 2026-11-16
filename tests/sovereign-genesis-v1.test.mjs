/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.TESTS.GENESIS
TAG: LEEWAY.GENESIS.CLONE.V1.NEGATIVE.TESTS
5WH:
WHAT = Prove Genesis manifest signature, owner, antirollback and ciphertext integrity decisions.
WHY = Reject forged recovery promises and unauthorized cross-device identity cloning.
WHO = Creator-authorized Device Bridge contributors.
WHERE = tests/sovereign-genesis-v1.test.mjs.
WHEN = 2026-11-16.
HOW = Node test runner with real locally generated Ed25519 signatures; no device/Veritas simulation.
LICENSE = Existing repository terms; no new license asserted.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, createHash } from 'node:crypto';
import { canonicalJson, capsuleMerkleRoot, verifyGenesisManifest, verifyCiphertext } from '../packages/protocol/sovereign-genesis-v1.mjs';

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const other = generateKeyPairSync('ed25519');
const sampleCipher = Buffer.from('non-production-test-ciphertext');
const ciphertextSha256 = createHash('sha256').update(sampleCipher).digest('hex');
const sha = 'a'.repeat(64);
function manifest() {
  const capsules = [{ id: 'cap-safe-01', ciphertextSha256, ciphertextBytes: sampleCipher.length, encryption: 'AES-256-GCM' }];
  const body = {
    schemaVersion: 'LEEWAY_GENESIS_V1', ownerSubject: 'oidc-owner-A', sequence: 12, createdAt: '2026-11-16T18:00:00Z',
    covenant: { sha256: sha, acceptanceRef: 'cov-attestation-01' },
    configuration: { issuer: 'https://identity.example', relayDiscoveryUrl: 'https://relay.example/mesh', extensionChannel: 'stable', standardsRef: 'standards-approved', recoveryKeyRef: 'recovery-key-custody' },
    snapshot: { snapshotId:'snapshot-01',rootSha256:capsuleMerkleRoot(capsules), capsules,capturedAt:'2026-11-16T18:00:00Z',encryptionKeyRef:'recovery-key-custody' }
  };
  return signBundle(body);
}
function signBundle(body, key=privateKey) {
  return { body, signature: { algorithm: 'Ed25519', valueBase64: sign(null,Buffer.from(canonicalJson(body)),key).toString('base64') } };
}
function check(bundle=manifest(), extra={}) {
  return verifyGenesisManifest(bundle, {expectedOwnerSubject:'oidc-owner-A',trustedOwnerPublicKey:publicKey,expectedIssuer:'https://identity.example', minimumSequence:12,...extra});
}
test('signed manifest validates but never asserts physical restore', () => {
  const result=check();assert.equal(result.ciphertextCapsulesDeclared,1);assert.equal(result.restoreQualified,false);
  assert.ok(result.missingEvidence.includes('OFF_DEVICE_REPLICA_ACK'));
});
test('wrong owner identity is rejected',()=>assert.throws(()=>check(manifest(),{expectedOwnerSubject:'someone-else'}),/GENESIS_OWNER_MISMATCH/));
test('wrong issuer is rejected',()=>assert.throws(()=>check(manifest(),{expectedIssuer:'https://other.example'}),/GENESIS_ISSUER_MISMATCH/));
test('authenticated sequence rollback is rejected',()=>assert.throws(()=>check(manifest(),{minimumSequence:13}),/GENESIS_ROLLBACK_REJECTED/));
test('altered config breaks signature verification',()=>{const b=manifest(); b.body.configuration.extensionChannel='unapproved';assert.throws(()=>check(b),/GENESIS_SIGNATURE_REJECTED/)});
test('untrusted key fails even for a well-formed signature',()=>assert.throws(()=>check(manifest(),{trustedOwnerPublicKey:other.publicKey}),/GENESIS_SIGNATURE_REJECTED/));
test('encrypted capsule id traversal and duplicate ids fail',()=>{
  const b=manifest();b.body.snapshot.capsules[0].id='../bad';assert.throws(()=>check(signBundle(b.body)),/GENESIS_CAPSULE_ID_INVALID/);
  const d=manifest();d.body.snapshot.capsules.push({...d.body.snapshot.capsules[0]});assert.throws(()=>check(signBundle(d.body)),/GENESIS_DUPLICATE_CAPSULE/);
});
test('tampered capsule Merkle root fails signed proof',()=>{
  const b=manifest();b.body.snapshot.capsules[0].ciphertextSha256='f'.repeat(64);assert.throws(()=>check(signBundle(b.body)),/GENESIS_MERKLE_MISMATCH/);
});
test('private key and credential injection fails strict manifest shape',()=>{
  const b=manifest();b.body.configuration.privateKey='exfil';assert.throws(()=>check(signBundle(b.body)),/GENESIS_CONFIGURATION_SHAPE_INVALID/);
  const c=manifest();c.body.ownerPassword='do-not-ever-store';assert.throws(()=>check(signBundle(c.body)),/GENESIS_BODY_SHAPE_INVALID/);
});
test('ciphertext bytes are checked but decryption is not inferred',()=>{
  const capsule=manifest().body.snapshot.capsules[0];assert.equal(verifyCiphertext(sampleCipher,capsule),true);
  assert.throws(()=>verifyCiphertext(Buffer.from('tampered'),capsule),/GENESIS_CIPHERTEXT_SIZE_MISMATCH/);
  assert.throws(()=>verifyCiphertext(Buffer.from('x'.repeat(sampleCipher.length)),capsule),/GENESIS_CIPHERTEXT_HASH_MISMATCH/);
});
test('empty new owner snapshot is representable but unqualified',()=>{
  const b=manifest(); b.body.sequence=0; b.body.snapshot.capsules=[]; b.body.snapshot.rootSha256=capsuleMerkleRoot([]);
  const r=check(signBundle(b.body),{minimumSequence:0});assert.equal(r.ciphertextCapsulesDeclared,0);assert.equal(r.restoreQualified,false);
});
