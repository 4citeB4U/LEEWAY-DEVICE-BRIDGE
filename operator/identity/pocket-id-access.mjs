/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY
TAG: LEEWAY.POCKET_ID.RESOURCE.JWT.V1
WHO: LeeWay Industries / owner-authorized runtimes
WHAT: Strict Pocket ID user-delegated API JWT verifier for read-only MCP
WHY: Bind the caller to signed issuer, resource, owner and permission
WHERE: operator/identity/pocket-id-access.mjs
WHEN: 2026-10-26
HOW: Verified OIDC metadata + issuer JWKS + RS256 crypto + strict claim gates
AUTHORITY: No device command approval; this only qualifies read-only MCP discovery.
LICENSE: MIT
*/
import { createPublicKey, verify as verifySignature } from 'node:crypto';

function requireHttps(input, field) {
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search) throw Error(field + '_HTTPS_REQUIRED');
  return url.href.replace(/\/$/, '');
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
/**
 * No fallback to session cookies, ID tokens, unsigned tokens, or unqualified scopes.
 * Caller must supply resource + approved owner sub from actual enrollment.
 */
export function createPocketIdAuthenticator({ issuer, resource, ownerSubject, permission = 'device.bridge.read', fetchImpl = fetch, now = () => Date.now() } = {}) {
  const expectedIssuer = requireHttps(issuer, 'ISSUER');
  const expectedResource = requireHttps(resource, 'RESOURCE');
  if (!ownerSubject || typeof ownerSubject !== 'string' || ownerSubject.length > 256) throw Error('OWNER_SUBJECT_REQUIRED');
  if (!/^[a-z][a-z0-9._:-]{2,127}$/.test(permission)) throw Error('PERMISSION_REQUIRED');
  const discoveryUrl = expectedIssuer + '/.well-known/openid-configuration';
  let keyCache = { until: 0, keys: [] };
  return async function authenticate(req) {
    const token = bearer(req);
    if (!token || token.length > 16384) return false;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const protectedHeader = parsePart(parts[0]);
      const claims = parsePart(parts[1]);
      if (protectedHeader.alg !== 'RS256' || !protectedHeader.kid || protectedHeader.typ === 'JWT+UNSIGNED') return false;
      if (claims.iss !== expectedIssuer || claims.sub !== ownerSubject) return false;
      if (!(Array.isArray(claims.aud) ? claims.aud.includes(expectedResource) : claims.aud === expectedResource)) return false;
      const seconds = Math.floor(now() / 1000);
      if (!Number.isSafeInteger(claims.exp) || claims.exp <= seconds || !Number.isSafeInteger(claims.iat) || claims.iat > seconds + 30) return false;
      if (claims.nbf !== undefined && (!Number.isSafeInteger(claims.nbf) || claims.nbf > seconds + 30)) return false;
      if (!String(claims.scope || '').split(/\s+/).includes(permission)) return false;
      if (keyCache.until <= now()) {
        const discoveryResponse = await fetchImpl(discoveryUrl, { signal: AbortSignal.timeout(5000), redirect: 'error' });
        if (!discoveryResponse.ok) return false;
        const doc = await discoveryResponse.json();
        if (doc.issuer !== expectedIssuer) return false;
        const jwksUrl = new URL(doc.jwks_uri);
        if (jwksUrl.protocol !== 'https:' || jwksUrl.origin !== new URL(expectedIssuer).origin || jwksUrl.username || jwksUrl.password) return false;
        const keysResponse = await fetchImpl(jwksUrl, { signal: AbortSignal.timeout(5000), redirect: 'error' });
        if (!keysResponse.ok) return false;
        const document = await keysResponse.json();
        if (!Array.isArray(document.keys) || document.keys.length > 32) return false;
        keyCache = { until: now() + 5 * 60 * 1000, keys: document.keys };
      }
      const matched = keyCache.keys.filter(k => k.kid === protectedHeader.kid && k.kty === 'RSA' && (!k.alg || k.alg === 'RS256') && (!k.use || k.use === 'sig'));
      if (matched.length !== 1) return false;
      const key = createPublicKey({ key: matched[0], format: 'jwk' });
      return verifySignature('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), key, Buffer.from(parts[2], 'base64url'));
    } catch {
      return false;
    }
  };
}
