/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.CONTINUUM.TEST
TAG: LEEWAY.IDENTITY.ARCHIVE.CUSTODY.TEST.V2
WHO: LeeWay Industries
WHAT: Deterministic fake-provider unit contract for historical legacy identity snapshot archival and SHA-256 readback
WHEN: 2026-11-12
WHERE: tests/continuum-identity-archive-custody.test.mjs
WHY: Preserve backup custody verification without maintaining a retired active OIDC issuer
HOW: Node test; isolated mock is explicitly NOT production evidence
AUTHORITY: Unit tests only
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  archiveLegacyIdentitySnapshot,
  restoreLegacyIdentitySnapshot,
} from '../operator/identity/continuum-identity-archive-custody.mjs';

const snapshot = new Uint8Array(Buffer.from('SQLite format 3\0private-snapshot-fixture'));
const context = { owner: 'test' };
const source = { ownerScope: 'identity:test' };

test('reject unbound Continuum provider', async () => {
  await assert.rejects(
    archiveLegacyIdentitySnapshot({ snapshot, context, source }),
    /CANONICAL_CONTINUUM_PROVIDER_UNBOUND/,
  );
});

test('archive and restore exact historical bytes through injected Continuum without active issuer authority', async () => {
  const records = new Map();
  const continuum = {
    async ingestFile(file) {
      records.set('record-1', new Uint8Array(file.bytes));
      return { recordId: 'record-1' };
    },
    async getContent(id) {
      return { bytes: records.get(id) };
    },
  };
  const evidence = await archiveLegacyIdentitySnapshot({ continuum, snapshot, context, source });
  assert.equal(evidence.verifiedReadback, true);
  assert.equal(evidence.activeIssuerAuthority, false);
  const restored = await restoreLegacyIdentitySnapshot({
    continuum,
    recordId: evidence.recordId,
    context,
    expectedSha256: evidence.sha256,
  });
  assert.deepEqual(restored, snapshot);
  records.get('record-1')[0] ^= 1;
  await assert.rejects(
    restoreLegacyIdentitySnapshot({
      continuum,
      recordId: evidence.recordId,
      context,
      expectedSha256: evidence.sha256,
    }),
    /CONTINUUM_RESTORE_HASH_MISMATCH/,
  );
});
