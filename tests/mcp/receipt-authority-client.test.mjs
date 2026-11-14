import test from 'node:test';
import assert from 'node:assert/strict';
import { createReceiptAuthoritySink, receiptPayloadSha256 } from '../../operator/identity/receipt-authority-client.mjs';

const evidence = { id: 'receipt-001', outcome: 'ADMITTED', sha256: 'a'.repeat(64) };

test('receipt client submits externally signed admission then verifies exact readback', async () => {
  const calls = [];
  const payloadSha256 = receiptPayloadSha256(evidence);
  const sink = createReceiptAuthoritySink({
    endpoint: 'http://127.0.0.1:4104', tenant: 'tenant-a', producer: 'bridge-a', workId: 'work-a',
    admissionEnvelopeProvider: async request => ({ signed: request.action }),
    fetchImpl: async (url, options) => {
      calls.push({ url, body: JSON.parse(options.body) });
      return { ok: true, json: async () => url.endsWith('/read')
        ? { receipt_id: 7, payload_sha256: payloadSha256, durable_readback: true }
        : { receipt_id: 7, payload_sha256: payloadSha256, durable_readback: true } };
    },
  });
  await sink(evidence);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body.event_id, evidence.id);
  assert.equal(calls[0].body.category, 'device-bridge');
  assert.equal(calls[1].body.receipt_id, 7);
});

test('receipt client denies non-loopback authority and malformed readback', async () => {
  assert.throws(() => createReceiptAuthoritySink({ endpoint: 'https://example.test', tenant: 'tenant-a', producer: 'bridge-a', workId: 'work-a', admissionEnvelopeProvider: async () => ({}) }), /LOOPBACK_REQUIRED/);
  const sink = createReceiptAuthoritySink({
    endpoint: 'http://localhost:4104', tenant: 'tenant-a', producer: 'bridge-a', workId: 'work-a', admissionEnvelopeProvider: async () => ({}),
    fetchImpl: async () => ({ ok: true, json: async () => ({ receipt_id: 7, payload_sha256: 'wrong', durable_readback: true }) }),
  });
  await assert.rejects(sink(evidence), /ADMISSION_INVALID/);
});
