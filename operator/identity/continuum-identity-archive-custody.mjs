/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.CONTINUUM
TAG: LEEWAY.IDENTITY.ARCHIVE.CUSTODY.V2
WHO: LeeWay Industries
WHAT: Archival custody and SHA-256 readback for historical retired identity snapshots through owner-injected canonical Continuum
WHEN: 2026-11-12
WHERE: operator/identity/continuum-identity-archive-custody.mjs
WHY: Preserve historical identity backups without maintaining a second active OIDC issuer or runtime dependency
HOW: SHA-256 of exact snapshot bytes, governed Continuum ingest, exact readback; no network or database credentials
AUTHORITY: Historical backup custody transport only, not a live SQLite database, OAuth issuer, identity enrollment, or command grant
LICENSE: MIT
*/
import { createHash } from 'node:crypto';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');

const requireBytes = bytes => {
  if (!(bytes instanceof Uint8Array) || bytes.length === 0) {
    throw Error('IDENTITY_ARCHIVE_SNAPSHOT_REQUIRED');
  }
};

const requireProvider = provider => {
  if (typeof provider?.ingestFile !== 'function' || typeof provider?.getContent !== 'function') {
    throw Error('CANONICAL_CONTINUUM_PROVIDER_UNBOUND');
  }
};

export async function archiveLegacyIdentitySnapshot({ continuum, snapshot, context, source } = {}) {
  requireProvider(continuum);
  requireBytes(snapshot);
  if (!context || !source || !source.ownerScope) throw Error('OWNER_CONTEXT_REQUIRED');
  const original = new Uint8Array(snapshot);
  const expected = digest(original);
  const result = await continuum.ingestFile({
    bytes: original,
    mimeType: 'application/x-sqlite3',
    filename: 'legacy-identity-consistent-snapshot.sqlite3',
    source: {
      ...source,
      classification: 'PRIVATE_LEGACY_IDENTITY_ARCHIVE',
      originalSha256: expected,
    },
  }, context);
  if (!result?.recordId) throw Error('CONTINUUM_RECORD_MISSING');
  const back = await continuum.getContent(result.recordId, context);
  if (!(back?.bytes instanceof Uint8Array) || digest(back.bytes) !== expected) {
    throw Error('CONTINUUM_READBACK_MISMATCH');
  }
  return Object.freeze({
    recordId: result.recordId,
    sha256: expected,
    bytes: original.length,
    verifiedReadback: true,
    activeIssuerAuthority: false,
  });
}

export async function restoreLegacyIdentitySnapshot({ continuum, recordId, context, expectedSha256 } = {}) {
  requireProvider(continuum);
  if (!context || !recordId || !/^[a-f0-9]{64}$/.test(expectedSha256 || '')) {
    throw Error('RESTORE_AUTHORITY_AND_DIGEST_REQUIRED');
  }
  const record = await continuum.getContent(recordId, context);
  requireBytes(record?.bytes);
  if (digest(record.bytes) !== expectedSha256) throw Error('CONTINUUM_RESTORE_HASH_MISMATCH');
  return new Uint8Array(record.bytes);
}
