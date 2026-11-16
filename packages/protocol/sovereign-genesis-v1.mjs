/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.PROTOCOL.GENESIS
TAG: LEEWAY.CONTINUUM.GENESIS.CLONE.V1
5WH:
WHAT = Validate the metadata and externally authorized signature of a portable Genesis recovery manifest.
WHY = Permit cross-device continuity claims without cloning device keys or asserting unobserved backups.
WHO = Creator-authorized Device Bridge contributors; native issuer and recovery authority remain external.
WHERE = packages/protocol/sovereign-genesis-v1.mjs.
WHEN = 2026-11-16.
HOW = Strict envelopes, domain-separated Merkle integrity, Ed25519 signature verification, bounded claims.
LICENSE = Existing repository terms; no new license asserted.
*/
import { createHash, verify } from 'node:crypto';

const HEX = /^[0-9a-f]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;
const MAX_CAPSULES = 10000;
const HASH_VERSION = 'LEEWAY_GENESIS_MERKLE_V1';
const sha256 = value => createHash('sha256').update(value).digest();
const ensure = (ok, code) => { if (!ok) throw new Error(code); };
const exact = (value, keys, code) => {
  ensure(value && typeof value === 'object' && !Array.isArray(value), code);
  ensure(Object.keys(value).sort().join('|') === keys.slice().sort().join('|'), code);
};
const stamp = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(value) && Number.isFinite(Date.parse(value));
const clean = (value, code) => ensure(typeof value === 'string' && ID.test(value), code);
const isHttps = value => {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.hash; }
  catch { return false; }
};

/** Stable JSON for this strict V1 envelope. Never use implicit JS object insertion order as a signature format. */
export function canonicalJson(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonicalJson(value[k])).join(',') + '}';
  ensure(value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isSafeInteger(value)), 'GENESIS_CANONICAL_TYPE_REJECTED');
  return JSON.stringify(value);
}

/** Returns a binary Merkle root. The capsule ID and ciphertext hash are both bound to each leaf. */
export function capsuleMerkleRoot(capsules) {
  ensure(Array.isArray(capsules) && capsules.length <= MAX_CAPSULES, 'GENESIS_CAPSULE_COUNT_INVALID');
  const seen = new Set();
  const ordered = [...capsules].sort((a, b) => String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0);
  let level = ordered.map(cap => {
    exact(cap, ['id', 'ciphertextSha256', 'ciphertextBytes', 'encryption'], 'GENESIS_CAPSULE_SHAPE_INVALID');
    clean(cap.id, 'GENESIS_CAPSULE_ID_INVALID');
    ensure(!seen.has(cap.id), 'GENESIS_DUPLICATE_CAPSULE'); seen.add(cap.id);
    ensure(HEX.test(cap.ciphertextSha256), 'GENESIS_CAPSULE_DIGEST_INVALID');
    ensure(Number.isSafeInteger(cap.ciphertextBytes) && cap.ciphertextBytes > 0, 'GENESIS_CAPSULE_SIZE_INVALID');
    ensure(cap.encryption === 'AES-256-GCM', 'GENESIS_ENCRYPTION_REQUIRED');
    return sha256(Buffer.concat([Buffer.from('LW-GENESIS-LEAF-V1\0'), Buffer.from(cap.id, 'utf8'), Buffer.from([0]), Buffer.from(cap.ciphertextSha256, 'hex')]));
  });
  if (level.length === 0) return sha256('LW-GENESIS-EMPTY-V1').toString('hex');
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(sha256(Buffer.concat([Buffer.from('LW-GENESIS-NODE-V1\0'), level[i], level[i + 1] ?? level[i]])));
    }
    level = next;
  }
  return level[0].toString('hex');
}

function validateBody(body) {
  exact(body, ['schemaVersion','ownerSubject','sequence','createdAt','covenant','configuration','snapshot'], 'GENESIS_BODY_SHAPE_INVALID');
  ensure(body.schemaVersion === 'LEEWAY_GENESIS_V1', 'GENESIS_SCHEMA_UNSUPPORTED');
  clean(body.ownerSubject, 'GENESIS_OWNER_INVALID');
  ensure(Number.isSafeInteger(body.sequence) && body.sequence >= 0, 'GENESIS_SEQUENCE_INVALID');
  ensure(stamp(body.createdAt), 'GENESIS_TIMESTAMP_INVALID');
  exact(body.covenant, ['sha256','acceptanceRef'], 'GENESIS_COVENANT_SHAPE_INVALID');
  ensure(HEX.test(body.covenant.sha256), 'GENESIS_COVENANT_DIGEST_INVALID');
  clean(body.covenant.acceptanceRef, 'GENESIS_ACCEPTANCE_REF_INVALID');
  exact(body.configuration, ['issuer','relayDiscoveryUrl','extensionChannel','standardsRef','recoveryKeyRef'], 'GENESIS_CONFIGURATION_SHAPE_INVALID');
  ensure(isHttps(body.configuration.issuer), 'GENESIS_ISSUER_INVALID');
  ensure(body.configuration.relayDiscoveryUrl === null || isHttps(body.configuration.relayDiscoveryUrl), 'GENESIS_RELAY_URL_INVALID');
  for (const field of ['extensionChannel','standardsRef','recoveryKeyRef']) clean(body.configuration[field], 'GENESIS_CONFIG_REFERENCE_INVALID');
  exact(body.snapshot, ['snapshotId','rootSha256','capsules','capturedAt','encryptionKeyRef'], 'GENESIS_SNAPSHOT_SHAPE_INVALID');
  clean(body.snapshot.snapshotId, 'GENESIS_SNAPSHOT_ID_INVALID');
  ensure(stamp(body.snapshot.capturedAt), 'GENESIS_SNAPSHOT_DATE_INVALID');
  clean(body.snapshot.encryptionKeyRef, 'GENESIS_ENCRYPTION_REFERENCE_INVALID');
  ensure(HEX.test(body.snapshot.rootSha256) && body.snapshot.rootSha256 === capsuleMerkleRoot(body.snapshot.capsules), 'GENESIS_MERKLE_MISMATCH');
}

/** Caller supplies a separately authenticated, currently trusted owner key and nonrollback continuity bound. */
export function verifyGenesisManifest(signed, { expectedOwnerSubject, trustedOwnerPublicKey, minimumSequence = 0, expectedIssuer } = {}) {
  exact(signed, ['body','signature'], 'GENESIS_ENVELOPE_INVALID');
  validateBody(signed.body);
  clean(expectedOwnerSubject, 'GENESIS_EXPECTED_OWNER_REQUIRED');
  ensure(signed.body.ownerSubject === expectedOwnerSubject, 'GENESIS_OWNER_MISMATCH');
  if (expectedIssuer !== undefined) ensure(signed.body.configuration.issuer === expectedIssuer, 'GENESIS_ISSUER_MISMATCH');
  ensure(Number.isSafeInteger(minimumSequence) && minimumSequence >= 0, 'GENESIS_MINIMUM_SEQUENCE_INVALID');
  ensure(signed.body.sequence >= minimumSequence, 'GENESIS_ROLLBACK_REJECTED');
  exact(signed.signature, ['algorithm','valueBase64'], 'GENESIS_SIGNATURE_SHAPE_INVALID');
  ensure(signed.signature.algorithm === 'Ed25519' && typeof signed.signature.valueBase64 === 'string' && B64.test(signed.signature.valueBase64), 'GENESIS_SIGNATURE_INVALID');
  ensure(trustedOwnerPublicKey != null, 'GENESIS_TRUST_ROOT_REQUIRED');
  let authenticated = false;
  try { authenticated = verify(null, Buffer.from(canonicalJson(signed.body), 'utf8'), trustedOwnerPublicKey, Buffer.from(signed.signature.valueBase64, 'base64')); }
  catch { authenticated = false; }
  ensure(authenticated, 'GENESIS_SIGNATURE_REJECTED');
  return Object.freeze({ state: 'SIGNED_MANIFEST_VALIDATED_NOT_RESTORED', ownerSubject: signed.body.ownerSubject, sequence: signed.body.sequence,
    snapshotId: signed.body.snapshot.snapshotId, ciphertextCapsulesDeclared: signed.body.snapshot.capsules.length,
    merkleRootSha256: signed.body.snapshot.rootSha256, restoreQualified: false,
    missingEvidence: ['OFF_DEVICE_REPLICA_ACK','LIVE_CIPHERTEXT_FETCH','DECRYPTION','COMPLETE_HASH_READBACK','NEW_DEVICE_ENROLLMENT','INDEPENDENT_VERITAS'] });
}

/** Integrity only. Decryption/authentication and native storage writes belong to the existing qualified host. */
export function verifyCiphertext(ciphertext, declaredCapsule) {
  ensure(Buffer.isBuffer(ciphertext), 'GENESIS_CIPHERTEXT_REQUIRED');
  ensure(ciphertext.length === declaredCapsule.ciphertextBytes, 'GENESIS_CIPHERTEXT_SIZE_MISMATCH');
  ensure(sha256(ciphertext).toString('hex') === declaredCapsule.ciphertextSha256, 'GENESIS_CIPHERTEXT_HASH_MISMATCH');
  return true;
}
export const GENESIS_HASH_VERSION = HASH_VERSION;
