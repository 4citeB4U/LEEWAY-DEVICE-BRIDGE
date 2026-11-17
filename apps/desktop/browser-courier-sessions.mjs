/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.DESKTOP.BROWSER_COURIER
TAG: LEEWAY_BROWSER_COURIER_SESSIONS_V1
WHO: LeeWay Industries; WHAT: observation-bound browser composer adapter.
WHEN: 2026-11-16; WHERE: apps/desktop/browser-courier-sessions.mjs.
WHY: Route enrolled browser workers through the same governed Bridge capability surface.
HOW: Host-injected worker bindings, correlated gateway requests, expiring observations, exact input hashes.
AUTHORITY: Transport adapter only; Runtime admission and user authorization remain upstream.
LICENSE: MIT
*/
import { createHash, randomUUID } from 'node:crypto';

const TTL_MS = 30_000;
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const digest = value => createHash('sha256').update(value, 'utf8').digest('hex');

function normalizeBindings(input) {
  if (!(input instanceof Map) || input.size === 0) throw new Error('BROWSER_COURIER_BINDINGS_REQUIRED');
  return new Map([...input].map(([workerId, binding]) => {
    if (typeof workerId !== 'string' || !workerId.trim() || !binding ||
        typeof binding.extensionId !== 'string' || !binding.extensionId.trim() ||
        !Array.isArray(binding.allowedOrigins) || binding.allowedOrigins.length === 0) {
      throw new Error('BROWSER_COURIER_BINDING_INVALID');
    }
    const origins = binding.allowedOrigins.map(value => {
      const parsed = new URL(value);
      if (!['https:', 'http:'].includes(parsed.protocol) || parsed.pathname !== '/' || parsed.search || parsed.hash) {
        throw new Error('BROWSER_COURIER_ORIGIN_INVALID');
      }
      return parsed.origin;
    });
    return [workerId, Object.freeze({ extensionId: binding.extensionId, allowedOrigins: Object.freeze(origins) })];
  }));
}

export class BrowserCourierSessions {
  constructor({ gateway, bindings, now = Date.now } = {}) {
    if (!gateway || typeof gateway.request !== 'function') throw new Error('BROWSER_COURIER_GATEWAY_REQUIRED');
    this.gateway = gateway;
    this.bindings = normalizeBindings(bindings);
    this.now = now;
    this.observations = new Map();
  }

  supports(args) { return typeof args?.workerId === 'string' && this.bindings.has(args.workerId); }
  owns(observationId) { this.expire(); return this.observations.has(observationId); }
  binding(args) {
    const binding = this.bindings.get(args?.workerId);
    if (!binding) throw new Error('BROWSER_WORKER_NOT_ENROLLED');
    return binding;
  }
  expire() {
    const now = this.now();
    for (const [id, value] of this.observations) if (value.expiresAt <= now) this.observations.delete(id);
  }
  async request(binding, type, payload, expectedType, timeoutMs = 5000) {
    const requestId = randomUUID();
    const result = await this.gateway.request(binding.extensionId, { type, requestId, ...payload }, { expectedType, timeoutMs });
    if (!result || result.requestId !== requestId || result.type !== expectedType) throw new Error('BROWSER_COURIER_RESPONSE_INVALID');
    if (result.ok !== true) throw new Error(typeof result.error === 'string' && /^[A-Z0-9_]{3,120}$/.test(result.error) ? result.error : 'BROWSER_COURIER_COMMAND_FAILED');
    return result;
  }
  async observe(args) {
    const binding = this.binding(args);
    const result = await this.request(binding, 'COURIER_COMPOSER_OBSERVE', { nonce: randomUUID() }, 'COURIER_COMPOSER_OBSERVE_RESULT');
    if (!uuid(result.targetId) || typeof result.origin !== 'string' || !binding.allowedOrigins.includes(result.origin)) {
      throw new Error('BROWSER_COURIER_ORIGIN_OR_TARGET_MISMATCH');
    }
    if (args.expectedUrl && new URL(args.expectedUrl).origin !== result.origin) throw new Error('BROWSER_URL_IDENTITY_MISMATCH');
    const observationId = randomUUID(), actionTargetId = randomUUID();
    this.expire();
    this.observations.set(observationId, {
      workerId: args.workerId, pid: args.pid, binding, browserTargetId: result.targetId,
      actionTargetId, expiresAt: this.now() + TTL_MS, inputHash: null, submitted: false,
    });
    return {
      app: args.workerId, pid: args.pid, processName: 'browser-courier', processStartedUtc: new Date(this.now()).toISOString(),
      windowHandle: 0, title: args.expectedTitle || args.workerId, surfaceUrl: args.expectedUrl || result.origin,
      controls: [], totalControls: 2, truncated: false, observationId, expiresInMs: TTL_MS,
      editableTargets: [{ targetId: result.targetId, name: 'Browser composer', controlType: 'DOMComposer', enabled: true }],
      actionTargets: [{ targetId: actionTargetId, name: 'Send', controlType: 'DOMButton', enabled: result.hasSubmitButton === true }],
    };
  }
  require(args) {
    this.expire();
    const value = this.observations.get(args.observationId);
    if (!value) throw new Error('WINDOW_OBSERVATION_EXPIRED');
    if (value.workerId !== args.workerId || value.pid !== args.pid || value.browserTargetId !== args.targetId) throw new Error('WINDOW_OBSERVATION_IDENTITY_MISMATCH');
    return value;
  }
  async input(args) {
    const value = this.require(args);
    await this.request(value.binding, 'COURIER_COMPOSER_INPUT', { targetId: value.browserTargetId, text: args.text }, 'COURIER_COMPOSER_INPUT_RESULT');
    value.inputHash = digest(args.text.trim());
    return { observationId: args.observationId, targetId: args.targetId, textSha256: value.inputHash, readbackVerified: true };
  }
  async submit(args) {
    const value = this.require(args);
    if (value.actionTargetId !== args.actionTargetId || value.inputHash !== args.expectedTextSha256 || value.submitted) throw new Error('WINDOW_SUBMIT_BINDING_MISMATCH');
    await this.request(value.binding, 'COURIER_COMPOSER_SUBMIT', { targetId: value.browserTargetId }, 'COURIER_COMPOSER_SUBMIT_RESULT');
    value.submitted = true;
    return { observationId: args.observationId, submitted: true, expectedTextSha256: args.expectedTextSha256 };
  }
  async read(args) {
    const value = this.observations.get(args.observationId);
    if (!value || value.workerId !== args.workerId || value.pid !== args.pid || value.inputHash !== args.expectedTextSha256 || !value.submitted) throw new Error('WINDOW_READ_BINDING_MISMATCH');
    const result = await this.request(value.binding, 'COURIER_RESPONSE_READ', { responseNonce: args.responseNonce }, 'COURIER_RESPONSE_READ_RESULT', args.timeoutMs);
    if (result.isStreaming === true) throw new Error('WINDOW_RESPONSE_STILL_STREAMING');
    if (typeof result.text !== 'string' || !result.text.includes(args.responseNonce)) throw new Error('WINDOW_RESPONSE_NONCE_NOT_OBSERVED');
    return { observationId: args.observationId, responseNonce: args.responseNonce, text: result.text, textSha256: digest(result.text), readbackVerified: true };
  }
}
