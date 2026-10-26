/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.CONTINUUM
TAG: LEEWAY.IDENTITY.CONTINUUM.BACKUP.BOUNDARY.V1
WHO: LeeWay Industries
WHAT: Backup and recovery interface for existing Pocket ID database snapshots through owner-injected canonical Continuum
WHEN: 2026-10-26
WHERE: operator/identity/continuum-pocket-id-backup.mjs
WHY: Reuse the existing Continuum ingestFile/getContent API; no second database or authority
HOW: SHA-256 of exact snapshot bytes, governed Continuum ingest, exact readback; no network or database credentials
AUTHORITY: Backup transport only, not a live SQLite database, OAuth issuer, identity enrollment, or command grant
LICENSE: MIT
*/
import { createHash } from 'node:crypto';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const requireBytes = bytes => { if (!(bytes instanceof Uint8Array) || bytes.length===0) throw Error('POCKET_ID_SNAPSHOT_REQUIRED'); };
const requireProvider = provider => {
  if (typeof provider?.ingestFile !== 'function' || typeof provider?.getContent !== 'function') throw Error('CANONICAL_CONTINUUM_PROVIDER_UNBOUND');
};
export async function archivePocketIdSnapshot({continuum, snapshot, context, source}={}) {
  requireProvider(continuum); requireBytes(snapshot);
  if (!context || !source || !source.ownerScope) throw Error('OWNER_CONTEXT_REQUIRED');
  const original = new Uint8Array(snapshot);
  const expected = digest(original);
  const result = await continuum.ingestFile({
    bytes: original, mimeType: 'application/x-sqlite3',
    filename: 'pocket-id-consistent-snapshot.sqlite3',
    source: {...source, classification:'PRIVATE_IDENTITY_BACKUP', originalSha256:expected}
  },context);
  if (!result?.recordId) throw Error('CONTINUUM_RECORD_MISSING');
  const back = await continuum.getContent(result.recordId,context);
  if (!(back?.bytes instanceof Uint8Array) || digest(back.bytes)!==expected) throw Error('CONTINUUM_READBACK_MISMATCH');
  return Object.freeze({recordId:result.recordId,sha256:expected,bytes:original.length,verifiedReadback:true});
}
export async function restorePocketIdSnapshot({continuum,recordId,context,expectedSha256}={}) {
  requireProvider(continuum);
  if (!context || !recordId || !/^[a-f0-9]{64}$/.test(expectedSha256||'')) throw Error('RESTORE_AUTHORITY_AND_DIGEST_REQUIRED');
  const record=await continuum.getContent(recordId,context);
  requireBytes(record?.bytes);
  if (digest(record.bytes)!==expectedSha256) throw Error('CONTINUUM_RESTORE_HASH_MISMATCH');
  return new Uint8Array(record.bytes);
}
