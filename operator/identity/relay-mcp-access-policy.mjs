/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.RELAY_INGRESS
TAG: LEEWAY.RELAY.MCP.ZITADEL.ACCESS_POLICY.V2
WHO: LeeWay Industries / owner-authorized Runtime and Device Bridge operators
WHAT: Bind the persistent relay HTTP read surface to the canonical ZITADEL OIDC verifier
WHY: Keep public MCP discovery and device metadata behind the single ZITADEL owner-scoped read grant
WHERE: operator/identity/relay-mcp-access-policy.mjs
WHEN: 2026-11-12 America/Chicago
HOW: Validate public MCP resource and workstation env reconciliation, then invoke createZitadelAuthenticator
AUTHORITY: Read-only ingress qualification only; no device command, registration, receipt or execution authority
LICENSE: MIT
*/
import { createZitadelAuthenticator } from './zitadel-access.mjs';
import {
  BRIDGE_READ_SCOPE,
  resolvePublicMcpResourceConfig,
} from './public-mcp-resource-config.mjs';

function tokenAudiences(env, projectId) {
  return [...new Set(
    [env.LEEWAY_MCP_TOKEN_AUDIENCES, projectId]
      .map(value => String(value || ''))
      .join(',')
      .split(/[\n,]/)
      .map(value => value.trim())
      .filter(Boolean),
  )];
}

export function createRelayMcpAccessPolicy({
  env = process.env,
  fetchImpl = globalThis.fetch,
  revokedJtis = [],
  isTokenRevoked = null,
} = {}) {
  const resource = resolvePublicMcpResourceConfig(env);
  if (!resource.configured) {
    return Object.freeze({ configured: false, reason: resource.reason });
  }

  const canonicalOwner = String(env.LEEWAY_MCP_OWNER_SUB || '').trim();
  const oidcOwner = String(env.LEEWAY_OIDC_OWNER_SUB || '').trim();
  if (canonicalOwner && oidcOwner && canonicalOwner !== oidcOwner) {
    return Object.freeze({ configured: false, reason: 'MCP_OWNER_SUBJECT_CONFLICT' });
  }

  const ownerSubject = canonicalOwner || oidcOwner;
  if (!ownerSubject) {
    return Object.freeze({ configured: false, reason: 'MCP_OWNER_SUBJECT_UNBOUND' });
  }

  const roleClaim = String(env.LEEWAY_MCP_ROLE_CLAIM || '').trim();
  const authenticate = createZitadelAuthenticator({
    issuer: resource.issuer,
    resource: resource.audience,
    ownerSubject,
    permission: BRIDGE_READ_SCOPE,
    tokenAudiences: tokenAudiences(env, resource.projectId || ''),
    projectId: resource.projectId || '',
    roleClaim,
    revokedJtis,
    isTokenRevoked,
    fetchImpl,
  });

  return Object.freeze({
    configured: true,
    provider: 'ZITADEL',
    issuer: resource.issuer,
    resource: resource.audience,
    metadataUrl: resource.metadataUrl,
    ...(resource.projectId ? { projectId: resource.projectId } : {}),
    scopes: Object.freeze([BRIDGE_READ_SCOPE]),
    authenticate,
  });
}
