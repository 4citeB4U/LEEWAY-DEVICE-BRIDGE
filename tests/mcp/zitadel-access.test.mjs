/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.TEST
TAG: LEEWAY.ZITADEL.RESOURCE.JWT.TEST.V2
WHO: LeeWay Industries
WHAT: In-memory RS256 and ES256 ZITADEL JWT acceptance, revocation, and retired-issuer denial tests
WHY: Enforce single ZITADEL authority and fail closed on unsigned, ID, revoked, wrong-audience, or retired Pocket ID tokens
WHERE: tests/mcp/zitadel-access.test.mjs
WHEN: 2026-11-12
HOW: Ephemeral RSA P-2048 and EC P-256 keys + signed JWTs + mocked OIDC discovery
AUTHORITY: Test-only fixture; not live ZITADEL enrollment
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import {
  assertNoRetiredIdentityEnv,
  createZitadelAuthenticator,
} from '../../operator/identity/zitadel-access.mjs';

test('ZITADEL JWT verifier enforces RS256, ES256, typ allowlist, aud slashes, owner, roles, and jti revocation', async () => {
  const rsaKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const ecKeys = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const issuer = 'https://identity.example.test:10000';
  const resource = 'https://bridge.example.test/mcp';
  const slashAudience = 'https://runtime.example.test/api/mcp';
  const projectId = '397622361785898800';
  const now = 1792987200000;

  const fetchImpl = async url => ({
    ok: true,
    json: async () => String(url).endsWith('openid-configuration')
      ? { issuer, jwks_uri: issuer + '/.well-known/jwks.json' }
      : {
          keys: [
            { ...rsaKeys.publicKey.export({ format: 'jwk' }), kid: 'rsa-key-1', alg: 'RS256', use: 'sig' },
            { ...ecKeys.publicKey.export({ format: 'jwk' }), kid: 'ec-key-1', alg: 'ES256', use: 'sig' },
          ],
        },
  });

  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const signRsa = (claims, headerOverrides = {}) => {
    const message = encode({ kid: 'rsa-key-1', alg: 'RS256', typ: 'at+jwt', ...headerOverrides }) + '.' + encode(claims);
    return message + '.' + sign('RSA-SHA256', Buffer.from(message), rsaKeys.privateKey).toString('base64url');
  };
  const signEs256 = (claims, headerOverrides = {}) => {
    const message = encode({ kid: 'ec-key-1', alg: 'ES256', typ: 'JWT', ...headerOverrides }) + '.' + encode(claims);
    return message + '.' + sign('sha256', Buffer.from(message), { key: ecKeys.privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  };

  const baseClaims = (extra = {}) => ({
    iss: issuer,
    sub: 'owner-123',
    aud: resource,
    scope: 'openid device.bridge.read',
    jti: 'jti-valid-1',
    iat: now / 1000 - 30,
    exp: now / 1000 + 300,
    ...extra,
  });

  let dynamicallyRevoked = false;
  const auth = createZitadelAuthenticator({
    issuer,
    resource,
    ownerSubject: 'owner-123',
    projectId,
    tokenAudiences: [projectId, slashAudience],
    revokedJtis: ['jti-revoked-static'],
    isTokenRevoked: async claims => claims.jti === 'jti-revoked-dynamic' && dynamicallyRevoked,
    fetchImpl,
    now: () => now,
  });

  const req = value => ({ headers: { authorization: 'Bearer ' + value } });

  assert.equal(await auth(req(signRsa(baseClaims()))), true);
  assert.equal(await auth(req(signEs256(baseClaims({ jti: 'jti-es256-1', aud: slashAudience })))), true);
  assert.equal(await auth(req(signRsa(baseClaims({ aud: projectId })))), true);
  assert.equal(await auth(req(signRsa(baseClaims(), { typ: 'access-token' }))), true);
  assert.equal(await auth(req(signRsa(baseClaims(), { typ: undefined }))), true);
  assert.equal(await auth(req(signRsa(baseClaims(), { typ: 'id-token' }))), false);
  assert.equal(await auth(req(signRsa(baseClaims(), { typ: 'JWT+UNSIGNED' }))), false);
  assert.equal(await auth(req(signRsa(baseClaims({ token_type: 'id_token' })))), false);

  assert.equal(await auth(req(signRsa(baseClaims({ jti: 'jti-revoked-static' })))), false);
  assert.equal(await auth(req(signRsa(baseClaims({ jti: 'jti-revoked-dynamic' })))), true);
  dynamicallyRevoked = true;
  assert.equal(await auth(req(signRsa(baseClaims({ jti: 'jti-revoked-dynamic' })))), false);

  assert.equal(await auth(req(signRsa(baseClaims({ iss: 'https://wrong.example.test' })))), false);
  assert.equal(await auth(req(signRsa(baseClaims({ aud: 'https://wrong.example.test/mcp' })))), false);
  assert.equal(await auth(req(signRsa(baseClaims({ sub: 'another-owner' })))), false);
  assert.equal(await auth(req(signRsa(baseClaims({ scope: 'openid' })))), false);
  assert.equal(await auth(req(signRsa(baseClaims({ scope: 'openid device.discovery.read' })))), true);
  assert.equal(await auth(req(signRsa(baseClaims({
    scope: 'openid',
    [`urn:zitadel:iam:org:project:${projectId}:roles`]: { 'device.bridge.read': {} },
  })))), true);
  assert.equal(await auth(req(signRsa(baseClaims({
    scope: 'openid',
    'urn:zitadel:iam:org:project:roles': { 'device.bridge.execute': {} },
  })))), false);
  assert.equal(await auth(req(signRsa(baseClaims({ exp: now / 1000 - 1 })))), false);
  assert.equal(await auth({ headers: {} }), false);

  const tampered = signRsa(baseClaims()).split('.');
  tampered[1] = encode(baseClaims({ scope: 'device.bridge.read' }));
  assert.equal(await auth(req(tampered.join('.'))), false);
});

test('ZITADEL verifier rejects retired Pocket ID issuers, retired env vars, and insecure bindings', () => {
  const retiredPortUrl = 'http://localhost:' + String(1400 + 11);
  const retiredHostUrl = 'https://' + ['auth', 'leeway', 'industries'].join('.');
  const retiredSlugUrl = 'https://' + ['pocket', 'id'].join('-') + '.example.test';
  const retiredEnvKey = ['LEEWAY', 'POCKET', 'ID', 'ISSUER'].join('_');

  assert.throws(
    () => createZitadelAuthenticator({ issuer: retiredPortUrl, resource: 'https://bridge.example.test/mcp', ownerSubject: 'owner' }),
    /ISSUER_HTTPS_REQUIRED/,
  );
  assert.throws(
    () => createZitadelAuthenticator({ issuer: retiredHostUrl, resource: 'https://bridge.example.test/mcp', ownerSubject: 'owner' }),
    /RETIRED_IDENTITY_ISSUER_REJECTED/,
  );
  assert.throws(
    () => createZitadelAuthenticator({ issuer: retiredSlugUrl, resource: 'https://bridge.example.test/mcp', ownerSubject: 'owner' }),
    /RETIRED_IDENTITY_ISSUER_REJECTED/,
  );
  assert.throws(
    () => createZitadelAuthenticator({ issuer: 'https://identity.example.test', resource: 'http://bridge.example.test/mcp', ownerSubject: 'owner' }),
    /RESOURCE_HTTPS_REQUIRED/,
  );
  assert.throws(
    () => createZitadelAuthenticator({ issuer: 'https://identity.example.test', resource: 'https://bridge.example.test/mcp' }),
    /OWNER_SUBJECT_REQUIRED/,
  );
  assert.throws(
    () => assertNoRetiredIdentityEnv({ [retiredEnvKey]: retiredHostUrl }),
    /RETIRED_IDENTITY_ENV_FORBIDDEN/,
  );
});
