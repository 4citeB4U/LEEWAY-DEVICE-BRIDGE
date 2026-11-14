import test from 'node:test';
import assert from 'node:assert/strict';
import { createDynamicEnrollment } from '../operator/dynamic-enrollment.mjs';

const thumbprint = 'a'.repeat(32);
const receipt = 'b'.repeat(64);

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
        } };
      },
    },
    ownerApproval: { async approveEnrollment() { return { approved: true, ownerProof: 'owner-approved-enrollment-proof' }; } },
    localCustody: { async saveEnrollment() {} },
    runtimeStarter: { async startEnrolledRuntime() { return { started: true, transport: 'fixture-runtime' }; } },
    capabilityProbe: { async probeCapabilities() { return ['device.health', 'device.info']; } },
    ...overrides,
  };
}

test('dynamic enrollment activates an arbitrary Windows device without hostname or mesh-token identity', async () => {
  const enrollment = createDynamicEnrollment(providers());
  const result = await enrollment.enroll({
    platform: 'windows',
    packageIdentity: { packageId: 'com.leeway.devicebridge', version: '1.0.0', artifactSha256: 'c'.repeat(64) },
    requestedCapabilities: ['device.info', 'device.health'],
  });
  assert.equal(result.state, 'ACTIVE');
  assert.equal(result.deviceId, 'dev-windows-secondary-01');
  assert.deepEqual(result.measuredCapabilities, ['device.health', 'device.info']);
});

test('dynamic enrollment refuses missing owner approval and a mismatched completed key', async () => {
  const noApproval = createDynamicEnrollment(providers({ ownerApproval: { async approveEnrollment() { return { approved: false }; } } }));
  await assert.rejects(() => noApproval.enroll({
    platform: 'windows', packageIdentity: { packageId: 'com.leeway.devicebridge', version: '1.0.0', artifactSha256: 'c'.repeat(64) }, requestedCapabilities: ['device.health'],
  }), /OWNER_ENROLLMENT_APPROVAL_REQUIRED/);

  const wrongKey = createDynamicEnrollment(providers({ enrollmentAuthority: {
    async beginEnrollment() { return { enrollmentId: 'enr-test-02', challenge: 'runtime-issued-nonce', expiresAt: '2026-12-01T00:00:00.000Z' }; },
    async completeEnrollment() { return { accessToken: 'dpop-bound-access-token', enrollmentReceiptSha256: receipt, deviceRecord: {
      deviceId: 'dev-windows-secondary-02', platform: 'windows', status: 'ACTIVE', deviceKeyThumbprint: 'z'.repeat(32), ownerSubject: 'owner-fixture', capabilityGrantVersion: 1,
    } }; },
  } }));
  await assert.rejects(() => wrongKey.enroll({
    platform: 'windows', packageIdentity: { packageId: 'com.leeway.devicebridge', version: '1.0.0', artifactSha256: 'c'.repeat(64) }, requestedCapabilities: ['device.health'],
  }), /ENROLLMENT_COMPLETION_INVALID/);
});
