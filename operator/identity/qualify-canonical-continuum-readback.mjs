/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.CONTINUUM.LIVE_PROBE
TAG: LEEWAY.CONTINUUM.OWNER_SCOPED_READBACK_QUALIFIER.V1
WHO: LeeWay Industries / owner-authorized trusted runtime
WHAT: Read one pre-existing canonical Continuum record through the injected Device Bridge consumer
WHEN: 2026-10-28
WHERE: operator/identity/qualify-canonical-continuum-readback.mjs
WHY: Prove owner-scoped Continuum data access without creating or migrating databases
HOW: Trusted injected consumer, status identity and content SHA-256 comparison, no writes
AUTHORITY: Readback observation only; not live production, Veritas or device execution admission
LICENSE: MIT
*/
import { createHash } from 'node:crypto';
const fail = reason => { throw Object.assign(new Error(reason),{ code: reason }); };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const validId = value => typeof value === 'string' && /^[A-Za-z0-9_.:@/-]{1,256}$/.test(value);

export async function qualifyCanonicalContinuumReadback({
  consumer, context, recordId, expectedSha256
} = {}) {
  const d = consumer?.descriptor;
  if (d?.capabilityRef !== 'leeway.continuum' || d.consumerId !== 'device-bridge' ||
      d.writeEnabled !== false || !validId(d.ownerId) || !validId(d.bodyId) ||
      typeof consumer?.status !== 'function' || typeof consumer?.getContent !== 'function') {
    fail('CANONICAL_CONTINUUM_READONLY_CONSUMER_REQUIRED');
  }
  if (context?.ownerId !== d.ownerId || context?.bodyId !== d.bodyId ||
      !Array.isArray(context.capabilities) || !context.capabilities.includes('continuum.read')) {
    fail('CONTINUUM_READBACK_OWNER_SCOPE_DENIED');
  }
  if (!validId(recordId) || !/^[a-f0-9]{64}$/.test(expectedSha256 || '')) {
    fail('CONTINUUM_READBACK_EXPECTATION_REQUIRED');
  }

  // The existing consumer enforces owner authorization again, through the
  // injected trusted host. This probe never creates a database or archive.
  const liveStatus = await consumer.status(context);
  if (liveStatus?.ownerId !== d.ownerId || liveStatus?.bodyId !== d.bodyId) {
    fail('CONTINUUM_READBACK_LIVE_IDENTITY_MISMATCH');
  }
  const content = await consumer.getContent(recordId, context);
  if (!(content?.bytes instanceof Uint8Array) ||
      content.record?.contentSha256 !== expectedSha256 ||
      sha(content.bytes) !== expectedSha256) {
    fail('CONTINUUM_READBACK_DIGEST_MISMATCH');
  }

  return Object.freeze({
    source: 'INJECTED_CANONICAL_CONTINUUM_CONSUMER',
    check: 'OWNER_SCOPED_RECORD_READBACK',
    result: 'OBSERVED_PASS',
    recordId,
    contentSha256: expectedSha256,
    byteLength: content.bytes.byteLength,
    independentVeritas: 'NOT_PROBED',
    receiptLedger: 'NOT_PROBED',
    learningLedger: 'NOT_PROBED',
    productionAdmission: 'NOT_GRANTED_BY_PROBE'
  });
}
