import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrimaryEnrollmentAuthorityHttp } from '../operator/identity/primary-enrollment-authority-http.mjs';

const ownerSubject = 'owner-subject-12345678';
function request(path, body = {}, headers = {}) {
  return new Request(`https://primary.example.test${path}`, { method: 'POST', headers: { authorization: 'Bearer primary-test-token-1234', 'x-leeway-owner-subject': ownerSubject, 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
}
function handler(overrides = {}) {
  return createPrimaryEnrollmentAuthorityHttp({
    authority: { async beginEnrollment(input) { return { enrollmentId: 'enr-authority-01', ownerSubject: input.ownerSubject }; }, async completeEnrollment(input) { return { deviceId: 'portable-device-01', enrollmentId: input.enrollmentId }; } },
    requestAuthenticator: { async authenticate({ ownerSubject: supplied }) { return { ownerSubject: supplied }; } },
    ...overrides,
  });
}

test('primary HTTP boundary independently authenticates forwarded owner identity before authority dispatch', async () => {
  const service = handler();
  const started = await service(request('/v1/device-enrollments', { platform: 'windows' }));
  assert.equal(started.status, 200);
  assert.equal((await started.json()).ownerSubject, ownerSubject);
  const completed = await service(request('/v1/device-enrollments/enr-authority-01/complete', { deviceProof: 'proof', ownerProof: 'approval' }));
  assert.equal(completed.status, 200);
  assert.equal((await completed.json()).enrollmentId, 'enr-authority-01');
});

test('primary HTTP boundary rejects untrusted owner, invalid path, invalid JSON, and authority details', async () => {
  const denied = handler({ requestAuthenticator: { async authenticate() { return undefined; } } });
  assert.equal((await denied(request('/v1/device-enrollments'))).status, 403);
  assert.equal((await handler()(request('/v1/other'))).status, 404);
  const malformed = new Request('https://primary.example.test/v1/device-enrollments', { method: 'POST', headers: { authorization: 'Bearer primary-test-token-1234', 'x-leeway-owner-subject': ownerSubject }, body: '[' });
  assert.equal((await handler()(malformed)).status, 400);
  const rejected = handler({ authority: { async beginEnrollment() { throw new Error('ENROLLMENT_DEVICE_PROOF_REJECTED'); }, async completeEnrollment() { throw new Error('unexpected details'); } } });
  assert.deepEqual(await (await rejected(request('/v1/device-enrollments'))).json(), { error: 'ENROLLMENT_DEVICE_PROOF_REJECTED' });
});
