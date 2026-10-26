/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.CONTINUUM.TEST
TAG: LEEWAY.IDENTITY.CONTINUUM.BACKUP.BOUNDARY.TEST
WHO: LeeWay Industries
WHAT: Deterministic fake-provider unit contract for exact content readback
WHEN: 2026-10-26
WHERE: tests/continuum-pocket-id-backup.test.mjs
WHY: Reject missing provider and corrupted backup bytes without relying on live private identity state
HOW: Node test; isolated mock is explicitly NOT production evidence
AUTHORITY: Unit tests only
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { archivePocketIdSnapshot,restorePocketIdSnapshot } from '../operator/identity/continuum-pocket-id-backup.mjs';
const snapshot = new Uint8Array(Buffer.from('SQLite format 3\0private-snapshot-fixture'));
const context={owner:'test'};
const source={ownerScope:'identity:test'};
test('reject unbound Continuum provider',async()=>{await assert.rejects(archivePocketIdSnapshot({snapshot,context,source}),/CANONICAL_CONTINUUM_PROVIDER_UNBOUND/)});
test('archive and restore exact bytes through injected Continuum',async()=>{
 const records=new Map();
 const continuum={
  async ingestFile(file){records.set('record-1',new Uint8Array(file.bytes));return {recordId:'record-1'}},
  async getContent(id){return {bytes:records.get(id)}}
 };
 const evidence=await archivePocketIdSnapshot({continuum,snapshot,context,source});
 assert.equal(evidence.verifiedReadback,true);
 const restored=await restorePocketIdSnapshot({continuum,recordId:evidence.recordId,context,expectedSha256:evidence.sha256});
 assert.deepEqual(restored,snapshot);
 records.get('record-1')[0]^=1;
 await assert.rejects(restorePocketIdSnapshot({continuum,recordId:evidence.recordId,context,expectedSha256:evidence.sha256}),/CONTINUUM_RESTORE_HASH_MISMATCH/);
});
