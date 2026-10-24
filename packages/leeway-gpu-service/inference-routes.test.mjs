// HTTP integration with a diagnostic provider stub; no production authority or GPU is asserted.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {listenGpuService} from './service.mjs';
import {setGpuPreference} from './preferences.mjs';
const H = '1'.repeat(64);
async function fixture(t, {enabled = true, authenticateClient, generate, provider = true} = {}) {
  const root = await mkdtemp(join(tmpdir(), 'leeway-gpu-http-'));
  const preferenceFile = join(root, 'preferences.json');
  setGpuPreference(enabled, {file: preferenceFile});
  let calls = 0;
  const binding = provider ? {
    async capabilities() { return {schema: 'leeway.gpu.inference.v1', serviceId: 'leeway.gpu.service',
      modelInference: true, gpuVerified: true, receiptId: 'DIAGNOSTIC_FIXTURE_ONLY', models: ['fixture-model']}; },
    async activateModel(value, {client}) { calls++; assert.equal(client.clientId, 'registered-client');
      return {serviceId: 'leeway.gpu.service', modelId: value.modelId, backend: 'LEEWAY_GPU'}; },
    async generate(value, context) {
      calls++; if (generate) return generate(value, context);
      const requestId = value.requestId || 'fixture-request', sessionId = value.sessionId || 'fixture-session';
      const hashes = ['requestHash', 'resultHash', 'modelSha256', 'tokenizerSha256', 'implementationSha256',
        'formulaReceiptSha256', 'formulaReplaySha256', 'ldWmdReceiptSha256', 'continuumReceiptSha256',
        'postReceiptSha256', 'commitAttestationSha256', 'receiptLedgerReceiptSha256', 'learningLedgerReceiptSha256'];
      return {serviceId: 'leeway.gpu.service', modelId: value.modelId, backend: 'LEEWAY_GPU',
        requestId, sessionId, text: '4', canonicalReceiptIssued: true,
        executionBinding: {requestId, sessionId, ...Object.fromEntries(hashes.map(key => [key, H]))}};
    }
  } : null;
  const authenticate = authenticateClient || (async ({request}) => request.headers.authorization === 'Bearer diagnostic-test-token' ? {clientId: 'registered-client'} : null);
  const server = await listenGpuService({port: 0, preferenceFile, inferenceProvider: binding, authenticateClient: authenticate});
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(root, {recursive: true, force: true}); });
  const base = 'http://127.0.0.1:' + server.address().port;
  const post = (path, body, headers = {}) => fetch(base + path, {method: 'POST', headers: {
    'content-type': 'application/json', authorization: 'Bearer diagnostic-test-token', ...headers}, body: JSON.stringify(body)});
  return {base, post, calls: () => calls};
}

test('existing service exposes compatible capabilities, activation and generation routes', async t => {
  const f = await fixture(t);
  const capability = await fetch(f.base + '/v1/capabilities').then(r => r.json());
  assert.equal(capability.serviceId, 'leeway.gpu.service'); assert.deepEqual(capability.models, ['fixture-model']);
  assert.equal((await f.post('/v1/models/activate', {modelId: 'fixture-model'})).status, 200);
  const response = await f.post('/v1/generate', {modelId: 'fixture-model', prompt: '2+2', requestId: 'chosen-request'});
  assert.equal(response.status, 200); const result = await response.json();
  assert.equal(result.text, '4'); assert.equal(result.requestId, 'chosen-request'); assert.equal(f.calls(), 2);
});
test('unbound service denies execution and advertises unavailable inference', async t => {
  const f = await fixture(t, {provider: false});
  const capability = await fetch(f.base + '/v1/capabilities').then(r => r.json()); assert.equal(capability.gpuVerified, false);
  assert.equal((await f.post('/v1/generate', {modelId: 'fixture-model', prompt: 'a'})).status, 503);
});
test('authentication rejects anonymous callers and boolean approval callbacks', async t => {
  const f = await fixture(t);
  assert.equal((await f.post('/v1/generate', {modelId: 'fixture-model', prompt: 'a'}, {authorization: ''})).status, 401);
  assert.equal(f.calls(), 0);
  const other = await fixture(t, {authenticateClient: async () => true});
  assert.equal((await other.post('/v1/models/activate', {modelId: 'fixture-model'})).status, 401);
});
test('caller provider, source and authority fields are rejected before provider execution', async t => {
  const f = await fixture(t);
  for (const extra of [{authority: true}, {provider: 'caller'}, {rangeBaseUrl: 'http://127.0.0.1/'}])
    assert.equal((await f.post('/v1/generate', {modelId: 'fixture-model', prompt: 'a', ...extra})).status, 400);
  assert.equal(f.calls(), 0);
});
test('opt-out blocks governed inference without changing preference or invoking preview', async t => {
  const f = await fixture(t, {enabled: false});
  assert.equal((await f.post('/v1/models/activate', {modelId: 'fixture-model'})).status, 403); assert.equal(f.calls(), 0);
});
test('cross-origin and oversized requests are refused before execution', async t => {
  const f = await fixture(t);
  assert.equal((await f.post('/v1/generate', {modelId: 'fixture-model', prompt: 'a'}, {origin: 'https://outside.invalid'})).status, 403);
  assert.equal((await f.post('/v1/generate', {modelId: 'fixture-model', prompt: 'a'.repeat(70000)})).status, 413);
  assert.equal(f.calls(), 0);
});
test('provider cannot return text without complete request-bound audit evidence', async t => {
  const f = await fixture(t, {generate: async () => ({serviceId: 'leeway.gpu.service', modelId: 'fixture-model',
    backend: 'LEEWAY_GPU', text: 'must be withheld', canonicalReceiptIssued: true})});
  const response = await f.post('/v1/generate', {modelId: 'fixture-model', prompt: 'a'});
  assert.equal(response.status, 503); assert.equal((await response.json()).text, undefined);
});
test('owner turning the existing switch off cancels an active request', async t => {
  let started; const pending = new Promise(resolve => { started = resolve; });
  const f = await fixture(t, {generate: async (_, {signal}) => { started();
    return new Promise((_, reject) => signal.addEventListener('abort', () => reject(Error('GPU_PROVIDER_CANCELLED')), {once: true})); }});
  const generation = f.post('/v1/generate', {modelId: 'fixture-model', prompt: 'a'});
  await pending;
  const control = await fetch(f.base + '/v1/control').then(r => r.json());
  const off = await f.post('/v1/control', {requestedEnabled: false}, {origin: f.base, 'x-leeway-csrf': control.csrfToken});
  assert.equal(off.status, 200); assert.equal((await generation).status, 503);
});
