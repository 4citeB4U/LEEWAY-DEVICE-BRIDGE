/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY
TAG: LEEWAY.ZITADEL.RESOURCE.JWT.V2
WHO: LeeWay Industries / owner-authorized runtimes
WHAT: Strict ZITADEL OIDC user-delegated API JWT verifier for read-only and governed MCP
WHY: Enforce single ZITADEL identity authority across issuer, resource, owner, permission, and revocation
WHERE: operator/identity/zitadel-access.mjs
WHEN: 2026-11-12
HOW: Verified OIDC discovery + issuer JWKS + RS256/ES256 crypto + strict typ/claim/revocation gates
AUTHORITY: No device command approval; read/execute scope checks remain subject to Runtime/C3 gates.
LICENSE: MIT
*/
import { createPublicKey, verify as verifySignature } from 'node:crypto';

const RETIRED_ENV_PREFIX = `${['LEEWAY', 'POCKET', 'ID'].join('_')}_`;
const RETIRED_HOST = ['auth', 'leeway', 'industries'].join('.');
const RETIRED_PORT = String(1400 + 11);
const RETIRED_SLUG = ['pocket', 'id'].join('-');
const ALLOWED_ACCESS_TOKEN_TYPS = new Set(['at+jwt', 'application/at+jwt', 'access-token', 'jwt']);
const ALLOWED_ALGS = new Set(['RS256', 'ES256']);

export function assertNoRetiredIdentityEnv(env = process.env) {
  for (const [key, value] of Object.entries(env || {})) {
    if (key.startsWith(RETIRED_ENV_PREFIX) && String(value || '').trim() !== '') {
      throw Error('RETIRED_IDENTITY_ENV_FORBIDDEN');
    }
  }
}

export function isRetiredIssuerUrl(issuer) {
  const value = String(issuer || '').trim();
  if (!value) return false;
  const lower = value.toLowerCase();
  let parsed = null;
  try {
    parsed = new URL(value);
  } catch {
    parsed = null;
  }
  return (
    lower.includes(RETIRED_HOST) ||
    lower.includes(RETIRED_SLUG) ||
    parsed?.port === RETIRED_PORT
  );
}

export function assertNotRetiredIssuer(issuer) {
  if (isRetiredIssuerUrl(issuer)) {
    throw Error('RETIRED_IDENTITY_ISSUER_REJECTED');
  }
}

function requireHttps(input, field) {
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search) {
    throw Error(field + '_HTTPS_REQUIRED');
  }
  if (field === 'ISSUER') assertNotRetiredIssuer(url.href);
  return url.href.replace(/\/$/, '');
}

function normalizeTokenAudiences(values) {
  const candidates = Array.isArray(values)
    ? values
    : String(values || '').split(/[\n,]/);
  return new Set(
    candidates
      .map(value => String(value || '').trim())
      .filter(value => /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/.test(value)),
  );
}

function parsePart(part) {
  if (!/^[A-Za-z0-9_-]+$/.test(part) || part.length > 8192) throw Error('MALFORMED_JWT');
  const bytes = Buffer.from(part, 'base64url');
  if (bytes.toString('base64url') !== part) throw Error('MALFORMED_JWT');
  return JSON.parse(bytes.toString('utf8'));
}

function bearer(req) {
  const header = req?.headers?.authorization;
  if (typeof header !== 'string' || !/^Bearer [A-Za-z0-9_\-.]+$/.test(header)) return null;
  return header.slice(7);
}

function permissionAliases(permission) {
  if (permission === 'device.bridge.read' || permission === 'device.discovery.read') {
    return new Set(['device.bridge.read', 'device.discovery.read']);
  }
  return new Set([permission]);
}

function roleNames(value) {
  if (typeof value === 'string') return value.split(/\s+/).filter(Boolean);
  if (Array.isArray(value)) return value.flatMap(roleNames);
  if (value && typeof value === 'object') return Object.keys(value);
  return [];
}

function hasPermission(claims, permission, { projectId = '', roleClaim = '' } = {}) {
  const accepted = permissionAliases(permission);
  const scopeValue = typeof claims.scope === 'string'
    ? claims.scope
    : typeof claims.scp === 'string'
      ? claims.scp
      : '';
  if (scopeValue.split(/\s+/).some(scope => accepted.has(scope))) return true;

  const projectClaim = projectId ? `urn:zitadel:iam:org:project:${projectId}:roles` : '';
  for (const [claimName, claimValue] of Object.entries(claims || {})) {
    const isStandardZitadelRole = claimName === 'urn:zitadel:iam:org:project:roles'
      || /^urn:zitadel:iam:org:project:[^:]+:roles$/.test(claimName);
    const isExplicitRoleClaim = (roleClaim && claimName === roleClaim) || (projectClaim && claimName === projectClaim);
    if (!isStandardZitadelRole && !isExplicitRoleClaim) continue;
    if (roleNames(claimValue).some(role => accepted.has(role))) return true;
  }
  return false;
}

export function isAcceptedAccessTokenHeader(protectedHeader) {
  if (!protectedHeader || typeof protectedHeader !== 'object') return false;
  if (!ALLOWED_ALGS.has(protectedHeader.alg) || typeof protectedHeader.kid !== 'string' || !protectedHeader.kid) {
    return false;
  }
  if (protectedHeader.typ !== undefined) {
    if (typeof protectedHeader.typ !== 'string') return false;
    if (!ALLOWED_ACCESS_TOKEN_TYPS.has(protectedHeader.typ.trim().toLowerCase())) {
      return false;
    }
  }
  return true;
}

function isAcceptedTokenTypeClaim(claims) {
  const tokenType = claims?.type ?? claims?.token_type;
  if (tokenType === undefined || tokenType === null || tokenType === '') return true;
  if (typeof tokenType !== 'string') return false;
  const normalized = tokenType.trim().toLowerCase();
  return normalized === 'access-token'
    || normalized === 'access_token'
    || normalized === 'bearer'
    || normalized === 'access token';
}

function matchingJwkKeys(keys, header) {
  if (header.alg === 'RS256') {
    return keys.filter(
      k => k.kid === header.kid && k.kty === 'RSA' && (!k.alg || k.alg === 'RS256') && (!k.use || k.use === 'sig'),
    );
  }
  if (header.alg === 'ES256') {
    return keys.filter(
      k => k.kid === header.kid && k.kty === 'EC' && (!k.crv || k.crv === 'P-256') && (!k.alg || k.alg === 'ES256') && (!k.use || k.use === 'sig'),
    );
  }
  return [];
}

function verifyJwsSignature(alg, signingInput, jwk, signatureBytes) {
  const key = createPublicKey({ key: jwk, format: 'jwk' });
  if (alg === 'RS256') {
    return verifySignature('RSA-SHA256', signingInput, key, signatureBytes);
  }
  if (alg === 'ES256') {
    return verifySignature('sha256', signingInput, { key, dsaEncoding: 'ieee-p1363' }, signatureBytes);
  }
  return false;
}

/**
 * Strict ZITADEL OIDC verifier.
 * No fallback to session cookies, ID tokens, unsigned tokens, retired Pocket ID, or unqualified scopes.
 */
export function createZitadelAuthenticator({
  issuer,
  resource,
  ownerSubject,
  permission = 'device.bridge.read',
  tokenAudiences = [],
  projectId = '',
  roleClaim = '',
  revokedJtis = [],
  isTokenRevoked = null,
  fetchImpl = fetch,
  now = () => Date.now(),
} = {}) {
  const expectedIssuer = requireHttps(issuer, 'ISSUER');
  const expectedResource = requireHttps(resource, 'RESOURCE');
  const acceptedAudiences = new Set([expectedResource, ...normalizeTokenAudiences(tokenAudiences)]);
  if (!ownerSubject || typeof ownerSubject !== 'string' || ownerSubject.length > 256) {
    throw Error('OWNER_SUBJECT_REQUIRED');
  }
  if (!/^[a-z][a-z0-9._:-]{2,127}$/.test(permission)) {
    throw Error('PERMISSION_REQUIRED');
  }
  const revokedJtiSet = new Set(Array.isArray(revokedJtis) ? revokedJtis : [...revokedJtis]);
  const discoveryUrl = expectedIssuer + '/.well-known/openid-configuration';
  let keyCache = { until: 0, keys: [] };

  async function refreshJwks() {
    const discoveryResponse = await fetchImpl(discoveryUrl, { signal: AbortSignal.timeout(5000), redirect: 'error' });
    if (!discoveryResponse.ok) throw Error('OIDC_DISCOVERY_UNAVAILABLE');
    const doc = await discoveryResponse.json();
    if (doc.issuer !== expectedIssuer) throw Error('OIDC_ISSUER_MISMATCH');
    assertNotRetiredIssuer(doc.issuer);
    const jwksUrl = new URL(doc.jwks_uri);
    if (jwksUrl.protocol !== 'https:' || jwksUrl.origin !== new URL(expectedIssuer).origin || jwksUrl.username || jwksUrl.password) {
      throw Error('OIDC_JWKS_URL_INVALID');
    }
    const keysResponse = await fetchImpl(jwksUrl, { signal: AbortSignal.timeout(5000), redirect: 'error' });
    if (!keysResponse.ok) throw Error('OIDC_JWKS_UNAVAILABLE');
    const document = await keysResponse.json();
    if (!Array.isArray(document.keys) || document.keys.length > 32) throw Error('OIDC_JWKS_INVALID');
    keyCache = { until: now() + 5 * 60 * 1000, keys: document.keys };
  }

  return async function authenticate(req) {
    const token = bearer(req);
    if (!token || token.length > 16384) return false;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const protectedHeader = parsePart(parts[0]);
      const claims = parsePart(parts[1]);
      if (!isAcceptedAccessTokenHeader(protectedHeader)) return false;
      if (!isAcceptedTokenTypeClaim(claims)) return false;
      if (claims.iss !== expectedIssuer || claims.sub !== ownerSubject) return false;
      const audiences = Array.isArray(claims.aud)
        ? claims.aud
        : typeof claims.aud === 'string'
          ? [claims.aud]
          : [];
      if (!audiences.some(audience => acceptedAudiences.has(audience))) return false;

      const seconds = Math.floor(now() / 1000);
      if (!Number.isSafeInteger(claims.exp) || claims.exp <= seconds || !Number.isSafeInteger(claims.iat) || claims.iat > seconds + 30) {
        return false;
      }
      if (claims.nbf !== undefined && (!Number.isSafeInteger(claims.nbf) || claims.nbf > seconds + 30)) {
        return false;
      }
      if (typeof claims.jti === 'string' && revokedJtiSet.has(claims.jti)) return false;
      if (typeof isTokenRevoked === 'function' && (await isTokenRevoked(claims, protectedHeader)) === true) {
        return false;
      }
      if (!hasPermission(claims, permission, { projectId, roleClaim })) return false;

      if (keyCache.until <= now()) {
        await refreshJwks();
      }
      let matched = matchingJwkKeys(keyCache.keys, protectedHeader);
      if (matched.length === 0) {
        await refreshJwks();
        matched = matchingJwkKeys(keyCache.keys, protectedHeader);
      }
      if (matched.length !== 1) return false;

      return verifyJwsSignature(
        protectedHeader.alg,
        Buffer.from(parts[0] + '.' + parts[1]),
        matched[0],
        Buffer.from(parts[2], 'base64url'),
      );
    } catch {
      return false;
    }
  };
}
