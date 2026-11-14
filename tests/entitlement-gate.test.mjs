import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateBridgeEntitlement, PRODUCT_ID } from '../operator/entitlement-gate.mjs';

const account = { identityVerified: true, issuer: 'https://identity.example.test', subject: 'user-stable-oidc-subject-01' };
const entitlement = {
  issuer: account.issuer, subject: account.subject, productId: PRODUCT_ID, status: 'ACTIVE',
  deviceLimit: 100, validUntil: '2027-01-01T00:00:00.000Z', licenseMode: 'SUBSCRIPTION',
};
const deviceId = 'portable-device-001';
const at = new Date('2026-11-13T00:00:00.000Z');

test('a portable paid account can enroll device one and device one hundred without device-name rules', () => {
  const first = evaluateBridgeEntitlement({ account, entitlement, deviceId, registeredDeviceCount: 0, now: at });
  const hundredth = evaluateBridgeEntitlement({ account, entitlement, deviceId: 'portable-device-100', registeredDeviceCount: 99, now: at });
  assert.equal(first.serviceEnabled, true);
  assert.equal(hundredth.enrollmentAllowed, true);
  assert.equal(first.subject, account.subject);
  assert.equal(Object.hasOwn(first, 'email'), false);
});

test('a device ceiling applies consistently, while an existing enrolled device can reconnect', () => {
  const denied = evaluateBridgeEntitlement({ account, entitlement, deviceId, registeredDeviceCount: 100, now: at });
  assert.equal(denied.reason, 'DEVICE_LIMIT_REACHED');
  const reconnect = evaluateBridgeEntitlement({ account, entitlement, deviceId, registeredDeviceCount: 100, enrolledDeviceIds: [deviceId], now: at });
  assert.equal(reconnect.serviceEnabled, true);
});

test('suspending service disables remote Bridge access without taking customer data', () => {
  const suspended = evaluateBridgeEntitlement({ account, entitlement: { ...entitlement, status: 'PAST_DUE' }, deviceId, now: at });
  assert.equal(suspended.serviceEnabled, false);
  assert.equal(suspended.reason, 'SERVICE_ENTITLEMENT_SUSPENDED');
  assert.deepEqual(suspended.localCustody, { dataPreserved: true, localRead: true, localExport: true, remoteControl: false });
});

test('the gate refuses raw email as a substitute for the account subject', () => {
  const unverified = evaluateBridgeEntitlement({ account: { issuer: account.issuer, subject: account.subject }, entitlement, deviceId, now: at });
  assert.equal(unverified.reason, 'ACCOUNT_SUBJECT_REQUIRED');
  const invalid = evaluateBridgeEntitlement({ account: { identityVerified: true, issuer: account.issuer, subject: 'person@example.test' }, entitlement, deviceId, now: at });
  assert.equal(invalid.reason, 'ENTITLEMENT_ACCOUNT_OR_PRODUCT_MISMATCH');
});
