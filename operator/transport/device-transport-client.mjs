/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.TRANSPORT.CLIENT
TAG: LEEWAY.DEVICE.TRANSPORT.OUTBOUND.DEVICE.V1
5WH:
WHAT = Device-side outbound transport client: dial out, answer a server challenge with proof of
       key possession, serve correlated read-only commands, reconnect securely.
WHY  = The device must initiate the connection and prove identity without any shared static token
       and without the gateway needing an inbound route to the workstation.
WHO  = Any enrolled device (Windows, Linux, Android, Apple) running its own native adapter.
WHERE= operator/transport/device-transport-client.mjs
WHEN = 2026-11-23
HOW  = Injected transport + injected signer; the private key never enters this module.
AUTHORITY = Transport only. Execution stays with the device adapter and the canonical Bridge gates.
LICENSE = MIT
*/

import {
  TRANSPORT_DENIAL, TRANSPORT_HELLO_SCHEMA, TRANSPORT_LIMITS,
  TransportDenied, canonicalHelloTranscript, deny, isDeviceId, isPlatform, isOwnerSubject,
  parseInstant, randomChallenge,
} from './device-transport-contract.mjs';
import { deviceResultDigest } from './device-transport-gateway.mjs';

const AUTH_TIMEOUT_MS = 20_000;

function assertIdentity(identity) {
  if (!identity || typeof identity !== 'object') deny(TRANSPORT_DENIAL.INVALID_INPUT);
  const { deviceId, platform, ownerSubject, audience, keyId, issuerId, registrationDigest } = identity;
  if (!isDeviceId(deviceId)) deny(TRANSPORT_DENIAL.INVALID_INPUT);
  if (!isPlatform(platform)) deny(TRANSPORT_DENIAL.INVALID_INPUT);
  if (!isOwnerSubject(ownerSubject)) deny(TRANSPORT_DENIAL.INVALID_INPUT);
  if (typeof audience !== 'string' || audience.length === 0 || audience.length > TRANSPORT_LIMITS.maxAudienceLength) {
    deny(TRANSPORT_DENIAL.INVALID_INPUT);
  }
  if (typeof keyId !== 'string' || keyId.length === 0 || keyId.length > TRANSPORT_LIMITS.maxKeyIdLength) {
    deny(TRANSPORT_DENIAL.INVALID_INPUT);
  }
  if (typeof issuerId !== 'string' || issuerId.length === 0) deny(TRANSPORT_DENIAL.INVALID_INPUT);
  if (typeof registrationDigest !== 'string' || !/^[a-f0-9]{64}$/i.test(registrationDigest)) {
    deny(TRANSPORT_DENIAL.INVALID_INPUT);
  }
}

/** Exponential backoff with jitter, bounded. No infinite retry, no fixed shared secret. */
export function createBackoff({ baseMs = 250, maxMs = 15_000, factor = 2, jitter = Math.random } = {}) {
  return function delayFor(attempt) {
    const raw = Math.min(maxMs, baseMs * Math.pow(factor, Math.max(0, attempt)));
    const spread = raw * 0.25 * jitter();
    return Math.max(baseMs, Math.round(raw - spread));
  };
}

/**
 * Build the device transport client.
 *
 * `signer` is supplied by the platform layer and must be backed by approved native secure
 * storage. It exposes `{ keyId, sign(bytes) }` and nothing else: this module never sees,
 * stores, logs or serializes private key material.
 */
export function createDeviceTransportClient({
  identity,
  credential,
  signer,
  executor,
  connect,
  now = Date.now,
  helloTtlMs = 60_000,
  nonceFactory = randomChallenge,
  backoff = createBackoff(),
  maxAttempts = 6,
  log = () => {},
} = {}) {
  assertIdentity(identity);
  if (!credential || typeof credential !== 'object') deny(TRANSPORT_DENIAL.INVALID_INPUT);
  if (!signer || typeof signer.sign !== 'function' || signer.keyId !== identity.keyId) {
    deny(TRANSPORT_DENIAL.INVALID_INPUT);
  }
  if (typeof connect !== 'function') deny(TRANSPORT_DENIAL.INVALID_INPUT);
  if (executor !== undefined && typeof executor !== 'function') deny(TRANSPORT_DENIAL.INVALID_INPUT);
  if (!Number.isInteger(helloTtlMs) || helloTtlMs <= 0 || helloTtlMs > TRANSPORT_LIMITS.maxCredentialTtlMs) {
    deny(TRANSPORT_DENIAL.INVALID_INPUT);
  }

  let activeTransport = null;
  let session = null;
  let stopped = false;

  function buildHello(challenge) {
    const issuedAt = now();
    return {
      schema: TRANSPORT_HELLO_SCHEMA,
      deviceId: identity.deviceId,
      platform: identity.platform,
      ownerSubject: identity.ownerSubject,
      audience: identity.audience,
      keyId: identity.keyId,
      registrationDigest: identity.registrationDigest,
      issuerId: identity.issuerId,
      challenge,
      nonce: nonceFactory(),
      issuedAt: new Date(issuedAt).toISOString(),
      expiresAt: new Date(issuedAt + helloTtlMs).toISOString(),
    };
  }

  async function signHello(body) {
    const bytes = canonicalHelloTranscript(body);
    const signature = await signer.sign(Buffer.from(bytes, 'utf8'));
    if (!Buffer.isBuffer(signature) || signature.length === 0) {
      deny(TRANSPORT_DENIAL.PROOF_SIGNATURE);
    }
    return Object.freeze({ ...body, signature: signature.toString('base64url') });
  }

  /** Authenticate one connection. Resolves to the accepted session or rejects with a code. */
  function authenticate(transport) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => finish(new TransportDenied(TRANSPORT_DENIAL.CHALLENGE_REQUIRED)), AUTH_TIMEOUT_MS);
      function finish(error, value) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        error ? reject(error) : resolve(value);
      }
      transport.onMessage(async raw => {
        let message;
        try { message = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch {
          return finish(new TransportDenied(TRANSPORT_DENIAL.INVALID_INPUT));
        }
        if (settled) return;

        if (message?.type === 'transport-challenge') {
          if (typeof message.challenge !== 'string' || message.challenge.length === 0) {
            return finish(new TransportDenied(TRANSPORT_DENIAL.CHALLENGE_REQUIRED));
          }
          if (message.audience !== undefined && message.audience !== identity.audience) {
            return finish(new TransportDenied(TRANSPORT_DENIAL.AUDIENCE_MISMATCH));
          }
          const expiresAt = message.expiresAt === undefined ? null : parseInstant(message.expiresAt);
          if (message.expiresAt !== undefined && (expiresAt === null || expiresAt <= now())) {
            return finish(new TransportDenied(TRANSPORT_DENIAL.CHALLENGE_EXPIRED));
          }
          try {
            const hello = await signHello(buildHello(message.challenge));
            transport.send(JSON.stringify({ type: 'transport-hello', hello, credential }));
          } catch (error) {
            return finish(error instanceof TransportDenied ? error
              : new TransportDenied(TRANSPORT_DENIAL.PROOF_SIGNATURE));
          }
          return;
        }
        if (message?.type === 'transport-ack') {
          if (message.deviceId !== identity.deviceId) {
            return finish(new TransportDenied(TRANSPORT_DENIAL.DEVICE_ID_SUBSTITUTION));
          }
          return finish(null, Object.freeze({ ...message, deviceId: identity.deviceId }));
        }
        if (message?.type === 'transport-deny') {
          const code = typeof message.error === 'string' && Object.values(TRANSPORT_DENIAL).includes(message.error)
            ? message.error
            : TRANSPORT_DENIAL.INVALID_INPUT;
          return finish(new TransportDenied(code));
        }
      });
    });
  }

  async function serve(transport) {
    transport.onMessage(async raw => {
      let message;
      try { message = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return; }
      if (message?.type !== 'command') return;
      if (message.deviceId !== undefined && message.deviceId !== identity.deviceId) {
        transport.send(JSON.stringify({
          type: 'result', commandId: message.commandId, deviceId: identity.deviceId,
          capability: message.capability, ok: false, error: TRANSPORT_DENIAL.DEVICE_ID_SUBSTITUTION,
        }));
        return;
      }
      const commandId = typeof message.commandId === 'string' ? message.commandId : null;
      const capability = typeof message.capability === 'string' ? message.capability : null;
      if (!commandId || !capability) return;

      let ok = false;
      let result = null;
      let error = null;
      try {
        if (typeof executor !== 'function') throw new Error('NO_LOCAL_EXECUTOR');
        result = await executor(capability, message.arguments ?? {});
        ok = true;
      } catch (caught) {
        error = /^[A-Z][A-Z0-9_]{0,127}$/.test(caught?.message || '') ? caught.message : 'LOCAL_EXECUTION_FAILED';
      }
      transport.send(JSON.stringify({
        type: 'result',
        commandId,
        deviceId: identity.deviceId,
        capability,
        ok,
        ...(ok ? { result } : { error }),
        resultDigest: deviceResultDigest({
          deviceId: identity.deviceId, commandId, capability, ok, result, error,
        }),
      }));
    });
  }

  /** One full attempt: connect, authenticate, serve until close. */
  async function runOnce() {
    const transport = await connect();
    activeTransport = transport;
    await authenticate(transport);
    await serve(transport);
    return transport;
  }

  return Object.freeze({
    get session() { return session; },
    get connected() { return activeTransport !== null && session !== null; },
    async connect() {
      const transport = await runOnce();
      session = Object.freeze({ deviceId: identity.deviceId, authenticated: true });
      return session;
    },
    /**
     * Reconnect with bounded exponential backoff. Each attempt performs a fresh challenge
     * exchange, so a reconnect never reuses a challenge, a nonce or a static token.
     */
    async start() {
      stopped = false;
      let attempt = 0;
      for (;;) {
        if (stopped) return null;
        try {
          const transport = await runOnce();
          session = Object.freeze({ deviceId: identity.deviceId, authenticated: true });
          attempt = 0;
          log(JSON.stringify({ transport: 'connected', deviceId: identity.deviceId }));
          return transport;
        } catch (error) {
          attempt += 1;
          const code = error instanceof TransportDenied ? error.code : 'TRANSPORT_CONNECT_FAILED';
          log(JSON.stringify({ transport: 'retry', deviceId: identity.deviceId, attempt, code }));
          if (attempt >= maxAttempts) throw error;
          await new Promise(resolve => setTimeout(resolve, backoff(attempt - 1)));
        }
      }
    },
    stop() {
      stopped = true;
      session = null;
      if (activeTransport && typeof activeTransport.close === 'function') activeTransport.close();
      activeTransport = null;
    },
  });
}
