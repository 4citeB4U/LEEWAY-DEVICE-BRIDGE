import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntimeEnrollmentAuthorityClient } from '../operator/identity/runtime-enrollment-authority-client.mjs';

const runtimeOrigin = 'https://runtime.example.test';
const accessTokenProvider = { async getAccessToken() { return 'runtime-access-token-0123456789'; } };

test('Runtime enrollment client preserves exact origin and binds bearer plus DPoP proof', async () => {
  const requests = [];
  const client = createRuntimeEnrollmentAuthorityClient({
    baseUrl: runtimeOrigin,
    approvedRuntimeOrigin: runtimeOrigin,
    accessTokenProvider,
    dpopProofProvider: { async createProof(input) { return `dpop-proof-for-${input.method}`; } },
    async fetchImpl(url, init) {
      requests.push({ url: url.toString(), init });
      return new Response(JSON.stringify({ enrollmentId: 'enrollment-123', challenge: 'challenge', expiresAt: '2026-12-01T00:00:00.000Z' }), { status: 200 });
    },
  });

  const result = await client.beginEnrollment({ platform: 'windows' });
  assert.equal(result.enrollmentId, 'enrollment-123');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, `${runtimeOrigin}/v1/device-enrollments`);
  assert.equal(requests[0].init.headers.authorization, 'Bearer runtime-access-token-0123456789');
  assert.equal(requests[0].init.headers.dpop, 'dpop-proof-for-POST');
});

test('Runtime enrollment client refuses an unapproved origin, missing credential, and failed response', async () => {
  assert.throws(() => createRuntimeEnrollmentAuthorityClient({
    baseUrl: 'https://attacker.example.test', approvedRuntimeOrigin: runtimeOrigin, accessTokenProvider,
  }), /RUNTIME_ENROLLMENT_ORIGIN_UNAPPROVED/);
  const noToken = createRuntimeEnrollmentAuthorityClient({
    baseUrl: runtimeOrigin,
    approvedRuntimeOrigin: runtimeOrigin,
    accessTokenProvider: { async getAccessToken() { return ''; } },
  });
  await assert.rejects(noToken.beginEnrollment({}), /RUNTIME_ENROLLMENT_ACCESS_TOKEN_REQUIRED/);
  const rejected = createRuntimeEnrollmentAuthorityClient({
    baseUrl: runtimeOrigin,
    approvedRuntimeOrigin: runtimeOrigin,
    accessTokenProvider,
    async fetchImpl() { return new Response('{}', { status: 403 }); },
  });
  await assert.rejects(rejected.beginEnrollment({}), /RUNTIME_ENROLLMENT_HTTP_403/);
});

test('Runtime enrollment client validates enrollment identifier before completing', async () => {
  const client = createRuntimeEnrollmentAuthorityClient({
    baseUrl: runtimeOrigin, approvedRuntimeOrigin: runtimeOrigin, accessTokenProvider,
    async fetchImpl() { throw new Error('request should not be sent'); },
  });
  assert.throws(() => client.completeEnrollment({ enrollmentId: '../bad' }), /RUNTIME_ENROLLMENT_ID_INVALID/);
});
