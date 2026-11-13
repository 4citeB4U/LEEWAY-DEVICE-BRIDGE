/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.RELAY_INGRESS
TAG: LEEWAY.RELAY.MCP.POCKET_ID.ACCESS_POLICY.V1
WHO: LeeWay Industries / owner-authorized Runtime and Device Bridge operators
WHAT: Bind the persistent relay HTTP read surface to the existing Pocket ID verifier
WHY: Keep public MCP discovery and device metadata behind the canonical owner-scoped read grant
WHERE: operator/identity/relay-mcp-access-policy.mjs
WHEN: 2026-11-12 America/Chicago
HOW: Validate the existing public MCP resource binding, then reuse createPocketIdAuthenticator
AUTHORITY: Read-only ingress qualification only; no device command, registration, receipt or execution authority
LICENSE: MIT
*/
import { createPocketIdAuthenticator } from './pocket-id-access.mjs';
import {
  BRIDGE_READ_SCOPE,
  resolvePublicMcpResourceConfig,
} from './public-mcp-resource-config.mjs';

function tokenAudiences(env) {
  return String(env.LEEWAY_POCKET_ID_TOKEN_AUDIENCES || '')
    .split(/[\n,]/)
    .map(value => value.trim())
    .filter(Boolean);
}

export function createRelayMcpAccessPolicy({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const resource = resolvePublicMcpResourceConfig(env);
  if (!resource.configured) {
    return Object.freeze({ configured: false, reason: resource.reason });
  }

  const ownerSubject = String(env.LEEWAY_MCP_OWNER_SUB || '').trim();
  if (!ownerSubject) {
    return Object.freeze({ configured: false, reason: 'MCP_OWNER_SUBJECT_UNBOUND' });
  }

  const authenticate = createPocketIdAuthenticator({
    issuer: resource.issuer,
    resource: resource.audience,
    ownerSubject,
    permission: BRIDGE_READ_SCOPE,
    tokenAudiences: tokenAudiences(env),
    fetchImpl,
  });

  return Object.freeze({
    configured: true,
    issuer: resource.issuer,
    resource: resource.audience,
    metadataUrl: resource.metadataUrl,
    scopes: Object.freeze([BRIDGE_READ_SCOPE]),
    authenticate,
  });
}
