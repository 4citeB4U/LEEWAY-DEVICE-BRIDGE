/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.RECOVERY.STAGING
TAG: LEEWAY.GENESIS.PHOENIX.STAGING.V1
5WH:
WHAT = Stage signed, owner-authorized Genesis snapshot capsules for replacement-device review.
WHY = Reuse Continuum and native storage without duplicating identity, a vault, or an execution authority.
WHO = Creator-authorized Device Bridge contributors; Runtime/Continuum/Veritas retain their original authorities.
WHERE = operator/recovery/stage-genesis-snapshot.mjs.
WHEN = 2026-11-19.
HOW = Verify original signed Genesis metadata, consume a trusted Runtime grant, fetch encrypted replicas, delegate decryption to Continuum, hash-check native staging readback, and fail closed.
LICENSE = Existing repository terms; no new rights asserted.
*/
import { createHash, timingSafeEqual } from 'node:crypto';
import { verifyGenesisManifest, verifyCiphertext } from '../../packages/protocol/sovereign-genesis-v1.mjs';

const MAX_CAPSULE_BYTES = 64 * 1024 * 1024;
const deviceIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const ensure = (condition, code) => { if (!condition) throw new Error(code); };
const digest = bytes => createHash('sha256').update(bytes).digest();

function requireProvider(provider, functions, code) {
  ensure(provider && functions.every(name => typeof provider[name] === 'function'), code);
}

/**
 * Host-only staging adapter. All providers must be injected by the authenticated
 * native Runtime/Device Bridge composition, NEVER from a web page, extension
 * message or untrusted request. The native host enforces OIDC grants, replay
 * denial, new device passport and key custody; this module does not issue grants.
 *
 * Staging is for owner review. No automatic active workspace replacement,
 * account migration, device-key cloning, Veritas or receipt claim occurs here.
 */
export async function stageGenesisSnapshot(signed, {
  expectedOwnerSubject, expectedIssuer, trustedOwnerPublicKey, minimumSequence,
  targetDeviceId, authorizeRestore, replica, continuum, staging
} = {}) {
  const manifest = verifyGenesisManifest(signed, {
    expectedOwnerSubject, expectedIssuer, trustedOwnerPublicKey, minimumSequence
  });
  ensure(deviceIdPattern.test(targetDeviceId || ''), 'GENESIS_TARGET_DEVICE_INVALID');
  ensure(typeof authorizeRestore === 'function', 'GENESIS_RUNTIME_AUTHORITY_UNBOUND');
  requireProvider(replica, ['readCiphertext'], 'GENESIS_REPLICA_UNBOUND');
  requireProvider(continuum, ['decryptCapsule'], 'GENESIS_CONTINUUM_UNBOUND');
  requireProvider(staging, ['begin', 'write', 'read', 'seal', 'abort'], 'GENESIS_NATIVE_STAGING_UNBOUND');
  const snapshotId = manifest.snapshotId;
  const ownerSubject = manifest.ownerSubject;
  const capsules = signed.body.snapshot.capsules;
  ensure(capsules.length > 0, 'GENESIS_RESTORE_EMPTY_SNAPSHOT');

  // This callback must validate an actual, request-bound Runtime Fabric grant,
  // consume its nonce and verify a new native device passport. A browser-supplied
  // bool is not a grant. No storage read occurs before it succeeds.
  const grant = await authorizeRestore({
    operation: 'genesis.snapshot.stage', ownerSubject, targetDeviceId,
    snapshotId, sequence: manifest.sequence, merkleRootSha256: manifest.merkleRootSha256
  });
  ensure(grant?.state === 'AUTHORIZED' && grant?.ownerSubject === ownerSubject &&
    grant?.targetDeviceId === targetDeviceId && grant?.snapshotId === snapshotId &&
    typeof grant?.leaseRef === 'string' && grant.leaseRef.length > 0,
    'GENESIS_RESTORE_GRANT_DENIED');

  let transaction;
  let sealed = false;
  let totalBytes = 0;
  try {
    transaction = await staging.begin({ ownerSubject, targetDeviceId, snapshotId, leaseRef: grant.leaseRef });
    ensure(transaction != null, 'GENESIS_STAGING_BEGIN_FAILED');

    for (const cap of capsules) {
      ensure(cap.ciphertextBytes <= MAX_CAPSULE_BYTES, 'GENESIS_CAPSULE_TOO_LARGE');
      const bytes = await replica.readCiphertext({ ownerSubject, snapshotId, capsuleId: cap.id, expectedSha256: cap.ciphertextSha256 });
      ensure(Buffer.isBuffer(bytes), 'GENESIS_REPLICA_BYTES_INVALID');
      verifyCiphertext(bytes, cap);
      const plain = await continuum.decryptCapsule({
        ownerSubject, snapshotId, capsuleId: cap.id,
        encryptionKeyRef: signed.body.snapshot.encryptionKeyRef,
        ciphertext: bytes, declaredCapsule: cap
      });
      ensure(Buffer.isBuffer(plain) && plain.length <= MAX_CAPSULE_BYTES, 'GENESIS_DECRYPTION_RESULT_INVALID');
      await staging.write(transaction, { capsuleId: cap.id, bytes: plain });
      const readback = await staging.read(transaction, { capsuleId: cap.id });
      ensure(Buffer.isBuffer(readback) && readback.length === plain.length &&
        timingSafeEqual(digest(readback), digest(plain)), 'GENESIS_STAGING_READBACK_MISMATCH');
      totalBytes += plain.length;
    }
    // Seal a non-activated review area. No restoration into live workspaces here.
    await staging.seal(transaction);
    sealed = true;
    return Object.freeze({
      state: 'STAGED_FOR_OWNER_REVIEW_NOT_ACTIVATED',
      ownerSubject, targetDeviceId, snapshotId,
      capsuleCount: capsules.length, stagedPlaintextBytes: totalBytes,
      qualifiedRestore: false, independentVeritas: 'NOT_EXECUTED',
      receiptAuthority: 'NOT_EXECUTED', activated: false
    });
  } catch (error) {
    if (transaction != null && !sealed) {
      try { await staging.abort(transaction); } catch { /* Retain original failure; native owner must independently inspect cleanup. */ }
    }
    throw error;
  }
}
