/*
 * Receipt Authority custody adapter.  It never signs an authority decision:
 * the trusted host supplies admission and readback envelopes from an
 * independent verifier for each exact receipt hash.
 */
import { createHash } from 'node:crypto';

const IDENT = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function receiptPayloadSha256(evidence) {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) throw new Error('RECEIPT_EVIDENCE_INVALID');
  return createHash('sha256').update(canonical(evidence), 'utf8').digest('hex');
}

function loopbackEndpoint(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('RECEIPT_AUTHORITY_URL_INVALID'); }
  if (url.protocol !== 'http:' || !['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname) || url.username || url.password) {
    throw new Error('RECEIPT_AUTHORITY_LOOPBACK_REQUIRED');
  }
  return url.href.replace(/\/$/, '');
}

async function post(fetchImpl, url, body) {
  let response;
  try {
    response = await fetchImpl(url, {
      method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body), redirect: 'error', signal: AbortSignal.timeout(5000),
    });
  } catch { throw new Error('RECEIPT_AUTHORITY_UNAVAILABLE'); }
  let payload;
  try { payload = await response.json(); } catch { throw new Error('RECEIPT_AUTHORITY_RESPONSE_INVALID'); }
  if (!response.ok) throw new Error('RECEIPT_AUTHORITY_DENIED');
  return payload;
}

export function createReceiptAuthoritySink({ endpoint, tenant, producer, workId, admissionEnvelopeProvider, fetchImpl = globalThis.fetch } = {}) {
  const base = loopbackEndpoint(endpoint);
  if (![tenant, producer, workId].every(value => typeof value === 'string' && IDENT.test(value))) throw new Error('RECEIPT_AUTHORITY_IDENTITY_INVALID');
  if (typeof admissionEnvelopeProvider !== 'function' || typeof fetchImpl !== 'function') throw new Error('RECEIPT_AUTHORITY_PROVIDER_REQUIRED');

  return async function receiptAuthoritySink(evidence) {
    const eventId = evidence?.id;
    if (typeof eventId !== 'string' || !IDENT.test(eventId)) throw new Error('RECEIPT_EVENT_ID_INVALID');
    const payloadSha256 = receiptPayloadSha256(evidence);
    const admission = await admissionEnvelopeProvider({
      action: 'ADMIT_RECEIPT', tenant, category: 'device-bridge', producer, eventId, workId, payloadSha256, evidence,
    });
    const admitted = await post(fetchImpl, `${base}/v1/receipts`, {
      verification: admission, tenant, category: 'device-bridge', producer, event_id: eventId, work_id: workId, evidence,
    });
    if (!Number.isInteger(admitted?.receipt_id) || admitted.payload_sha256 !== payloadSha256 || admitted.durable_readback !== true) {
      throw new Error('RECEIPT_AUTHORITY_ADMISSION_INVALID');
    }
    const readbackEnvelope = await admissionEnvelopeProvider({
      action: 'READ_RECEIPT', tenant, receiptId: admitted.receipt_id, payloadSha256, evidence,
    });
    const readback = await post(fetchImpl, `${base}/v1/receipts/read`, {
      verification: readbackEnvelope, tenant, receipt_id: admitted.receipt_id,
    });
    if (readback?.receipt_id !== admitted.receipt_id || readback.payload_sha256 !== payloadSha256 || readback.durable_readback !== true) {
      throw new Error('RECEIPT_AUTHORITY_READBACK_INVALID');
    }
  };
}
