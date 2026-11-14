/*
LEEWAY HEADER - DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.HOST
TAG: LEEWAY.ZITADEL.MCP.HOST.V2
WHO: LeeWay Industries / owner-authorized operators
WHAT: Start one authenticated read-only MCP HTTP service with the canonical configured Bridge
WHY: One existing Bridge and provider boundary under ZITADEL authority, without fabricated device state
WHERE: operator/identity/start-zitadel-mcp.mjs
WHEN: 2026-11-12
HOW: Existing config + fail-closed admission + strict ZITADEL JWT + local HTTP
AUTHORITY: No command execution; no public listener; HTTPS termination must be separately qualified
LICENSE: MIT
*/
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHostInjectedConfiguredBridge } from '../../apps/desktop/mcp-server.mjs';
import { requireHostInjectedC3Composition } from '../../apps/desktop/runtime-composition.mjs';
import { createZitadelMcpServer } from './create-zitadel-mcp-server.mjs';
import { assertNoRetiredIdentityEnv } from './zitadel-access.mjs';
import { resolvePublicMcpResourceConfig } from './public-mcp-resource-config.mjs';

/**
 * Accept only an existing owner-controlled Runtime composition.
 *
 * The trusted host must derive one selected Windows host device through the
 * canonical passport verifier before injection. This launcher never
 * manufactures an owner subject, identity decision, Formula/Veritas result
 * or receipt sink.
 */
export function buildHostInjectedC3Composition({ ownerSubject, runtimeInput, hostDeviceId = null } = {}) {
  if (typeof ownerSubject !== 'string' || !ownerSubject.trim()
      || ownerSubject !== ownerSubject.trim() || ownerSubject.length > 256) {
    throw new Error('OWNER_SUBJECT_REQUIRED');
  }
  const trusted = requireHostInjectedC3Composition(runtimeInput);
  const records = trusted.deviceRegistry instanceof Map
    ? [...trusted.deviceRegistry.entries()]
    : Array.isArray(trusted.deviceRegistry)
      ? trusted.deviceRegistry.map(record => [record?.id ?? record?.deviceId, record])
      : [];
  const requestedId = typeof hostDeviceId === 'string' ? hostDeviceId.trim() : '';
  if (hostDeviceId !== null && !requestedId) throw new Error('HOST_DEVICE_ID_INVALID');
  const candidates = records.filter(([id, record]) =>
    record?.platform === 'windows' && (!requestedId || id === requestedId));
  if (candidates.length !== 1) throw new Error('TRUSTED_RUNTIME_WINDOWS_PASSPORT_REQUIRED');
  const [recordId, record] = candidates[0];
  if ((record.id !== recordId && record.deviceId !== recordId)
      || record.identityVerified !== true
      || record.registrationState !== 'TRUSTED_REGISTRY_READ'
      || record.identitySource !== 'WINDOWS_CIM_READONLY'
      || record.passportAuthority !== 'OWNER_SIGNED_WINDOWS_PASSPORT'
      || record.registrationAuthority !== 'TRUSTED_RUNTIME_DEVICE_REGISTRY'
      || record.ownerSubject !== ownerSubject
      || !/^[a-f0-9]{64}$/i.test(record.passportSha256 || '')) {
    throw new Error('TRUSTED_RUNTIME_WINDOWS_PASSPORT_REQUIRED');
  }
  return trusted;
}

export async function startZitadelMcp({
  configPath,
  issuer,
  resource,
  ownerSubject,
  tokenAudiences = [],
  projectId = '',
  roleClaim = '',
  revokedJtis = [],
  isTokenRevoked = null,
  port = 4271,
  runtimeInput = null,
  hostDeviceId = null,
} = {}) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('LOCAL_PORT_INVALID');
  const trusted = buildHostInjectedC3Composition({ ownerSubject, runtimeInput, hostDeviceId });
  const bridge = await createHostInjectedConfiguredBridge(configPath, trusted);
  const server = createZitadelMcpServer({
    bridge,
    issuer,
    resource,
    ownerSubject,
    tokenAudiences,
    projectId,
    roleClaim,
    revokedJtis,
    isTokenRevoked,
  });
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', resolve);
    });
  } catch (error) {
    server.close();
    throw error;
  }
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  (async () => {
    assertNoRetiredIdentityEnv(process.env);
    const resourceConfig = resolvePublicMcpResourceConfig(process.env);
    if (!resourceConfig.configured) throw new Error(resourceConfig.reason);

    const canonicalOwner = String(process.env.LEEWAY_MCP_OWNER_SUB || '').trim();
    const oidcOwner = String(process.env.LEEWAY_OIDC_OWNER_SUB || '').trim();
    if (canonicalOwner && oidcOwner && canonicalOwner !== oidcOwner) {
      throw new Error('MCP_OWNER_SUBJECT_CONFLICT');
    }
    const ownerSubject = canonicalOwner || oidcOwner;
    const tokenAudiences = [...new Set([
      ...String(process.env.LEEWAY_MCP_TOKEN_AUDIENCES || '').split(/[\n,]/).map(v => v.trim()).filter(Boolean),
      ...(resourceConfig.projectId ? [resourceConfig.projectId] : []),
    ])];

    await startZitadelMcp({
      configPath: process.env.LEEWAY_DEVICE_BRIDGE_CONFIG,
      issuer: resourceConfig.issuer,
      resource: resourceConfig.audience,
      ownerSubject,
      tokenAudiences,
      projectId: resourceConfig.projectId || '',
      roleClaim: process.env.LEEWAY_MCP_ROLE_CLAIM || '',
      port: Number(process.env.LEEWAY_MCP_LOCAL_PORT || 4271),
      runtimeInput: null,
      hostDeviceId: process.env.LEEWAY_HOST_DEVICE_ID || null,
    });
    console.error('LeeWay authenticated ZITADEL read-only MCP listening on loopback');
  })().catch(() => {
    console.error('MCP host denied startup: missing or unqualified ZITADEL configuration');
    process.exitCode = 1;
  });
}
