/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY
TAG: LEEWAY.ZITADEL.RESOURCE.JWT.V1
WHO: LeeWay Industries / owner-authorized runtimes
WHAT: Strict Zitadel owner-delegated API JWT verifier for LeeWay MCP
WHY: Bind the caller to signed issuer, resource, owner and permission
WHERE: operator/identity/zitadel-access.mjs
WHEN: 2026-10-26
HOW: Verified OIDC metadata + issuer JWKS + RS256/ES256 crypto + strict claim gates
AUTHORITY: No device command approval; this only qualifies read-only MCP discovery.
LICENSE: MIT
*/
import { createPublicKey, verify as verifySignature } from 'node:crypto';

function requireHttps(input, field) {
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search) throw Error(field + '_HTTPS_REQUIRED');
  return url.href.replace(/\/$/, '');
}

function normalizeTokenAudiences(values) {
  const candidates = Array.isArray(values)
    ? values
    : String(values || '').split(/[\n,]/);
  return new Set(candidates.map(value => String(value || '').trim())
    .filter(value => /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/.test(value)));
}

function parsePart(part) {
  if (!/^[A-Za-z0-9_-]+$/.test(part) || part.length > 8192) throw Error('MALFORMED_JWT');
  const bytes = Buffer.from(part, 'base64url');
  if (bytes.toString('base64url') !== part) throw Error('MALFORMED_JWT');
  return JSON.parse(bytes.toString('utf8'));
}
function bearer(req) {
  const header = req.headers.authorization;
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

function hasPermission(claims, permission) {
  const accepted = permissionAliases(permission);
  const scopeValue = typeof claims.scope === 'string'
    ? claims.scope
    : typeof claims.scp === 'string'
      ? claims.scp
      : '';
  if (scopeValue.split(/\s+/).some(scope => accepted.has(scope))) return true;

  // ZITADEL may carry project roles instead of a literal OAuth scope.
  // Accept only the exact read-only LeeWay aliases; never infer authority
  // from arbitrary claims or from a broader role.
  for (const [claimName, claimValue] of Object.entries(claims || {})) {
    if (claimName !== 'urn:zitadel:iam:org:project:roles'
      && !/^urn:zitadel:iam:org:project:[^:]+:roles$/.test(claimName)) continue;
    if (roleNames(claimValue).some(role => accepted.has(role))) return true;
  }
  return false;
}

/**
 * No fallback to session cookies, ID tokens, unsigned tokens, or unqualified scopes.
 * Caller must supply resource + approved owner sub from actual enrollment.
 */
export function createZitadelAuthenticator({ issuer, resource, ownerSubject, permission = 'device.bridge.read', tokenAudiences = [], fetchImpl = fetch, now = () => Date.now(), onDeny = null } = {}) {
  const expectedIssuer = requireHttps(issuer, 'ISSUER');
  const expectedResource = requireHttps(resource, 'RESOURCE');
  const acceptedAudiences = new Set([expectedResource, ...normalizeTokenAudiences(tokenAudiences)]);
  if (!ownerSubject || typeof ownerSubject !== 'string' || ownerSubject.length > 256) throw Error('OWNER_SUBJECT_REQUIRED');
  if (!/^[a-z][a-z0-9._:-]{2,127}$/.test(permission)) throw Error('PERMISSION_REQUIRED');
  const discoveryUrl = expectedIssuer + '/.well-known/openid-configuration';
  let keyCache = { until: 0, keys: [] };
  // Opt-in operational diagnostics expose only fixed rejection categories.
  // Never log bearer tokens, JWT content, owner IDs, issuer URLs, or key bytes.
  const deny = code => {
    if (typeof onDeny === 'function') {
      try { onDeny(code); } catch { /* Denial callbacks cannot alter authorization. */ }
    }
    return false;
  };
  return async function authenticate(req) {
    const token = bearer(req);
    if (!token || token.length > 16384) return deny('MISSING_OR_OVERSIZED_BEARER');
    let stage = 'JWT_SEGMENTS';
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return deny('JWT_SEGMENTS_INVALID');
      stage = 'JWT_HEADER_DECODE';
      const protectedHeader = parsePart(parts[0]);
      stage = 'JWT_CLAIMS_DECODE';
      const claims = parsePart(parts[1]);
      stage = 'JWT_CLAIM_POLICY';
      if (!['RS256','ES256'].includes(protectedHeader.alg) || !protectedHeader.kid || protectedHeader.typ === 'JWT+UNSIGNED') return deny('JWT_HEADER_OR_ALGORITHM_INVALID');
      if (claims.iss !== expectedIssuer) return deny('JWT_ISSUER_MISMATCH');
      if (claims.sub !== ownerSubject) return deny('JWT_OWNER_MISMATCH');
      const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
      if (!audiences.some(audience => acceptedAudiences.has(audience))) return deny('JWT_AUDIENCE_MISMATCH');
      const seconds = Math.floor(now() / 1000);
      if (!Number.isSafeInteger(claims.exp) || claims.exp <= seconds || !Number.isSafeInteger(claims.iat) || claims.iat > seconds + 30) return deny('JWT_TIME_CLAIMS_INVALID');
      if (claims.nbf !== undefined && (!Number.isSafeInteger(claims.nbf) || claims.nbf > seconds + 30)) return deny('JWT_NOT_BEFORE_INVALID');
      if (!hasPermission(claims, permission)) return deny('JWT_READ_PERMISSION_MISSING');
      if (keyCache.until <= now()) {
        stage = 'OIDC_DISCOVERY_FETCH';
        const discoveryResponse = await fetchImpl(discoveryUrl, { signal: AbortSignal.timeout(5000), redirect: 'error' });
        if (!discoveryResponse.ok) return deny('OIDC_DISCOVERY_HTTP_REJECTED');
        stage = 'OIDC_DISCOVERY_JSON';
        const doc = await discoveryResponse.json();
        if (doc.issuer !== expectedIssuer) return deny('OIDC_DISCOVERY_ISSUER_MISMATCH');
        stage = 'JWKS_URL_PARSE';
        const jwksUrl = new URL(doc.jwks_uri);
        if (jwksUrl.protocol !== 'https:' || jwksUrl.origin !== new URL(expectedIssuer).origin || jwksUrl.username || jwksUrl.password) return deny('JWKS_ORIGIN_INVALID');
        stage = 'JWKS_FETCH';
        const keysResponse = await fetchImpl(jwksUrl, { signal: AbortSignal.timeout(5000), redirect: 'error' });
        if (!keysResponse.ok) return deny('JWKS_HTTP_REJECTED');
        stage = 'JWKS_JSON';
        const document = await keysResponse.json();
        if (!Array.isArray(document.keys) || document.keys.length > 32) return deny('JWKS_KEY_SET_INVALID');
        keyCache = { until: now() + 5 * 60 * 1000, keys: document.keys };
      }
      // Runtime Fabric already admits exact RS256 or ES256 Zitadel JWTs.
      // Enforce matching JWKS key type/curve and JOSE signature encoding.
      // This is authentication only; it confers no C3 device execution.
      stage = 'JWKS_MATCH';
      const matched = keyCache.keys.filter(k => k.kid === protectedHeader.kid
        && (!k.alg || k.alg === protectedHeader.alg)
        && (!k.use || k.use === 'sig')
        && (protectedHeader.alg === 'RS256'
          ? k.kty === 'RSA'
          : k.kty === 'EC' && k.crv === 'P-256'));
      if (matched.length !== 1) return deny('JWKS_MATCHING_SIGNING_KEY_MISSING');
      stage = 'PUBLIC_KEY_IMPORT';
      const key = createPublicKey({ key: matched[0], format: 'jwk' });
      const message = Buffer.from(parts[0] + '.' + parts[1]);
      const signature = Buffer.from(parts[2], 'base64url');
      stage = 'SIGNATURE_VERIFY';
      const verified = protectedHeader.alg === 'RS256'
        ? verifySignature('RSA-SHA256', message, key, signature)
        : verifySignature('sha256', message, { key, dsaEncoding: 'ieee-p1363' }, signature);
      return verified || deny('JWT_SIGNATURE_INVALID');
    } catch {
      return deny('JWT_VERIFICATION_EXCEPTION_' + stage);
    }
  };
}
