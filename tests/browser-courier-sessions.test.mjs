import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { BrowserCourierSessions } from '../apps/desktop/browser-courier-sessions.mjs';

const sha = value => createHash('sha256').update(value, 'utf8').digest('hex');

test('browser courier binds observe, input, submit, and nonce read to one enrolled worker', async () => {
  const browserTargetId = randomUUID();
  const calls = [];
  const gateway = { async request(extensionId, message, options) {
    calls.push({ extensionId, message, options });
    if (message.type === 'COURIER_COMPOSER_OBSERVE') return { type: options.expectedType, requestId: message.requestId, ok: true, targetId: browserTargetId, origin: 'https://gemini.google.com', hasSubmitButton: true };
    if (message.type === 'COURIER_COMPOSER_INPUT') return { type: options.expectedType, requestId: message.requestId, ok: true };
    if (message.type === 'COURIER_COMPOSER_SUBMIT') return { type: options.expectedType, requestId: message.requestId, ok: true, submitted: true };
    return { type: options.expectedType, requestId: message.requestId, ok: true, isStreaming: false, text: `answer ${message.responseNonce}` };
  } };
  const sessions = new BrowserCourierSessions({ gateway, bindings: new Map([
    ['worker-gemini', { extensionId: 'extension-1', allowedOrigins: ['https://gemini.google.com'] }],
  ]) });
  const observed = await sessions.observe({ workerId: 'worker-gemini', pid: 99, expectedUrl: 'https://gemini.google.com/app' });
  assert.equal(observed.editableTargets[0].targetId, browserTargetId);
  const input = await sessions.input({ workerId: 'worker-gemini', pid: 99, observationId: observed.observationId, targetId: browserTargetId, text: 'hello' });
  assert.equal(input.textSha256, sha('hello'));
  await sessions.submit({ workerId: 'worker-gemini', pid: 99, observationId: observed.observationId, targetId: browserTargetId, actionTargetId: observed.actionTargets[0].targetId, expectedTextSha256: sha('hello') });
  const read = await sessions.read({ workerId: 'worker-gemini', pid: 99, observationId: observed.observationId, expectedTextSha256: sha('hello'), responseNonce: 'nonce-12345678', timeoutMs: 1000 });
  assert.match(read.text, /nonce-12345678/);
  assert.equal(calls.length, 4);
});

test('browser courier denies an observed origin outside the worker binding', async () => {
  const gateway = { async request(_extensionId, message, options) { return { type: options.expectedType, requestId: message.requestId, ok: true, targetId: randomUUID(), origin: 'https://attacker.example', hasSubmitButton: true }; } };
  const sessions = new BrowserCourierSessions({ gateway, bindings: new Map([
    ['worker', { extensionId: 'extension-1', allowedOrigins: ['https://gemini.google.com'] }],
  ]) });
  await assert.rejects(() => sessions.observe({ workerId: 'worker', pid: 1 }), /BROWSER_COURIER_ORIGIN_OR_TARGET_MISMATCH/);
});
