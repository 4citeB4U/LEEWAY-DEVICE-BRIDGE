/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.TEST
TAG: PASSPORT-DIGEST-BASIS-V2-TEST
WHAT = Prove the versioned passport digest repair: full signed document for identity, unsigned
       canonical payload in a separately named field, with historical records untouched.
WHY  = Two different digests under one field name broke issuance-to-registry receipt correlation.
HOW  = Ephemeral Ed25519 fixture signer; in-memory verification; byte check of the legacy registry.
LICENSE: Internal LeeWay governance.
*/

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateKeyPairSync } from 'node:crypto';

import {
  PASSPORT_DIGEST_BASIS,
  signingPayloadSha256,
  windowsPassportSha256,
} from '../../operator/windows-pc-primary.mjs';
import {
  CANONICAL_OWNER_ID,
  createSignedWindowsPassport,
  verifyWindowsPassport,
} from '../../operator/identity/windows-passport-verifier.mjs';
import { ConsentReplayGuard } from '../../operator/trusted-issuer-registry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const { publicKey: carrierPub, privateKey: carrierPriv } = generateKeyPairSync('ed25519');
const TEST_ISSUERS = {
  'leeway.runtime.carrier.v1': {
    issuerId: 'leeway.runtime.carrier.v1',
    keyId: 'carrier-ed25519-key-001',
    algorithm: 'Ed25519',
    publicKeySpki: carrierPub.export({ type: 'spki', format: 'pem' }).toString(),
    status: 'ACTIVE',
    validUntil: '2027-01-01T00:00:00.000Z',
  },
};

function fixturePassport() {
  const nonce = 'nonce-' + Math.random().toString(36).slice(2);
  return createSignedWindowsPassport({
    privateKeyPem: carrierPriv.export({ type: 'pkcs8', format: 'pem' }).toString(),
    deviceId: 'pc-primary',
    platform: 'windows',
    manufacturer: 'LeeWay Industries',
    model: 'PC-Workstation-Primary',
    device: 'pc-primary',
    product: 'LeeWay Workstation',
    architecture: 'x64',
    osVersion: '10.0.26100',
    hostname: 'LEEWAY-PC-PRIMARY',
    hardwareUid: '4c434255-0000-1000-8000-002590aabbcc',
    ownerId: CANONICAL_OWNER_ID,
    ownerName: 'The Creator',
    sessionNonce: 'sess-' + nonce,
    tokenNonce: 'token-' + nonce,
    issuedAt: new Date().toISOString(),
    ttlMs: 120000,
  });
}

test('passportSha256 binds the full signed document, not the signing payload', () => {
  const passport = fixturePassport();
  const identityDigest = windowsPassportSha256(passport);
  const payloadDigest = signingPayloadSha256(passport);

  assert.match(identityDigest, /^[a-f0-9]{64}$/);
  assert.match(payloadDigest, /^[a-f0-9]{64}$/);
  assert.notEqual(identityDigest, payloadDigest, 'the two bases must remain distinct');
  assert.equal(
    payloadDigest,
    signingPayloadSha256({ ...passport, signature: 'A'.repeat(passport.signature.length) }),
    'signingPayloadSha256 is independent of the signature bytes',
  );

  const resigned = { ...passport, signature: 'B'.repeat(passport.signature.length) };
  assert.notEqual(
    identityDigest,
    windowsPassportSha256(resigned),
    'passportSha256 covers the full signed document including the signature',
  );
});

test('verifier record carries both versioned digests and keeps the six discovery fields', () => {
  const passport = fixturePassport();
  const result = verifyWindowsPassport(passport, {
    trustedIssuerRegistry: TEST_ISSUERS,
    replayGuard: new ConsentReplayGuard({ inMemoryOnly: true }),
  });

  assert.equal(result.valid, true);
  const record = result.record;
  assert.equal(record.passportSha256, windowsPassportSha256(passport));
  assert.equal(record.signingPayloadSha256, signingPayloadSha256(passport));
  assert.equal(record.passportDigestBasis, PASSPORT_DIGEST_BASIS.identity);
  assert.equal(record.identityVerified, true);
  assert.equal(record.registrationState, 'TRUSTED_REGISTRY_READ');
  assert.equal(record.identitySource, 'WINDOWS_CIM_READONLY');
  assert.equal(record.passportAuthority, 'OWNER_SIGNED_WINDOWS_PASSPORT');
  assert.equal(record.ownerSubject, CANONICAL_OWNER_ID);
  assert.match(record.passportSha256, /^[a-f0-9]{64}$/i);
});

test('historical registry digest is preserved byte-for-byte', () => {
  const registryPath = path.join(ROOT, 'registry', 'trusted-device-registry.json');
  const raw = fs.readFileSync(registryPath, 'utf8');
  assert.ok(raw.includes('2b16305f6b64b1dc8eefe1c66d43546bbb826af6578f162b5d4c692a3e2a4412'),
    'legacy hp-node-secondary-01 digest must not be rewritten');
  assert.ok(!raw.includes('signingPayloadSha256'), 'legacy record schema is unchanged');
});
