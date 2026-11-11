/*
LEEWAY HEADER - DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.HOST.TEST
TAG: LEEWAY.POCKET_ID.MCP.HOST.AUTHORITY_BOUNDARY.TEST.V1
WHAT: Prove the Pocket ID host consumes existing passport and authority providers without self-assertion.
WHY: Owner, identity, Formula, Veritas and receipt custody must remain externally governed.
HOW: Test-only Ed25519 passports and injected callbacks; no listener, device action, receipt append or deployment.
AUTHORITY: TEST_ONLY; source evidence, not independent Veritas or production qualification.
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { buildHostInjectedC3Composition } from '../../operator/identity/start-pocket-id-mcp.mjs';
import {
  createSignedWindowsPassport,
  registerVerifiedWindowsDevice,
} from '../../operator/identity/windows-passport-verifier.mjs';
import { ConsentReplayGuard } from '../../operator/trusted-issuer-registry.mjs';

const OWNER_SUBJECT = 'owner-subject-test-only';
const ISSUER_ID = 'leeway.runtime.carrier.test-only';
const KEY_ID = 'carrier-ed25519-test-only';
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const issuerRegistry = {
  [ISSUER_ID]: {
    issuerId: ISSUER_ID,
    keyId: KEY_ID,
    algorithm: 'Ed25519',
    publicKeySpki: publicKey.export({ type: 'spki', format: 'pem' }),
    status: 'ACTIVE',
    validUntil: '2099-01-01T00:00:00.000Z',
  },
};
const adapterRegistry = {
  adapters: [{
    adapterId: 'leeway.operator.windows.test-only',
    platform: 'windows',
    capabilities: { 'device.info': { state: 'SUPPORTED', requiresHumanConsent: false } },
  }],
};

function passport({ signingKey = privateKey, tokenNonce = `token-${randomUUID()}` } = {}) {
  return createSignedWindowsPassport({
    privateKeyPem: signingKey.export({ type: 'pkcs8', format: 'pem' }),
    deviceId: 'pc-primary',
    platform: 'windows',
    hardwareUid: '4c434255-0000-1000-8000-002590aabbcc',
    ownerId: OWNER_SUBJECT,
    ownerName: 'Test-only owner',
    sessionNonce: `session-${tokenNonce}`,
    tokenNonce,
    issuer: ISSUER_ID,
    keyId: KEY_ID,
    ttlMs: 120000,
  });
}

function qualifiedInput({
  passportValue = passport(),
  replayGuard = new ConsentReplayGuard({ inMemoryOnly: true }),
  formulaPreGate = async () => true,
  veritasPreGate = async () => true,
  receiptSink = async () => {},
} = {}) {
  const deviceRegistry = new Map();
  registerVerifiedWindowsDevice(deviceRegistry, passportValue, {
    expectedDeviceId: 'pc-primary',
    expectedOwnerId: OWNER_SUBJECT,
    trustedIssuerRegistry: issuerRegistry,
    replayGuard,
  });
  return {
    replayGuard,
    runtimeInput: {
      deviceRegistry,
      adapterRegistry,
      formulaPreGate,
      veritasPreGate,
      receiptSink,
      trustedIssuerRegistry: issuerRegistry,
      replayGuard,
      consentProvider: async () => null,
    },
  };
}

test('host composition requires the authoritative owner subject', () => {
  const { runtimeInput } = qualifiedInput();
  assert.throws(() => buildHostInjectedC3Composition({ runtimeInput }), /OWNER_SUBJECT_REQUIRED/);
});

test('host composition rejects a registry row that was not passport-derived', () => {
  const { runtimeInput } = qualifiedInput();
  const forged = new Map(runtimeInput.deviceRegistry);
  forged.set('pc-primary', {
    ...forged.get('pc-primary'),
    passportSha256: null,
  });
  assert.throws(() => buildHostInjectedC3Composition({
    ownerSubject: OWNER_SUBJECT,
    runtimeInput: { ...runtimeInput, deviceRegistry: forged },
  }), /TRUSTED_RUNTIME_WINDOWS_PASSPORT_REQUIRED/);
});

test('canonical passport verifier rejects a forged signing key', () => {
  const attacker = generateKeyPairSync('ed25519').privateKey;
  assert.throws(() => qualifiedInput({ passportValue: passport({ signingKey: attacker }) }), /SIGNATURE_INVALID/);
});

test('host composition fails closed without Formula or Veritas providers', () => {
  const formulaMissing = qualifiedInput().runtimeInput;
  delete formulaMissing.formulaPreGate;
  assert.throws(() => buildHostInjectedC3Composition({ ownerSubject: OWNER_SUBJECT, runtimeInput: formulaMissing }), /TRUSTED_RUNTIME/);

  const veritasMissing = qualifiedInput().runtimeInput;
  delete veritasMissing.veritasPreGate;
  assert.throws(() => buildHostInjectedC3Composition({ ownerSubject: OWNER_SUBJECT, runtimeInput: veritasMissing }), /TRUSTED_RUNTIME/);
});

test('host composition fails closed without the injected Receipt producer', () => {
  const runtimeInput = qualifiedInput().runtimeInput;
  delete runtimeInput.receiptSink;
  assert.throws(() => buildHostInjectedC3Composition({ ownerSubject: OWNER_SUBJECT, runtimeInput }), /TRUSTED_RUNTIME/);
});

test('canonical passport verifier rejects replay before host composition', () => {
  const replayGuard = new ConsentReplayGuard({ inMemoryOnly: true });
  const passportValue = passport({ tokenNonce: 'replay-token-test-only' });
  qualifiedInput({ passportValue, replayGuard });
  assert.throws(() => qualifiedInput({ passportValue, replayGuard }), /NONCE_REPLAYED/);
});

test('qualified read-only host composition preserves injected authorities', () => {
  const formulaPreGate = async () => true;
  const veritasPreGate = async () => true;
  const receiptSink = async () => {};
  const { runtimeInput } = qualifiedInput({ formulaPreGate, veritasPreGate, receiptSink });
  const result = buildHostInjectedC3Composition({ ownerSubject: OWNER_SUBJECT, runtimeInput });
  const record = result.deviceRegistry.get('pc-primary');
  assert.equal(result.formulaPreGate, formulaPreGate);
  assert.equal(result.veritasPreGate, veritasPreGate);
  assert.equal(result.receiptSink, receiptSink);
  assert.equal(record.identityVerified, true);
  assert.equal(record.registrationAuthority, 'TRUSTED_RUNTIME_DEVICE_REGISTRY');
  assert.equal(record.ownerSubject, OWNER_SUBJECT);
  assert.equal(result.mode, 'c3');
  assert.equal(Object.isFrozen(result), true);
});
