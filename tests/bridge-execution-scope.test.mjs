/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.AUTH.EXECUTION_SCOPE_TESTS
TAG: LEEWAY.AUTH.EXPLICIT_EXECUTION_SCOPE_REGRESSION
5WH:
WHAT = Distinguish delegated OAuth execution scope from project-role labels.
WHY = Ensure a similarly named role cannot enable a consequential device command.
WHO = LeeWay Device Bridge contributors under Creator authority.
WHERE = tests/bridge-execution-scope.test.mjs
WHEN = 2026-11-20.
HOW = Use locally signed JWT fixtures with the real access-token verifier.
LICENSE = MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { createPocketIdAuthenticator } from '../operator/identity/pocket-id-access.mjs';

const issuer = 'https://identity.example.test';
const resource = 'https://bridge.example.test/mcp';
const ownerSubject = 'owner-12345678';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicJwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256', use: 'sig' };
const fetchImpl = async url => ({
  ok: true,
  json: async () => String(url).endsWith('/.well-known/openid-configuration')
    ? { issuer, jwks_uri: issuer + '/jwks' }
    : { keys: [publicJwk] },
});
function signedAccessToken(claimOverrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'test-key', typ: 'JWT' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({
    iss: issuer, sub: ownerSubject, aud: resource, iat: now, exp: now + 300,
    ...claimOverrides,
  })).toString('base64url');
  const body = header + '.' + claims;
  return body + '.' + sign('RSA-SHA256', Buffer.from(body), privateKey).toString('base64url');
}
const request = jwt => ({ headers: { authorization: 'Bearer ' + jwt } });
const authenticator = permission => createPocketIdAuthenticator({
  issuer, resource, ownerSubject, permission, fetchImpl,
});

test('an execution-named project role alone cannot grant execution', async () => {
  const authenticate = authenticator('device.bridge.execute');
  const token = signedAccessToken({
    'urn:zitadel:iam:org:project:roles': { 'device.bridge.execute': {} },
  });
  assert.equal(await authenticate(request(token)), false);
});

test('the exact delegated execution OAuth scope is accepted for the signed owner token', async () => {
  const authenticate = authenticator('device.bridge.execute');
  const token = signedAccessToken({ scope: 'device.bridge.execute' });
  assert.equal(await authenticate(request(token)), true);
});

test('read-only ZITADEL role aliases are still supported for discovery', async () => {
  const authenticate = authenticator('device.bridge.read');
  const token = signedAccessToken({
    'urn:zitadel:iam:org:project:roles': { 'device.discovery.read': {} },
  });
  assert.equal(await authenticate(request(token)), true);
});

test('a scoped execution token from the wrong owner is denied', async () => {
  const authenticate = authenticator('device.bridge.execute');
  const token = signedAccessToken({ sub: 'someone-else', scope: 'device.bridge.execute' });
  assert.equal(await authenticate(request(token)), false);
});
