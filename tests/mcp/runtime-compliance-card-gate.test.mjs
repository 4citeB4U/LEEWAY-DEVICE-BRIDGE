import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntimeComplianceCardGate } from '../../operator/runtime-compliance-card-gate.mjs';
import { digest } from '../../packages/protocol/index.mjs';

test('Runtime Fabric card gate accepts only an unchanged validated card', async () => {
  const card = { taskId: 'http-card-test', action: 'tool.execution' };
  const gate = createRuntimeComplianceCardGate({
    baseUrl: 'http://127.0.0.1:4012',
    fetchImpl: async (_url, init) => {
      const request = JSON.parse(init.body);
      assert.deepEqual(request.leewayComplianceCard, card);
      return { ok: true, json: async () => ({ valid: true, card }) };
    },
  });
  const result = await gate({ complianceCard: card });
  assert.deepEqual(result, { valid: true, cardHash: digest(card), authority: 'LEEWAY_RUNTIME_FABRIC' });
});

test('Runtime Fabric card gate rejects reconstructed or invalid responses', async () => {
  const card = { taskId: 'http-card-test', action: 'tool.execution' };
  const gate = createRuntimeComplianceCardGate({
    baseUrl: 'http://localhost:4012',
    fetchImpl: async () => ({ ok: true, json: async () => ({ valid: true, card: { ...card, sourceObjectId: 'reconstructed' } }) }),
  });
  assert.equal(await gate({ complianceCard: card }), false);
  assert.equal(await gate({ complianceCard: null }), false);
});

test('Runtime Fabric HTTP card gate refuses non-loopback plain HTTP', () => {
  assert.throws(() => createRuntimeComplianceCardGate({ baseUrl: 'http://example.invalid:4012' }), /RUNTIME_FABRIC_HTTP_MUST_BE_LOOPBACK/);
});
