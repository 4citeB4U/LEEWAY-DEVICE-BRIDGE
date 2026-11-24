/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.TRANSPORT.TEST
TAG: LEEWAY.DEVICE.TRANSPORT.AUTH.NEGATIVE_AND_POSITIVE.V1
WHAT = Prove the portable authenticated outbound transport contract: positive handshake and the ten
       required negative controls.
WHY  = A transport that authenticates with a static shared token cannot be promoted; the universal
       gateway needs device-bound proof-of-possession verified against trusted enrollment.
HOW  = Ephemeral Ed25519 fixture keys generated per run. Nothing here is enrolled, trusted or
       promoted into production registration; no fixture secret is written to disk.
LICENSE: Internal LeeWay governance.
*/

import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';

import {
  TRANSPORT_CREDENTIAL_SCHEMA, TRANSPORT_DENIAL, TRANSPORT_HELLO_SCHEMA,
  TransportDenied, canonicalCredentialPayload, canonicalHelloTranscript, randomChallenge,
} from '../../operator/transport/device-transport-contract.mjs';
import {
  createChallengeIssuer, verifyDeviceHello, verifyHelloProof, verifyTransportCredential,
} from '../../operator/transport/device-transport-verifier.mjs';
import {
  acceptDeviceResult, createTransportCorrelation, deviceResultDigest, issueCommand,
  offlineDeviceResult,
} from '../../operator/transport/device-transport-gateway.mjs';
import {
  createBackoff, createDeviceTransportClient,
} from '../../operator/transport/device-transport-client.mjs';

const FIXED_NOW = Date.parse('2026-11-23T20:00:00.000Z');
const AUDIENCE = 'https://gateway.test.invalid/device-transport';
const OWNER = '397621082842543343';
const DEVICE_ID = 'fixture-device-01';
const REGISTRATION_DIGEST = 'a'.repeat(64);

function signBase64url(privateKey, bytes) {
  return sign(null, Buffer.from(bytes, 'utf8'), privateKey).toString('base64url');
}

/** Ephemeral, per-run fixture. Never promoted, never written to disk. */
function makeFixture({ now = FIXED_NOW, ttlMs = 60_000, platform = 'linux' } = {}) {
  const issuerKeys = generateKeyPairSync('ed25519');
  const deviceKeys = generateKeyPairSync('ed25519');
  const attackerKeys = generateKeyPairSync('ed25519');

  const issuerId = 'leeway.test.transport.issuer.v1';
  const issuerKeyId = 'test-issuer-key-001';
  const deviceKeyId = 'test-device-key-001';

  const trustedIssuerRegistry = Object.freeze({
    [issuerId]: Object.freeze({
      issuerId,
      keyId: issuerKeyId,
      algorithm: 'Ed25519',
      status: 'ACTIVE',
      publicKeySpki: issuerKeys.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    }),
  });

  const devicePublicKeySpki = deviceKeys.publicKey.export({ type: 'spki', format: 'pem' }).toString();

  const credentialBody = {
    schema: TRANSPORT_CREDENTIAL_SCHEMA,
    issuerId,
    keyId: issuerKeyId,
    deviceId: DEVICE_ID,
    platform,
    ownerSubject: OWNER,
    audience: AUDIENCE,
    registrationDigest: REGISTRATION_DIGEST,
    devicePublicKeySpki,
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
  };
  const credential = Object.freeze({
    ...credentialBody,
    signature: signBase64url(issuerKeys.privateKey, canonicalCredentialPayload(credentialBody)),
  });

  const trustedDeviceRegistry = new Map([[DEVICE_ID, Object.freeze({
    id: DEVICE_ID,
    deviceId: DEVICE_ID,
    platform,
    identityVerified: true,
    registrationState: 'TRUSTED_REGISTRY_READ',
    identitySource: 'WINDOWS_CIM_READONLY',
    passportAuthority: 'OWNER_SIGNED_WINDOWS_PASSPORT',
    ownerSubject: OWNER,
    passportSha256: REGISTRATION_DIGEST,
  })]]);

  function hello({ challenge, privateKey = deviceKeys.privateKey, overrides = {} } = {}) {
    const body = {
      schema: TRANSPORT_HELLO_SCHEMA,
      deviceId: DEVICE_ID,
      platform,
      ownerSubject: OWNER,
      audience: AUDIENCE,
      keyId: deviceKeyId,
      registrationDigest: REGISTRATION_DIGEST,
      issuerId,
      challenge,
      nonce: randomChallenge(),
      issuedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 60_000).toISOString(),
      ...overrides,
    };
    for (const key of Object.keys(overrides)) {
      if (overrides[key] === undefined) delete body[key];
    }
    return Object.freeze({
      ...body,
      signature: signBase64url(privateKey, canonicalHelloTranscript(body)),
    });
  }

  return {
    now, issuerId, issuerKeyId, deviceKeyId, platform,
    issuerKeys, deviceKeys, attackerKeys,
    trustedIssuerRegistry, trustedDeviceRegistry, credential, devicePublicKeySpki,
    hello,
  };
}

function expectDenial(fn, code) {
  let thrown = null;
  try { fn(); } catch (error) { thrown = error; }
  assert.ok(thrown instanceof TransportDenied, `expected TransportDenied, got ${thrown}`);
  assert.equal(thrown.code, code);
}

/** Full handshake helper that mirrors the gateway's required call order. */
function handshake(fixture, { challengeIssuer, now = fixture.now, helloOptions = {}, verifyOptions = {} } = {}) {
  const issuer = challengeIssuer ?? createChallengeIssuer({ now: () => now });
  const issued = issuer.issue();
  const verifiedCredential = verifyTransportCredential(fixture.credential, {
    trustedIssuerRegistry: fixture.trustedIssuerRegistry,
    expectedAudience: AUDIENCE,
    expectedOwnerSubject: OWNER,
    now,
    ...verifyOptions,
  });
  const signedHello = fixture.hello({ challenge: issued.challenge, ...helloOptions });
  const session = verifyDeviceHello(signedHello, {
    verifiedCredential,
    challengeIssuer: issuer,
    trustedDeviceRegistry: fixture.trustedDeviceRegistry,
    expectedAudience: AUDIENCE,
    expectedOwnerSubject: OWNER,
    now,
    ...verifyOptions,
  });
  return { issuer, issued, verifiedCredential, signedHello, session };
}

// ---------------------------------------------------------------- positives

test('positive: trusted credential and challenge-bound hello establish a device session', () => {
  const fixture = makeFixture();
  const { verifiedCredential, signedHello, session, issuer } = handshake(fixture);

  assert.equal(verifiedCredential.deviceId, DEVICE_ID);
  assert.equal(verifiedCredential.ownerSubject, OWNER);
  assert.equal(session.deviceId, DEVICE_ID);
  assert.equal(session.audience, AUDIENCE);
  assert.equal(session.registrationDigest, REGISTRATION_DIGEST);
  assert.equal(issuer.pendingCount(), 1, 'challenge is not consumed before proof verification');

  const proven = verifyHelloProof(signedHello, session, { challengeIssuer: issuer });
  assert.equal(proven.deviceId, DEVICE_ID);
  assert.equal(issuer.pendingCount(), 0, 'challenge is consumed exactly once');
});

test('positive: command is issued, executed and correlated with an intact result digest', () => {
  const fixture = makeFixture();
  const { session } = handshake(fixture);
  const correlation = createTransportCorrelation(session);

  const issued = issueCommand({
    correlation,
    capability: 'device.health',
    arguments: {},
    grants: ['device.health'],
    consent: { granted: true, deviceId: DEVICE_ID, ownerSubject: OWNER, capability: 'device.health', expiresAt: new Date(fixture.now + 60_000).toISOString() },
    now: fixture.now,
  });
  assert.equal(issued.deviceId, DEVICE_ID);

  const result = { ok: true, status: 'ONLINE', nodeId: DEVICE_ID };
  const message = {
    type: 'result',
    commandId: issued.commandId,
    deviceId: DEVICE_ID,
    capability: 'device.health',
    ok: true,
    result,
    resultDigest: deviceResultDigest({ deviceId: DEVICE_ID, commandId: issued.commandId, capability: 'device.health', ok: true, result }),
  };

  const accepted = acceptDeviceResult({ correlation, message, now: fixture.now });
  assert.equal(accepted.ok, true);
  assert.equal(accepted.deviceId, DEVICE_ID);
  assert.equal(accepted.requestDigest, issued.requestDigest);
  assert.equal(correlation.pendingCount(), 0);
});

test('positive: device client completes the challenge handshake and serves a correlated command', async () => {
  const fixture = makeFixture();
  const challengeIssuer = createChallengeIssuer({ now: () => fixture.now });
  const sent = [];

  const transport = {
    onMessage(handler) { this.handler = handler; },
    send(raw) { sent.push(JSON.parse(raw)); },
    close() {},
  };

  const client = createDeviceTransportClient({
    identity: {
      deviceId: DEVICE_ID,
      platform: fixture.platform,
      ownerSubject: OWNER,
      audience: AUDIENCE,
      keyId: fixture.deviceKeyId,
      issuerId: fixture.issuerId,
      registrationDigest: REGISTRATION_DIGEST,
    },
    credential: fixture.credential,
    signer: {
      keyId: fixture.deviceKeyId,
      sign: bytes => sign(null, bytes, fixture.deviceKeys.privateKey),
    },
    executor: async capability => ({ ok: true, capability, status: 'ONLINE' }),
    connect: async () => transport,
    now: () => fixture.now,
  });

  const connected = client.connect();
  // Let connect() -> authenticate() register its message handler before dispatching.
  await new Promise(resolve => setImmediate(resolve));

  const issued = challengeIssuer.issue();
  transport.handler(JSON.stringify({
    type: 'transport-challenge',
    challenge: issued.challenge,
    audience: AUDIENCE,
    expiresAt: new Date(fixture.now + 60_000).toISOString(),
  }));

  await new Promise(resolve => setImmediate(resolve));

  const helloMessage = sent.find(m => m.type === 'transport-hello');
  assert.ok(helloMessage, 'hello was sent');
  assert.equal(helloMessage.hello.challenge, issued.challenge);
  assert.equal('token' in helloMessage.hello, false, 'no shared static token is transmitted');
  assert.equal('token' in helloMessage, false);

  // Gateway side: verify with the same contract it will run in production.
  const verifiedCredential = verifyTransportCredential(helloMessage.credential, {
    trustedIssuerRegistry: fixture.trustedIssuerRegistry,
    expectedAudience: AUDIENCE,
    expectedOwnerSubject: OWNER,
    now: fixture.now,
  });
  const session = verifyDeviceHello(helloMessage.hello, {
    verifiedCredential,
    challengeIssuer,
    trustedDeviceRegistry: fixture.trustedDeviceRegistry,
    expectedAudience: AUDIENCE,
    expectedOwnerSubject: OWNER,
    now: fixture.now,
  });
  const proven = verifyHelloProof(helloMessage.hello, session, { challengeIssuer });

  transport.handler(JSON.stringify({ type: 'transport-ack', deviceId: DEVICE_ID, protocol: 'v1' }));
  await connected;

  assert.equal(proven.nonce, helloMessage.hello.nonce);
  assert.equal(client.connected, true);
});

test('positive: reconnect uses a fresh challenge and nonce, with bounded backoff', async () => {
  const fixture = makeFixture();
  const challengeIssuer = createChallengeIssuer({ now: () => fixture.now });
  const seen = [];
  let attempts = 0;

  const client = createDeviceTransportClient({
    identity: {
      deviceId: DEVICE_ID,
      platform: fixture.platform,
      ownerSubject: OWNER,
      audience: AUDIENCE,
      keyId: fixture.deviceKeyId,
      issuerId: fixture.issuerId,
      registrationDigest: REGISTRATION_DIGEST,
    },
    credential: fixture.credential,
    signer: { keyId: fixture.deviceKeyId, sign: bytes => sign(null, bytes, fixture.deviceKeys.privateKey) },
    executor: async () => ({ ok: true }),
    connect: async () => {
      attempts += 1;
      const transport = {
        onMessage(handler) { this.handler = handler; },
        send(raw) {
          const message = JSON.parse(raw);
          if (message.type === 'transport-hello') {
            seen.push({ challenge: message.hello.challenge, nonce: message.hello.nonce });
          }
        },
        close() {},
      };
      setImmediate(() => {
        const issued = challengeIssuer.issue();
        transport.handler(JSON.stringify({
          type: 'transport-challenge', challenge: issued.challenge, audience: AUDIENCE,
        }));
        if (attempts >= 2) {
          transport.handler(JSON.stringify({ type: 'transport-ack', deviceId: DEVICE_ID }));
        } else {
          transport.handler(JSON.stringify({ type: 'transport-deny', error: TRANSPORT_DENIAL.CHALLENGE_UNKNOWN }));
        }
      });
      return transport;
    },
    now: () => fixture.now,
    backoff: () => 1,
    maxAttempts: 3,
  });

  await client.start();

  assert.equal(attempts, 2, 'one denial then one success');
  assert.equal(seen.length, 2, 'exactly one hello per attempt');
  assert.notEqual(seen[0].challenge, seen[1].challenge, 'each reconnect gets a fresh challenge');
  assert.notEqual(seen[0].nonce, seen[1].nonce, 'each reconnect gets a fresh nonce');

  const delay = createBackoff({ baseMs: 100, maxMs: 1000, jitter: () => 0 });
  assert.equal(delay(0), 100);
  assert.equal(delay(1), 200);
  assert.equal(delay(10), 1000, 'backoff is capped');
});

// ---------------------------------------------------------------- negatives

test('negative: wrong owner is denied at the credential and at the hello', () => {
  const fixture = makeFixture();
  expectDenial(
    () => verifyTransportCredential(fixture.credential, {
      trustedIssuerRegistry: fixture.trustedIssuerRegistry,
      expectedAudience: AUDIENCE,
      expectedOwnerSubject: '999999999999999999',
      now: fixture.now,
    }),
    TRANSPORT_DENIAL.OWNER_MISMATCH,
  );

  const issuer = createChallengeIssuer({ now: () => fixture.now });
  const issued = issuer.issue();
  const verifiedCredential = verifyTransportCredential(fixture.credential, {
    trustedIssuerRegistry: fixture.trustedIssuerRegistry,
    expectedAudience: AUDIENCE,
    expectedOwnerSubject: OWNER,
    now: fixture.now,
  });
  const foreignHello = fixture.hello({ challenge: issued.challenge, overrides: { ownerSubject: '999999999999999999' } });
  expectDenial(
    () => verifyDeviceHello(foreignHello, {
      verifiedCredential,
      challengeIssuer: issuer,
      trustedDeviceRegistry: fixture.trustedDeviceRegistry,
      expectedAudience: AUDIENCE,
      expectedOwnerSubject: OWNER,
      now: fixture.now,
    }),
    TRANSPORT_DENIAL.OWNER_MISMATCH,
  );
});

test('negative: wrong device key cannot prove possession', () => {
  const fixture = makeFixture();
  const issuer = createChallengeIssuer({ now: () => fixture.now });
  const issued = issuer.issue();
  const verifiedCredential = verifyTransportCredential(fixture.credential, {
    trustedIssuerRegistry: fixture.trustedIssuerRegistry,
    expectedAudience: AUDIENCE,
    expectedOwnerSubject: OWNER,
    now: fixture.now,
  });
  const wrongKeyHello = fixture.hello({ challenge: issued.challenge, privateKey: fixture.attackerKeys.privateKey });
  const session = verifyDeviceHello(wrongKeyHello, {
    verifiedCredential,
    challengeIssuer: issuer,
    trustedDeviceRegistry: fixture.trustedDeviceRegistry,
    expectedAudience: AUDIENCE,
    expectedOwnerSubject: OWNER,
    now: fixture.now,
  });
  expectDenial(
    () => verifyHelloProof(wrongKeyHello, session, { challengeIssuer: issuer }),
    TRANSPORT_DENIAL.PROOF_SIGNATURE,
  );
  assert.equal(issuer.pendingCount(), 1, 'a forged proof must not consume a legitimate challenge');
});

test('negative: forged credential signature is denied', () => {
  const fixture = makeFixture();
  const forged = Object.freeze({
    ...fixture.credential,
    signature: signBase64url(fixture.attackerKeys.privateKey, canonicalCredentialPayload(fixture.credential)),
  });
  expectDenial(
    () => verifyTransportCredential(forged, {
      trustedIssuerRegistry: fixture.trustedIssuerRegistry,
      expectedAudience: AUDIENCE,
      expectedOwnerSubject: OWNER,
      now: fixture.now,
    }),
    TRANSPORT_DENIAL.CREDENTIAL_SIGNATURE,
  );
});

test('negative: forged hello signature is denied', () => {
  const fixture = makeFixture();
  const issuer = createChallengeIssuer({ now: () => fixture.now });
  const issued = issuer.issue();
  const verifiedCredential = verifyTransportCredential(fixture.credential, {
    trustedIssuerRegistry: fixture.trustedIssuerRegistry,
    expectedAudience: AUDIENCE,
    expectedOwnerSubject: OWNER,
    now: fixture.now,
  });
  const genuine = fixture.hello({ challenge: issued.challenge });
  const tampered = Object.freeze({ ...genuine, nonce: randomChallenge() });
  const session = verifyDeviceHello(tampered, {
    verifiedCredential,
    challengeIssuer: issuer,
    trustedDeviceRegistry: fixture.trustedDeviceRegistry,
    expectedAudience: AUDIENCE,
    expectedOwnerSubject: OWNER,
    now: fixture.now,
  });
  expectDenial(
    () => verifyHelloProof(tampered, session, { challengeIssuer: issuer }),
    TRANSPORT_DENIAL.PROOF_SIGNATURE,
  );
});

test('negative: expired credential is denied', () => {
  const fixture = makeFixture({ ttlMs: 30_000 });
  expectDenial(
    () => verifyTransportCredential(fixture.credential, {
      trustedIssuerRegistry: fixture.trustedIssuerRegistry,
      expectedAudience: AUDIENCE,
      expectedOwnerSubject: OWNER,
      now: fixture.now + 30_001,
    }),
    TRANSPORT_DENIAL.CREDENTIAL_EXPIRED,
  );
});

test('negative: over-long credential lifetime is refused, not clamped', () => {
  const fixture = makeFixture({ ttlMs: 24 * 60 * 60 * 1000 });
  expectDenial(
    () => verifyTransportCredential(fixture.credential, {
      trustedIssuerRegistry: fixture.trustedIssuerRegistry,
      expectedAudience: AUDIENCE,
      expectedOwnerSubject: OWNER,
      now: fixture.now,
    }),
    TRANSPORT_DENIAL.CREDENTIAL_TTL_EXCEEDED,
  );
});

test('negative: credential minted for another audience is denied', () => {
  const fixture = makeFixture();
  expectDenial(
    () => verifyTransportCredential(fixture.credential, {
      trustedIssuerRegistry: fixture.trustedIssuerRegistry,
      expectedAudience: 'https://other-gateway.test.invalid/device-transport',
      expectedOwnerSubject: OWNER,
      now: fixture.now,
    }),
    TRANSPORT_DENIAL.AUDIENCE_MISMATCH,
  );
});

test('negative: untrusted issuer is denied', () => {
  const fixture = makeFixture();
  expectDenial(
    () => verifyTransportCredential(fixture.credential, {
      trustedIssuerRegistry: {},
      expectedAudience: AUDIENCE,
      expectedOwnerSubject: OWNER,
      now: fixture.now,
    }),
    TRANSPORT_DENIAL.ISSUER_NOT_TRUSTED,
  );
});

test('negative: revoked device is denied even with a valid credential', () => {
  const fixture = makeFixture();
  const issuer = createChallengeIssuer({ now: () => fixture.now });
  const issued = issuer.issue();
  const verifiedCredential = verifyTransportCredential(fixture.credential, {
    trustedIssuerRegistry: fixture.trustedIssuerRegistry,
    expectedAudience: AUDIENCE,
    expectedOwnerSubject: OWNER,
    now: fixture.now,
  });
  const signedHello = fixture.hello({ challenge: issued.challenge });
  expectDenial(
    () => verifyDeviceHello(signedHello, {
      verifiedCredential,
      challengeIssuer: issuer,
      trustedDeviceRegistry: fixture.trustedDeviceRegistry,
      expectedAudience: AUDIENCE,
      expectedOwnerSubject: OWNER,
      revokedDeviceIds: [DEVICE_ID],
      now: fixture.now,
    }),
    TRANSPORT_DENIAL.DEVICE_REVOKED,
  );
});

test('negative: unknown, unverified and mismatched registration are denied', () => {
  const fixture = makeFixture();
  const issuer = createChallengeIssuer({ now: () => fixture.now });
  const issued = issuer.issue();
  const verifiedCredential = verifyTransportCredential(fixture.credential, {
    trustedIssuerRegistry: fixture.trustedIssuerRegistry,
    expectedAudience: AUDIENCE,
    expectedOwnerSubject: OWNER,
    now: fixture.now,
  });
  const signedHello = fixture.hello({ challenge: issued.challenge });
  const base = {
    verifiedCredential, challengeIssuer: issuer, expectedAudience: AUDIENCE,
    expectedOwnerSubject: OWNER, now: fixture.now,
  };

  expectDenial(
    () => verifyDeviceHello(signedHello, { ...base, trustedDeviceRegistry: new Map() }),
    TRANSPORT_DENIAL.DEVICE_UNKNOWN,
  );
  expectDenial(
    () => verifyDeviceHello(signedHello, {
      ...base,
      trustedDeviceRegistry: new Map([[DEVICE_ID, { ...fixture.trustedDeviceRegistry.get(DEVICE_ID), identityVerified: false }]]),
    }),
    TRANSPORT_DENIAL.DEVICE_UNVERIFIED,
  );
  expectDenial(
    () => verifyDeviceHello(signedHello, {
      ...base,
      trustedDeviceRegistry: new Map([[DEVICE_ID, { ...fixture.trustedDeviceRegistry.get(DEVICE_ID), passportSha256: 'b'.repeat(64) }]]),
    }),
    TRANSPORT_DENIAL.REGISTRATION_MISMATCH,
  );
});

test('negative: replayed challenge is denied', () => {
  const fixture = makeFixture();
  const issuer = createChallengeIssuer({ now: () => fixture.now });
  const issued = issuer.issue();
  const verifiedCredential = verifyTransportCredential(fixture.credential, {
    trustedIssuerRegistry: fixture.trustedIssuerRegistry,
    expectedAudience: AUDIENCE,
    expectedOwnerSubject: OWNER,
    now: fixture.now,
  });
  const signedHello = fixture.hello({ challenge: issued.challenge });
  const session = verifyDeviceHello(signedHello, {
    verifiedCredential, challengeIssuer: issuer,
    trustedDeviceRegistry: fixture.trustedDeviceRegistry,
    expectedAudience: AUDIENCE, expectedOwnerSubject: OWNER, now: fixture.now,
  });
  verifyHelloProof(signedHello, session, { challengeIssuer: issuer });
  expectDenial(
    () => verifyHelloProof(signedHello, session, { challengeIssuer: issuer }),
    TRANSPORT_DENIAL.CHALLENGE_REPLAYED,
  );
});

test('negative: device ID substitution is denied in hello, command and result', () => {
  const fixture = makeFixture();
  const issuer = createChallengeIssuer({ now: () => fixture.now });
  const issued = issuer.issue();
  const verifiedCredential = verifyTransportCredential(fixture.credential, {
    trustedIssuerRegistry: fixture.trustedIssuerRegistry,
    expectedAudience: AUDIENCE,
    expectedOwnerSubject: OWNER,
    now: fixture.now,
  });
  const substituted = fixture.hello({ challenge: issued.challenge, overrides: { deviceId: 'pc-primary' } });
  expectDenial(
    () => verifyDeviceHello(substituted, {
      verifiedCredential, challengeIssuer: issuer,
      trustedDeviceRegistry: fixture.trustedDeviceRegistry,
      expectedAudience: AUDIENCE, expectedOwnerSubject: OWNER, now: fixture.now,
    }),
    TRANSPORT_DENIAL.DEVICE_ID_SUBSTITUTION,
  );

  const { session } = handshake(fixture);
  const correlation = createTransportCorrelation(session);
  const consent = { granted: true, deviceId: DEVICE_ID, ownerSubject: OWNER, capability: 'device.info', expiresAt: new Date(fixture.now + 60_000).toISOString() };
  expectDenial(
    () => issueCommand({ correlation, capability: 'device.info', grants: ['device.info'], consent, targetDeviceId: 'pc-primary', now: fixture.now }),
    TRANSPORT_DENIAL.DEVICE_ID_SUBSTITUTION,
  );
  expectDenial(
    () => issueCommand({ correlation, capability: 'device.info', arguments: { deviceId: 'pc-primary' }, grants: ['device.info'], consent, now: fixture.now }),
    TRANSPORT_DENIAL.DEVICE_ID_SUBSTITUTION,
  );

  const issuedCommand = issueCommand({ correlation, capability: 'device.info', grants: ['device.info'], consent, now: fixture.now });
  expectDenial(
    () => acceptDeviceResult({
      correlation,
      message: { type: 'result', commandId: issuedCommand.commandId, deviceId: 'pc-primary', capability: 'device.info', ok: true, result: {}, resultDigest: 'x' },
      now: fixture.now,
    }),
    TRANSPORT_DENIAL.DEVICE_ID_SUBSTITUTION,
  );
});

test('negative: unauthorized command is denied without a grant or owner consent', () => {
  const fixture = makeFixture();
  const { session } = handshake(fixture);
  const correlation = createTransportCorrelation(session);
  const consent = { granted: true, deviceId: DEVICE_ID, ownerSubject: OWNER, capability: 'device.health', expiresAt: new Date(fixture.now + 60_000).toISOString() };

  expectDenial(
    () => issueCommand({ correlation, capability: 'device.health', grants: [], consent, now: fixture.now }),
    TRANSPORT_DENIAL.OPERATION_NOT_GRANTED,
  );
  expectDenial(
    () => issueCommand({ correlation, capability: 'device.health', grants: ['device.info'], consent, now: fixture.now }),
    TRANSPORT_DENIAL.OPERATION_NOT_GRANTED,
  );
  expectDenial(
    () => issueCommand({ correlation, capability: 'device.health', grants: ['device.health'], consent: undefined, now: fixture.now }),
    TRANSPORT_DENIAL.CONSENT_REQUIRED,
  );
  expectDenial(
    () => issueCommand({
      correlation, capability: 'device.health', grants: ['device.health'],
      consent: { ...consent, expiresAt: new Date(fixture.now - 1).toISOString() }, now: fixture.now,
    }),
    TRANSPORT_DENIAL.CONSENT_REQUIRED,
  );
  expectDenial(
    () => issueCommand({
      correlation, capability: 'device.health', grants: ['device.health'],
      consent: { ...consent, capability: 'device.info' }, now: fixture.now,
    }),
    TRANSPORT_DENIAL.OPERATION_NOT_GRANTED,
  );
  expectDenial(
    () => issueCommand({
      correlation, capability: 'device.health', grants: ['device.health'],
      consent: { ...consent, ownerSubject: '999999999999999999' }, now: fixture.now,
    }),
    TRANSPORT_DENIAL.OWNER_MISMATCH,
  );
  assert.equal(correlation.pendingCount(), 0, 'denied commands leave no pending state');
});

test('negative: altered result is refused', () => {
  const fixture = makeFixture();
  const { session } = handshake(fixture);
  const correlation = createTransportCorrelation(session);
  const consent = { granted: true, deviceId: DEVICE_ID, ownerSubject: OWNER, capability: 'device.health', expiresAt: new Date(fixture.now + 60_000).toISOString() };
  const issued = issueCommand({ correlation, capability: 'device.health', grants: ['device.health'], consent, now: fixture.now });

  const honestResult = { ok: true, status: 'ONLINE' };
  const digest = deviceResultDigest({ deviceId: DEVICE_ID, commandId: issued.commandId, capability: 'device.health', ok: true, result: honestResult });

  expectDenial(
    () => acceptDeviceResult({
      correlation,
      message: {
        type: 'result', commandId: issued.commandId, deviceId: DEVICE_ID, capability: 'device.health',
        ok: true, result: { ok: true, status: 'COMPROMISED' }, resultDigest: digest,
      },
      now: fixture.now,
    }),
    TRANSPORT_DENIAL.RESULT_TAMPERED,
  );
  expectDenial(
    () => acceptDeviceResult({
      correlation,
      message: {
        type: 'result', commandId: issued.commandId, deviceId: DEVICE_ID, capability: 'device.info',
        ok: true, result: honestResult, resultDigest: digest,
      },
      now: fixture.now,
    }),
    TRANSPORT_DENIAL.RESULT_MISMATCH,
  );
  expectDenial(
    () => acceptDeviceResult({
      correlation,
      message: {
        type: 'result', commandId: 'unknown-command-id', deviceId: DEVICE_ID, capability: 'device.health',
        ok: true, result: honestResult, resultDigest: digest,
      },
      now: fixture.now,
    }),
    TRANSPORT_DENIAL.UNKNOWN_COMMAND,
  );
});

test('negative: offline device reports a denial and never a synthetic success', () => {
  const fixture = makeFixture();
  const { session } = handshake(fixture);
  const correlation = createTransportCorrelation(session);
  const consent = { granted: true, deviceId: DEVICE_ID, ownerSubject: OWNER, capability: 'device.health', expiresAt: new Date(fixture.now + 60_000).toISOString() };
  const issued = issueCommand({ correlation, capability: 'device.health', grants: ['device.health'], consent, now: fixture.now });

  const offline = offlineDeviceResult({ deviceId: DEVICE_ID, commandId: issued.commandId, capability: 'device.health' });
  assert.equal(offline.ok, false);
  assert.equal(offline.error, 'DEVICE_OFFLINE');

  const accepted = acceptDeviceResult({
    correlation,
    message: {
      type: 'result', commandId: issued.commandId, deviceId: DEVICE_ID, capability: 'device.health',
      ok: false, error: 'DEVICE_OFFLINE',
      resultDigest: deviceResultDigest({ deviceId: DEVICE_ID, commandId: issued.commandId, capability: 'device.health', ok: false, error: 'DEVICE_OFFLINE' }),
    },
    now: fixture.now,
  });
  assert.equal(accepted.ok, false);
  assert.equal(accepted.result, null, 'no result is invented for an offline device');
  assert.equal(accepted.error, 'DEVICE_OFFLINE');
});
