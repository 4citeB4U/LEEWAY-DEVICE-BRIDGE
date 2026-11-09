/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.WINDOWS.IDENTITY.TEST
TAG: LEEWAY.WINDOWS.PC_PRIMARY.PASSPORT_ADAPTER_TEST_V1
WHAT: Test source-bound Windows pc-primary identity and read-only admission.
WHY: Prevent configured names, stale passports, replayed grants and wrong owners
     from becoming device identity or execution authority.
HOW: Test-only generated Ed25519 fixtures and injected Windows probe output;
      no production key, W02 operation, receipt append or live mutation.
AUTHORITY: TEST_ONLY; independent Veritas and production custody remain external.
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { Bridge } from '../packages/protocol/index.mjs';
import { createServer } from '../apps/desktop/mcp-server.mjs';
import { createC3AdmissionBinding } from '../operator/c3-admission-binding.mjs';
import { ConsentReplayGuard, createConsentEvidenceToken } from '../operator/trusted-issuer-registry.mjs';
import {
  WINDOWS_PC_PRIMARY_CONSTANTS,
  WindowsPcPrimaryAdapter,
  canonicalWindowsPassportPayload,
  createTrustedWindowsRegistryRecord,
  normalizeWindowsHostIdentity,
  readWindowsHostIdentity,
} from '../operator/windows-pc-primary.mjs';

const NOW = Date.parse('2026-11-08T20:00:00.000Z');
const OWNER = 'owner-subject-test-only';
const rawHost = {
  computerSystemProduct: { UUID: '6F9619FF-8B86-D011-B42D-00C04FC964FF', Vendor: 'LeeWay Test Vendor', Name: 'LeeWay pc-primary' },
  bios: { SerialNumber: 'BIOS-TEST-PRIMARY-001' },
  computerSystem: { Manufacturer: 'LeeWay Test Vendor', Model: 'LeeWay pc-primary' },
  operatingSystem: { Caption: 'Microsoft Windows Test', Version: '10.0.99999', BuildNumber: '99999' },
};
const observed = normalizeWindowsHostIdentity(rawHost);
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const publicKeySpki = publicKey.export({ type: 'spki', format: 'pem' });
const privateKeyPkcs8 = privateKey.export({ type: 'pkcs8', format: 'pem' });
const KEY_ID = 'test-only-windows-passport-key';
const trustRegistry = {
  [KEY_ID]: {
    issuerId: KEY_ID,
    ownerSubject: OWNER,
    keyId: KEY_ID,
    algorithm: 'Ed25519',
    publicKeySpki,
    status: 'ACTIVE',
    validUntil: '2027-01-01T00:00:00.000Z',
  },
};

function signedPassport(overrides = {}) {
  const body = {
    schemaVersion: '1.0.0',
    authority: WINDOWS_PC_PRIMARY_CONSTANTS.passportAuthority,
    platform: WINDOWS_PC_PRIMARY_CONSTANTS.platform,
    deviceId: WINDOWS_PC_PRIMARY_CONSTANTS.deviceId,
    ownerSubject: OWNER,
    issuedAt: '2026-11-08T19:00:00.000Z',
    expiresAt: '2026-11-09T19:00:00.000Z',
    keyId: KEY_ID,
    computerUuid: observed.computerUuid,
    biosSerialNumber: observed.biosSerialNumber,
    manufacturer: observed.manufacturer,
    model: observed.model,
    ...overrides,
  };
  return {
    ...body,
    signature: sign(null, Buffer.from(canonicalWindowsPassportPayload(body), 'utf8'), privateKeyPkcs8).toString('base64url'),
  };
}

function verifiedAdapter() {
  return new WindowsPcPrimaryAdapter({
    passport: signedPassport(),
    ownerSubject: OWNER,
    trustRegistry,
    hostPlatform: 'win32',
    probe: async () => observed,
    clock: () => NOW,
  });
}

test('Windows host probe is read-only and rejects incomplete identity evidence', async () => {
  let invocation;
  const identity = await readWindowsHostIdentity({
    hostPlatform: 'win32',
    commandRunner: async (...args) => {
      invocation = args;
      return { stdout: JSON.stringify(rawHost) };
    },
  });
  assert.equal(identity.computerUuid, observed.computerUuid);
  assert.equal(invocation[0], 'powershell.exe');
  assert.match(invocation[1][3], /Get-CimInstance Win32_ComputerSystemProduct/);
  assert.throws(() => normalizeWindowsHostIdentity({
    computerSystemProduct: { UUID: 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF' },
    bios: { SerialNumber: 'To Be Filled By O.E.M.' },
    computerSystem: { Manufacturer: 'Unknown', Model: 'Default String' },
  }), /WINDOWS_HOST_IDENTITY_UNQUALIFIED/);
});

test('owner-signed pc-primary observation produces identityVerified and trusted registry state', async () => {
  const adapter = verifiedAdapter();
  assert.deepEqual(await adapter.discover(), ['device.health', 'device.info']);
  const info = await adapter.execute('device.info');
  assert.equal(info.identityVerified, true);
  assert.equal(info.registrationState, 'TRUSTED_REGISTRY_READ');
  assert.equal(info.identitySource, 'WINDOWS_CIM_READONLY');
  assert.equal(info.passportAuthority, 'OWNER_SIGNED_WINDOWS_PASSPORT');
  assert.equal(info.readOnly, true);
  const registryRecord = createTrustedWindowsRegistryRecord(info);
  assert.equal(registryRecord.identityVerified, true);
  assert.equal(registryRecord.registrationState, 'TRUSTED_REGISTRY_READ');
  assert.match(registryRecord.passportSha256, /^[a-f0-9]{64}$/);
});

test('owner, host binding, expiry and signature mismatches fail closed', async () => {
  const passport = signedPassport();
  const verify = async overrides => assert.rejects(() => new WindowsPcPrimaryAdapter({
    passport: overrides.passport ?? passport,
    ownerSubject: overrides.ownerSubject ?? OWNER,
    trustRegistry: overrides.trustRegistry ?? trustRegistry,
    hostPlatform: 'win32',
    probe: async () => overrides.observed ?? observed,
    clock: () => NOW,
  }).execute('device.info'), overrides.error);

  await verify({ ownerSubject: 'different-owner', error: /WINDOWS_PASSPORT_OWNER_MISMATCH/ });
  await verify({ observed: { ...observed, model: 'different-host' }, error: /WINDOWS_PASSPORT_HOST_MISMATCH/ });
  await verify({ passport: signedPassport({ expiresAt: '2026-11-08T19:30:00.000Z' }), error: /WINDOWS_PASSPORT_EXPIRED_OR_NOT_YET_VALID/ });
  await verify({ passport: { ...passport, signature: (passport.signature.startsWith('A') ? 'B' : 'A') + passport.signature.slice(1) }, error: /WINDOWS_PASSPORT_SIGNATURE_INVALID/ });
  await verify({ trustRegistry: { [KEY_ID]: { ...trustRegistry[KEY_ID], status: 'REVOKED' } }, error: /WINDOWS_PASSPORT_ISSUER_UNTRUSTED/ });
});

test('pc-primary registration requires verified identity, not a configured name', async () => {
  const adapter = verifiedAdapter();
  const bridge = new Bridge([{
    id: 'pc-primary',
    grants: ['device.info'],
    adapter,
  }], {
    admission: async () => false,
    receiptSink: async () => {},
    deviceRegistry: new Map([['pc-primary', { platform: 'windows', identityVerified: false }]]),
  });
  const server = createServer(bridge);
  const listed = JSON.parse((await server._registeredTools.bridge_devices.handler({})).content[0].text);
  assert.deepEqual(listed.devices, []);
  const capabilities = JSON.parse((await server._registeredTools.bridge_capabilities.handler({ deviceId: 'pc-primary' })).content[0].text);
  assert.equal(capabilities.identityVerified, false);
  assert.equal(capabilities.executionAdmission, 'IDENTITY_UNVERIFIED');

  const verified = await adapter.execute('device.info');
  bridge.deviceRegistry = new Map([['pc-primary', createTrustedWindowsRegistryRecord(verified)]]);
  const trustedServer = createServer(bridge);
  const trusted = JSON.parse((await trustedServer._registeredTools.bridge_devices.handler({})).content[0].text);
  assert.deepEqual(trusted.devices, ['pc-primary']);
  assert.equal(trusted.registrationState, 'TRUSTED_REGISTRY_READ');
});

test('C3 requires trusted Windows identity and preserves replay/expiry denial', async () => {
  const verified = await verifiedAdapter().execute('device.info');
  const registered = createTrustedWindowsRegistryRecord(verified);
  const adapterRegistry = {
    adapters: [{
      adapterId: 'leeway.operator.windows.test',
      platform: 'windows',
      capabilities: {
        'device.info': { state: 'SUPPORTED', requiresHumanConsent: false },
        'device.health': { state: 'SUPPORTED', requiresHumanConsent: false },
        'device.files.read': { state: 'SUPPORTED', requiresHumanConsent: true },
      },
    }],
  };
  const { privateKey: consentPrivate, publicKey: consentPublic } = generateKeyPairSync('ed25519');
  const consentPrivatePkcs8 = consentPrivate.export({ type: 'pkcs8', format: 'pem' });
  const consentIssuer = {
    issuerId: 'test-only-consent-issuer',
    keyId: 'test-only-consent-key',
    algorithm: 'Ed25519',
    publicKeySpki: consentPublic.export({ type: 'spki', format: 'pem' }),
    status: 'ACTIVE',
    validUntil: '2027-01-01T00:00:00.000Z',
  };
  let activeToken = null;
  const replayGuard = new ConsentReplayGuard({ inMemoryOnly: true });
  const admission = createC3AdmissionBinding({
    deviceRegistry: new Map([['pc-primary', registered]]),
    registry: adapterRegistry,
    trustedIssuerRegistry: { [consentIssuer.issuerId]: consentIssuer },
    replayGuard,
    formulaPreGate: async () => true,
    veritasPreGate: async () => true,
    consentProvider: async () => activeToken,
  });
  assert.equal(await admission({ deviceId: 'pc-primary', capability: 'device.info', args: {} }), true);

  activeToken = createConsentEvidenceToken({
    issuer: consentIssuer.issuerId,
    keyId: consentIssuer.keyId,
    privateKeyPem: consentPrivatePkcs8,
    requestId: 'WINDOWS-TEST-READ-001',
    deviceId: 'pc-primary',
    platform: 'windows',
    capability: 'device.files.read',
    args: { path: 'read-only.txt' },
    sessionNonce: 'windows-test-session-001',
    tokenNonce: 'windows-test-token-001',
  });
  assert.equal(await admission({ deviceId: 'pc-primary', capability: 'device.files.read', args: { path: 'read-only.txt' } }), true);
  assert.equal(await admission({ deviceId: 'pc-primary', capability: 'device.files.read', args: { path: 'read-only.txt' } }), false);

  activeToken = createConsentEvidenceToken({
    issuer: consentIssuer.issuerId,
    keyId: consentIssuer.keyId,
    privateKeyPem: consentPrivatePkcs8,
    requestId: 'WINDOWS-TEST-READ-002',
    deviceId: 'pc-primary',
    platform: 'windows',
    capability: 'device.files.read',
    args: { path: 'read-only.txt' },
    sessionNonce: 'windows-test-session-002',
    tokenNonce: 'windows-test-token-002',
    issuedAt: new Date(NOW - 120000).toISOString(),
    ttlMs: 60000,
  });
  assert.equal(await admission({ deviceId: 'pc-primary', capability: 'device.files.read', args: { path: 'read-only.txt' } }), false);

  const unverified = createC3AdmissionBinding({
    deviceRegistry: new Map([['pc-primary', { platform: 'windows' }]]),
    registry: adapterRegistry,
    formulaPreGate: async () => true,
    veritasPreGate: async () => true,
  });
  assert.equal(await unverified({ deviceId: 'pc-primary', capability: 'device.info', args: {} }), false);
});

test('Windows adapter refuses mutation, missing passport, wrong host and bad issuer', async () => {
  assert.throws(() => new WindowsPcPrimaryAdapter({ ownerSubject: OWNER, trustRegistry, hostPlatform: 'win32' }), /WINDOWS_PASSPORT_REQUIRED/);
  assert.throws(() => new WindowsPcPrimaryAdapter({ passport: signedPassport(), ownerSubject: OWNER, trustRegistry, hostPlatform: 'linux' }), /WINDOWS_HOST_REQUIRED/);
  assert.throws(() => new WindowsPcPrimaryAdapter({ passport: signedPassport(), ownerSubject: OWNER, trustRegistry: {}, hostPlatform: 'win32' }), /WINDOWS_PASSPORT_ISSUER_UNTRUSTED/);
  await assert.rejects(verifiedAdapter().execute('device.files.write'), /CAPABILITY_UNAVAILABLE/);
});

console.log('PASS source-bound Windows pc-primary identity, trusted registration and fail-closed denial tests');
