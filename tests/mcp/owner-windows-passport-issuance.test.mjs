/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.IDENTITY.TESTS
TAG: LEEWAY.DEVICE_BRIDGE.WINDOWS_PASSPORT_OWNER_ISSUANCE_TEST.V1
5WH:
WHAT = Test private-local owner passport creation through the existing signed Windows adapter contract.
WHY = Deny mismatched issuer, hardware, owner, key, expiry and accidental data publication.
WHO = LeeWay Device Bridge source maintainers and outside support reviewers.
WHERE = LEEWAY-DEVICE-BRIDGE/tests/mcp/owner-windows-passport-issuance.test.mjs
WHEN = 2026-11-22.
HOW = Isolated ephemeral Ed25519 fixtures and real canonical Windows verifier; no production signer or registered device.
LICENSE = Existing repository terms; no new license asserted.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, verify } from 'node:crypto';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  resolveApprovedWindowsIssuer,
  createOwnerSignedWindowsPassport,
  issueOwnerWindowsPassport,
} from '../../operator/identity/owner-windows-passport-issuance.mjs';
import { canonicalWindowsPassportPayload, windowsPassportSha256 } from '../../operator/windows-pc-primary.mjs';

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const { privateKey: wrongPrivateKey } = generateKeyPairSync('ed25519');
const pub = publicKey.export({ type: 'spki', format: 'pem' });
const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const now = Date.parse('2026-11-22T16:00:00Z');
const request = { deviceId: 'hp-node-secondary-01', ownerSubject: 'test-owner-oidc-sub', issuerId: 'leeway.runtime.carrier.v1', keyId: 'carrier-ed25519-key-001', ttlSeconds: 3600 };
const registry = { issuers: { [request.issuerId]: { issuerId: request.issuerId, keyId: request.keyId, algorithm: 'Ed25519', status: 'ACTIVE', publicKeySpki: pub, validUntil: '2027-01-01T00:00:00Z', ownerSubject: request.ownerSubject } } };
const observed = { platform: 'windows', computerUuid: 'B7B27833-EB52-44AE-8BC8-98A6A47B9CF2', biosSerialNumber: 'LEEW-TEST-003', manufacturer: 'Owner Test Host', model: 'Windows Test Laptop' };
const signedBytes = payload => sign(null, payload, privateKey);

function expectError(fn, code) {
  assert.throws(fn, e => e.message === code);
}

test('signed device passport is verified using canonical adapter and full-document hash', () => {
  const result = createOwnerSignedWindowsPassport({ request, issuerRegistry: registry, observedIdentity: observed, signedBytes, now, enrollmentId: 'test-enrollment-001' });
  const { passport } = result;
  assert.equal(passport.deviceId, request.deviceId);
  assert.equal(passport.ownerSubject, request.ownerSubject);
  assert.equal(passport.authority, 'OWNER_SIGNED_WINDOWS_PASSPORT');
  assert.equal(passport.enrollmentId, 'test-enrollment-001');
  assert.equal(passport.expiresAt, '2026-11-22T17:00:00.000Z');
  assert.equal(result.verified.identityVerified, true);
  assert.equal(result.passportSha256, windowsPassportSha256(passport));
  assert.equal(verify(null, Buffer.from(canonicalWindowsPassportPayload(passport)), publicKey, Buffer.from(passport.signature, 'base64url')), true);
});

test('invalid owner and issuer mapping deny before any local credential use', () => {
  expectError(() => resolveApprovedWindowsIssuer(registry, { ...request, ownerSubject: 'other' }, now), 'ISSUER_OWNER_MISMATCH');
  expectError(() => resolveApprovedWindowsIssuer(registry, { ...request, issuerId: 'unknown' }, now), 'ISSUER_NOT_APPROVED');
  expectError(() => resolveApprovedWindowsIssuer(registry, { ...request, keyId: 'wrong' }, now), 'ISSUER_NOT_APPROVED');
  expectError(() => resolveApprovedWindowsIssuer(registry, { ...request, ttlSeconds: 8 * 24 * 3600 }, now), 'ENROLLMENT_TTL_INVALID');
  expectError(() => resolveApprovedWindowsIssuer({ issuers: { [request.issuerId]: { ...registry.issuers[request.issuerId], status: 'REVOKED' } } }, request, now), 'ISSUER_NOT_APPROVED');
  expectError(() => resolveApprovedWindowsIssuer({ issuers: { [request.issuerId]: { ...registry.issuers[request.issuerId], validUntil: '2026-11-22T16:20:00Z' } } }, request, now), 'ISSUER_EXPIRES_BEFORE_PASSPORT');
});

test('bad signer and missing Windows host evidence fail before issuing', () => {
  expectError(() => createOwnerSignedWindowsPassport({ request, issuerRegistry: registry, observedIdentity: observed, signedBytes: payload => sign(null, payload, wrongPrivateKey), now }), 'WINDOWS_PASSPORT_SIGNATURE_INVALID');
  expectError(() => createOwnerSignedWindowsPassport({ request, issuerRegistry: registry, observedIdentity: { ...observed, platform: 'linux' }, signedBytes, now }), 'FRESH_WINDOWS_IDENTITY_REQUIRED');
  expectError(() => createOwnerSignedWindowsPassport({ request, issuerRegistry: registry, observedIdentity: observed, now }), 'APPROVED_SIGNER_REQUIRED');
});

test('local-only issuance creates a private signed artifact once, with no signer bytes in it', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'leeway-passport-test-'));
  t.after(async () => { await rm(dir, { recursive: true, force: true }); });
  const reqPath = join(dir, 'request.json'), issuerPath = join(dir, 'issuer.json');
  const keyPath = join(dir, 'approved-signer-key.pem'), outPath = join(dir, 'windows-device-passport.json');
  const ttlRequest = { ...request, ttlSeconds: 3600 };
  const liveRegistry = { issuers: { [request.issuerId]: { ...registry.issuers[request.issuerId], validUntil: '2099-01-01T00:00:00Z' } } };
  await Promise.all([
    writeFile(reqPath, JSON.stringify(ttlRequest)), writeFile(issuerPath, JSON.stringify(liveRegistry)),
    writeFile(keyPath, privatePem, { mode: 0o600 }),
  ]);
  const args = ['--request', reqPath, '--issuer-registry', issuerPath, '--signer-file', keyPath, '--output', outPath];
  const outcome = await issueOwnerWindowsPassport(args, { hostProbe: async () => observed });
  assert.equal(outcome.status, 'SIGNED_PASSPORT_CREATED_LOCAL');
  assert.equal(outcome.productionQualified, false);
  assert.equal(outcome.runtimeRegistration, 'NOT_PERFORMED');
  const saved = await readFile(outPath, 'utf8');
  assert.ok(!saved.includes('PRIVATE KEY'));
  assert.equal(JSON.parse(saved).deviceId, request.deviceId);
  await assert.rejects(issueOwnerWindowsPassport(args, { hostProbe: async () => observed }), /EEXIST/);
});
