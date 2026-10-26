/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.TEST
TAG: LEEWAY.POCKET_ID.RESOURCE.JWT.TEST
WHO: LeeWay Industries
WHAT: In-memory RSA JWT authentication acceptance and denial tests
WHY: A configured issuer never implies unsigned or wrong-audience authority
WHERE: tests/mcp/pocket-id-access.test.mjs
WHEN: 2026-10-26
HOW: Generate ephemeral test RSA key + signed JWT + mocked metadata
AUTHORITY: Test-only fixture; not live Pocket ID enrollment
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { createPocketIdAuthenticator } from '../../operator/identity/pocket-id-access.mjs';

test('Pocket ID API JWT requires valid issuer, audience, owner and permission', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const issuer = 'https://identity.example.test:10000';
  const resource = 'https://bridge.example.test/mcp';
  const now = 1792987200000;
  const fetchImpl = async url => ({
    ok: true,
    json: async () => url.endsWith('openid-configuration')
      ? { issuer, jwks_uri: issuer + '/.well-known/jwks.json' }
      : { keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'fixture-key', alg: 'RS256', use: 'sig' }] },
  });
  const auth = createPocketIdAuthenticator({ issuer, resource, ownerSubject: 'owner-123', fetchImpl, now: () => now });
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const token = extra => {
    const claims = {
      iss: issuer, sub: 'owner-123', aud: resource,
      scope: 'openid device.bridge.read', iat: now / 1000 - 30, exp: now / 1000 + 300,
      ...extra,
    };
    const message = encode({ kid: 'fixture-key', alg: 'RS256', typ: 'at+jwt' }) + '.' + encode(claims);
    return message + '.' + sign('RSA-SHA256', Buffer.from(message), privateKey).toString('base64url');
  };
  const req = value => ({ headers: { authorization: 'Bearer ' + value } });
  assert.equal(await auth(req(token())), true);
  assert.equal(await auth(req(token({ iss: 'https://wrong.example.test' }))), false);
  assert.equal(await auth(req(token({ aud: 'https://wrong.example.test/mcp' }))), false);
  assert.equal(await auth(req(token({ sub: 'another-owner' }))), false);
  assert.equal(await auth(req(token({ scope: 'openid' }))), false);
  assert.equal(await auth(req(token({ exp: now / 1000 - 1 }))), false);
  assert.equal(await auth({ headers: {} }), false);
  const tampered = token().split('.');
  tampered[1] = encode({ iss: issuer, sub: 'owner-123', aud: resource, scope: 'device.bridge.read', iat: now/1000, exp: now/1000+300 });
  assert.equal(await auth(req(tampered.join('.'))), false);
});

test('Pocket ID verifier rejects missing owner enrollment, insecure issuer and insecure resource', () => {
  assert.throws(() => createPocketIdAuthenticator({ issuer: 'http://localhost:1411', resource: 'https://bridge.example.test/mcp', ownerSubject: 'owner' }), /ISSUER_HTTPS_REQUIRED/);
  assert.throws(() => createPocketIdAuthenticator({ issuer: 'https://identity.example.test', resource: 'http://bridge.example.test/mcp', ownerSubject: 'owner' }), /RESOURCE_HTTPS_REQUIRED/);
  assert.throws(() => createPocketIdAuthenticator({ issuer: 'https://identity.example.test', resource: 'https://bridge.example.test/mcp' }), /OWNER_SUBJECT_REQUIRED/);
});
