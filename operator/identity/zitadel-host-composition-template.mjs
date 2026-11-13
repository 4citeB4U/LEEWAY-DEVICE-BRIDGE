/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.HOST_TEMPLATE
TAG: LEEWAY.ZITADEL.HOST_COMPOSITION_TEMPLATE.V1
WHO: LeeWay Industries / owner-authorized Windows & workstation operators
WHAT: Repo-tracked ZITADEL host-composition wrapper template replacing retired Pocket ID host wrappers
WHY: Keep host wrapper behavior, env reconciliation, and SHA-256 source pinning auditable in canonical git history
HOW: Fail-closed ZITADEL OIDC config + host-injected Windows passport C3 composition; never mutates live host secrets
AUTHORITY: Template contract only; live scheduled tasks and C:\Users\* host wrappers must be separately updated and verified by owner
LICENSE: MIT
*/
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRelayMcpAccessPolicy } from './relay-mcp-access-policy.mjs';
import { resolvePublicMcpResourceConfig } from './public-mcp-resource-config.mjs';
import { assertNoRetiredIdentityEnv } from './zitadel-access.mjs';
import { buildHostInjectedC3Composition, startZitadelMcp } from './start-zitadel-mcp.mjs';

export const ZITADEL_HOST_PINNED_MODULES = Object.freeze([
  'operator/identity/zitadel-access.mjs',
  'operator/identity/public-mcp-resource-config.mjs',
  'operator/identity/relay-mcp-access-policy.mjs',
  'operator/identity/create-zitadel-mcp-server.mjs',
  'operator/identity/create-zitadel-universal-handler.mjs',
  'operator/identity/start-zitadel-mcp.mjs',
  'operator/identity/start-universal-zitadel-mcp.mjs',
  'operator/identity/zitadel-host-composition-template.mjs',
  'api/device-relay.mjs',
  'operator/persistent-relay-server.mjs',
]);

export function resolveZitadelHostEnvironment(env = process.env) {
  assertNoRetiredIdentityEnv(env);
  const resource = resolvePublicMcpResourceConfig(env);
  if (!resource.configured) {
    throw new Error(resource.reason || 'MCP_OAUTH_ENVIRONMENT_INCOMPLETE');
  }

  const canonicalOwner = String(env?.LEEWAY_MCP_OWNER_SUB || '').trim();
  const oidcOwner = String(env?.LEEWAY_OIDC_OWNER_SUB || '').trim();
  if (canonicalOwner && oidcOwner && canonicalOwner !== oidcOwner) {
    throw new Error('MCP_OWNER_SUBJECT_CONFLICT');
  }
  const ownerSubject = canonicalOwner || oidcOwner;
  if (!ownerSubject) {
    throw new Error('OWNER_SUBJECT_REQUIRED');
  }

  const tokenAudiences = [...new Set([
    ...String(env?.LEEWAY_MCP_TOKEN_AUDIENCES || '')
      .split(/[\n,]/)
      .map(value => value.trim())
      .filter(Boolean),
    ...(resource.projectId ? [resource.projectId] : []),
  ])];

  return Object.freeze({
    provider: 'ZITADEL',
    issuer: resource.issuer,
    resource: resource.audience,
    metadataUrl: resource.metadataUrl,
    ownerSubject,
    projectId: resource.projectId || '',
    roleClaim: String(env?.LEEWAY_MCP_ROLE_CLAIM || '').trim(),
    tokenAudiences: Object.freeze(tokenAudiences),
    configPath: String(env?.LEEWAY_DEVICE_BRIDGE_CONFIG || '').trim() || undefined,
    localPort: Number(env?.LEEWAY_MCP_LOCAL_PORT || 4271),
  });
}

export function composeZitadelHost({ env = process.env, runtimeInput = null, fetchImpl = globalThis.fetch } = {}) {
  const resolved = resolveZitadelHostEnvironment(env);
  const relayAccessPolicy = createRelayMcpAccessPolicy({ env, fetchImpl });
  if (!relayAccessPolicy.configured) {
    throw new Error(relayAccessPolicy.reason || 'RELAY_MCP_ACCESS_POLICY_UNBOUND');
  }
  const trustedC3 = runtimeInput
    ? buildHostInjectedC3Composition({ ownerSubject: resolved.ownerSubject, runtimeInput })
    : null;

  return Object.freeze({
    provider: 'ZITADEL',
    resolved,
    relayAccessPolicy,
    trustedC3,
    startLocalLoopbackMcp: ({ revokedJtis = [], isTokenRevoked = null } = {}) =>
      startZitadelMcp({
        configPath: resolved.configPath,
        issuer: resolved.issuer,
        resource: resolved.resource,
        ownerSubject: resolved.ownerSubject,
        tokenAudiences: resolved.tokenAudiences,
        projectId: resolved.projectId,
        roleClaim: resolved.roleClaim,
        revokedJtis,
        isTokenRevoked,
        port: resolved.localPort,
        runtimeInput,
      }),
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  try {
    const resolved = resolveZitadelHostEnvironment(process.env);
    console.log(JSON.stringify({
      status: 'ZITADEL_HOST_ENV_QUALIFIED',
      provider: resolved.provider,
      issuer: resolved.issuer,
      resource: resolved.resource,
      hasProjectId: Boolean(resolved.projectId),
      hasOwnerSubject: Boolean(resolved.ownerSubject),
      liveHostMutation: 'NOT_PERFORMED',
    }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      status: 'ZITADEL_HOST_ENV_BLOCKED',
      reason: error instanceof Error ? error.message : 'ZITADEL_HOST_ENV_INVALID',
      liveHostMutation: 'NOT_PERFORMED',
    }, null, 2));
    process.exitCode = 1;
  }
}
