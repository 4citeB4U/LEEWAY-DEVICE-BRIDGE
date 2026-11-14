import test from 'node:test';
import assert from 'node:assert/strict';
import { createEnrollmentRelayBindingAuthority } from '../operator/identity/enrollment-relay-binding-authority.mjs';
import { receiptPayloadSha256 } from '../operator/identity/receipt-authority-client.mjs';

const ownerSubject = 'owner-subject-12345678';
const thumbprint = 'a'.repeat(32);
const pending = { enrollmentId: 'enr-authority-01', challenge: 'a'.repeat(32), expiresAt: '2030-01-01T00:00:00.000Z', ownerSubject, platform: 'windows', deviceKeyThumbprint: thumbprint };
const compactJws = `${'a'.repeat(16)}.${'b'.repeat(16)}.${'c'.repeat(16)}`;

function authority(overrides = {}) {
  return createEnrollmentRelayBindingAuthority({
    pendingEnrollments: { async begin(input) { return { ...pending, ...input, enrollmentId: pending.enrollmentId, challenge: pending.challenge, expiresAt: pending.expiresAt }; }, async read() { return pending; }, async consume() { return pending; } },
    deviceProofVerifier: { async verify() { return true; } },
    ownerApprovalVerifier: { async verify() { return true; } },
    trustedDeviceRegistry: { async admit() { return { deviceId: 'portable-device-01', ownerSubject, platform: 'windows', status: 'ACTIVE', deviceKeyThumbprint: thumbprint, capabilityGrantVersion: 1 }; } },
    relayBindingPolicy: { async resolve({ deviceRecord }) { return { schema: 'leeway.device-bridge.relay-binding.v1', ownerSubject, deviceId: deviceRecord.deviceId, issuer: 'https://primary.example.test', endpoint: 'wss://relay.example.test/api/device-relay', expiresAt: '2030-01-02T00:00:00.000Z' }; } },
    relayBindingSigner: { async sign() { return compactJws; } },
    receiptAuthority: { async appendAndReadBack(evidence) { return { payloadSha256: receiptPayloadSha256(evidence) }; } },
    ...overrides,
  });
}

test('primary enrollment authority admits only an owner-bound portable device and returns a signed relay binding', async () => {
  const service = authority();
  const started = await service.beginEnrollment({ ownerSubject, platform: 'windows', devicePublicJwk: { kty: 'EC' }, deviceKeyThumbprint: thumbprint, requestedCapabilities: ['device.health'], packageIdentity: { packageId: 'com.leeway.devicebridge' } });
  assert.equal(started.enrollmentId, pending.enrollmentId);
  const completed = await service.completeEnrollment({ ownerSubject, enrollmentId: started.enrollmentId, deviceProof: 'proof', ownerProof: 'approval' });
  assert.equal(completed.deviceRecord.deviceId, 'portable-device-01');
  assert.equal(completed.relayBindingArtifact, compactJws);
  assert.match(completed.enrollmentReceiptSha256, /^[a-f0-9]{64}$/);
});

test('primary enrollment authority fails closed on owner mismatch, denied proof, invalid relay policy, and missing receipt readback', async () => {
  await assert.rejects(() => authority({ pendingEnrollments: { async begin() { return pending; }, async read() { return { ...pending, ownerSubject: 'other-owner-12345678' }; }, async consume() { return pending; } } }).completeEnrollment({ ownerSubject, enrollmentId: pending.enrollmentId, deviceProof: 'proof', ownerProof: 'approval' }), /ENROLLMENT_PENDING_NOT_ACTIVE/);
  await assert.rejects(() => authority({ deviceProofVerifier: { async verify() { return false; } } }).completeEnrollment({ ownerSubject, enrollmentId: pending.enrollmentId, deviceProof: 'proof', ownerProof: 'approval' }), /ENROLLMENT_DEVICE_PROOF_REJECTED/);
  await assert.rejects(() => authority({ relayBindingPolicy: { async resolve() { return {}; } } }).completeEnrollment({ ownerSubject, enrollmentId: pending.enrollmentId, deviceProof: 'proof', ownerProof: 'approval' }), /ENROLLMENT_RELAY_POLICY_INVALID/);
  await assert.rejects(() => authority({ receiptAuthority: { async appendAndReadBack() { return { payloadSha256: '0'.repeat(64) }; } } }).completeEnrollment({ ownerSubject, enrollmentId: pending.enrollmentId, deviceProof: 'proof', ownerProof: 'approval' }), /ENROLLMENT_RECEIPT_READBACK_INVALID/);
});

test('rejected proof cannot consume another device enrollment', async () => {
  let consumed = false;
  const service = authority({
    pendingEnrollments: { async begin() { return pending; }, async read() { return pending; }, async consume() { consumed = true; return pending; } },
    deviceProofVerifier: { async verify() { return false; } },
  });
  await assert.rejects(() => service.completeEnrollment({ ownerSubject, enrollmentId: pending.enrollmentId, deviceProof: 'forged', ownerProof: 'approval' }), /ENROLLMENT_DEVICE_PROOF_REJECTED/);
  assert.equal(consumed, false);
});
