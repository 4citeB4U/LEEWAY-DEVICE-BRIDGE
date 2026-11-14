import test from 'node:test';
import assert from 'node:assert/strict';
import { createDynamicEnrollment } from '../operator/dynamic-enrollment.mjs';

const thumbprint = 'a'.repeat(32);
const receipt = 'b'.repeat(64);
const relayBindingArtifact = `${'a'.repeat(16)}.${'b'.repeat(16)}.${'c'.repeat(16)}`;

function verifiedRelayBinding({ deviceRecord }) {
  return {
    verified: true,
    signatureVerified: true,
    binding: {
      schema: 'leeway.device-bridge.relay-binding.v1',
      issuer: 'https://runtime.example.test',
      deviceId: deviceRecord.deviceId,
      ownerSubject: deviceRecord.ownerSubject,
      endpoint: 'wss://relay.example.test/api/device-relay',
      expiresAt: '2030-12-01T00:00:00.000Z',
    },
  };
}

function providers(overrides = {}) {
  return {
    keyProvider: {
      async loadOrCreate() { return { publicJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' }, thumbprint, reference: 'native-key-reference' }; },
      async signChallenge() { return 'signed-device-challenge-proof'; },
    },
    enrollmentAuthority: {
      async beginEnrollment() { return { enrollmentId: 'enr-test-01', challenge: 'runtime-issued-nonce', expiresAt: '2026-12-01T00:00:00.000Z' }; },
      async completeEnrollment() {
        return { accessToken: 'dpop-bound-access-token', enrollmentReceiptSha256: receipt, deviceRecord: {
          deviceId: 'dev-windows-secondary-01', platform: 'windows', status: 'ACTIVE',
          deviceKeyThumbprint: thumbprint, ownerSubject: 'owner-fixture', capabilityGrantVersion: 1,
        }, relayBindingArtifact };
      },
    },
    serviceEntitlement: { async authorizeEnrollment() { return { serviceEnabled: true, enrollmentAllowed: true }; } },
    ownerApproval: { async approveEnrollment() { return { approved: true, ownerProof: 'owner-approved-enrollment-proof' }; } },
    localCustody: { async saveEnrollment() {} },
    runtimeStarter: { async startEnrolledRuntime() { return { started: true, transport: 'fixture-runtime' }; } },
    capabilityProbe: { async probeCapabilities() { return ['device.health', 'device.info']; } },
    relayBindingVerifier: { async verifyRelayBinding(input) { return verifiedRelayBinding(input); } },
    ...overrides,
  };
}

test('dynamic enrollment activates an arbitrary Windows device without hostname or mesh-token identity', async () => {
  let custodyInput;
  let runtimeInput;
  const enrollment = createDynamicEnrollment(providers({
    localCustody: { async saveEnrollment(input) { custodyInput = input; } },
    runtimeStarter: { async startEnrolledRuntime(input) { runtimeInput = input; return { started: true, transport: 'fixture-runtime' }; } },
  }));
  const result = await enrollment.enroll({
    account: { issuer: 'https://identity.example.test', subject: 'user-stable-oidc-subject-01' },
    platform: 'windows',
    packageIdentity: { packageId: 'com.leeway.devicebridge', version: '1.0.0', artifactSha256: 'c'.repeat(64) },
    requestedCapabilities: ['device.info', 'device.health'],
  });
  assert.equal(result.state, 'ACTIVE');
  assert.equal(result.deviceId, 'dev-windows-secondary-01');
  assert.deepEqual(result.measuredCapabilities, ['device.health', 'device.info']);
  assert.equal(result.relayBinding.endpoint, 'wss://relay.example.test/api/device-relay');
  assert.equal(custodyInput.relayBinding.deviceId, result.deviceId);
  assert.equal(runtimeInput.relayBinding.ownerSubject, 'owner-fixture');
});

test('dynamic enrollment refuses missing owner approval and a mismatched completed key', async () => {
  const noApproval = createDynamicEnrollment(providers({ ownerApproval: { async approveEnrollment() { return { approved: false }; } } }));
  await assert.rejects(() => noApproval.enroll({
    account: { issuer: 'https://identity.example.test', subject: 'user-stable-oidc-subject-01' },
    platform: 'windows', packageIdentity: { packageId: 'com.leeway.devicebridge', version: '1.0.0', artifactSha256: 'c'.repeat(64) }, requestedCapabilities: ['device.health'],
  }), /OWNER_ENROLLMENT_APPROVAL_REQUIRED/);

  const wrongKey = createDynamicEnrollment(providers({ enrollmentAuthority: {
    async beginEnrollment() { return { enrollmentId: 'enr-test-02', challenge: 'runtime-issued-nonce', expiresAt: '2026-12-01T00:00:00.000Z' }; },
    async completeEnrollment() { return { accessToken: 'dpop-bound-access-token', enrollmentReceiptSha256: receipt, relayBindingArtifact, deviceRecord: {
      deviceId: 'dev-windows-secondary-02', platform: 'windows', status: 'ACTIVE', deviceKeyThumbprint: 'z'.repeat(32), ownerSubject: 'owner-fixture', capabilityGrantVersion: 1,
    } }; },
  } }));
  await assert.rejects(() => wrongKey.enroll({
    account: { issuer: 'https://identity.example.test', subject: 'user-stable-oidc-subject-01' },
    platform: 'windows', packageIdentity: { packageId: 'com.leeway.devicebridge', version: '1.0.0', artifactSha256: 'c'.repeat(64) }, requestedCapabilities: ['device.health'],
  }), /ENROLLMENT_COMPLETION_INVALID/);
});

test('dynamic enrollment refuses an absent, expired, or foreign-device relay binding', async () => {
  const missingBinding = createDynamicEnrollment(providers({ enrollmentAuthority: {
    async beginEnrollment() { return { enrollmentId: 'enr-test-03', challenge: 'runtime-issued-nonce', expiresAt: '2030-12-01T00:00:00.000Z' }; },
    async completeEnrollment() { return { accessToken: 'dpop-bound-access-token', enrollmentReceiptSha256: receipt, deviceRecord: {
      deviceId: 'dev-windows-secondary-03', platform: 'windows', status: 'ACTIVE', deviceKeyThumbprint: thumbprint, ownerSubject: 'owner-fixture', capabilityGrantVersion: 1,
    } }; },
  } }));
  await assert.rejects(() => missingBinding.enroll({
    account: { issuer: 'https://identity.example.test', subject: 'user-stable-oidc-subject-01' },
    platform: 'windows', packageIdentity: { packageId: 'com.leeway.devicebridge', version: '1.0.0', artifactSha256: 'c'.repeat(64) }, requestedCapabilities: ['device.health'],
  }), /ENROLLMENT_RELAY_BINDING_MISSING/);

  const foreignBinding = createDynamicEnrollment(providers({ relayBindingVerifier: { async verifyRelayBinding(input) {
    const binding = verifiedRelayBinding(input);
    binding.binding.deviceId = 'another-enrolled-device';
    return binding;
  } } }));
  await assert.rejects(() => foreignBinding.enroll({
    account: { issuer: 'https://identity.example.test', subject: 'user-stable-oidc-subject-01' },
    platform: 'windows', packageIdentity: { packageId: 'com.leeway.devicebridge', version: '1.0.0', artifactSha256: 'c'.repeat(64) }, requestedCapabilities: ['device.health'],
  }), /ENROLLMENT_RELAY_BINDING_INVALID/);
});

test('dynamic enrollment blocks before device-key creation when service entitlement is absent', async () => {
  const enrollment = createDynamicEnrollment(providers({
    serviceEntitlement: { async authorizeEnrollment() { return { serviceEnabled: false, enrollmentAllowed: false }; } },
  }));
  await assert.rejects(() => enrollment.enroll({
    account: { issuer: 'https://identity.example.test', subject: 'user-stable-oidc-subject-01' },
    platform: 'windows',
    packageIdentity: { packageId: 'com.leeway.devicebridge', version: '1.0.0', artifactSha256: 'c'.repeat(64) },
    requestedCapabilities: ['device.health'],
  }), /SERVICE_ENTITLEMENT_REQUIRED/);
});
