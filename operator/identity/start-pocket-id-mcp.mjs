/*
LEEWAY HEADER - DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.HOST
TAG: LEEWAY.POCKET_ID.MCP.HOST.V1
WHO: LeeWay Industries / owner-authorized operators
WHAT: Start one authenticated read-only MCP HTTP service with the canonical configured Bridge
WHY: One existing Bridge and provider boundary, without fabricated device state
WHERE: operator/identity/start-pocket-id-mcp.mjs
WHEN: 2026-10-26
HOW: Existing config + fail-closed admission + strict Pocket ID JWT + local HTTP
AUTHORITY: No command execution; no public listener; HTTPS termination must be separately qualified
LICENSE: MIT
*/
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHostInjectedConfiguredBridge } from '../../apps/desktop/mcp-server.mjs';
import { requireHostInjectedC3Composition } from '../../apps/desktop/runtime-composition.mjs';
import { createPocketIdMcpServer } from './create-pocket-id-mcp-server.mjs';

function registryRecord(deviceRegistry, deviceId) {
  if (deviceRegistry instanceof Map) return deviceRegistry.get(deviceId) ?? null;
  if (Array.isArray(deviceRegistry)) {
    return deviceRegistry.find(record => (record?.id ?? record?.deviceId) === deviceId) ?? null;
  }
  return null;
}

/**
 * Accept only an existing owner-controlled Runtime composition.
 *
 * The trusted host must derive pc-primary through the canonical Windows
 * passport verifier before injection. This launcher never manufactures an
 * owner subject, identity decision, Formula/Veritas result or receipt sink.
 */
export function buildHostInjectedC3Composition({ ownerSubject, runtimeInput } = {}) {
  if (typeof ownerSubject !== 'string' || !ownerSubject.trim() ||
      ownerSubject !== ownerSubject.trim() || ownerSubject.length > 256) {
    throw new Error('OWNER_SUBJECT_REQUIRED');
  }
  const trusted = requireHostInjectedC3Composition(runtimeInput);
  const record = registryRecord(trusted.deviceRegistry, 'pc-primary');
  if (!record || record.platform !== 'windows' || record.identityVerified !== true ||
      record.registrationState !== 'TRUSTED_REGISTRY_READ' ||
      record.identitySource !== 'WINDOWS_CIM_READONLY' ||
      record.passportAuthority !== 'OWNER_SIGNED_WINDOWS_PASSPORT' ||
      record.registrationAuthority !== 'TRUSTED_RUNTIME_DEVICE_REGISTRY' ||
      record.ownerSubject !== ownerSubject ||
      !/^[a-f0-9]{64}$/i.test(record.passportSha256 || '')) {
    throw new Error('TRUSTED_RUNTIME_WINDOWS_PASSPORT_REQUIRED');
  }
  return trusted;
}

export async function startPocketIdMcp({ configPath, issuer, resource, ownerSubject, tokenAudiences = [], port = 4271, runtimeInput = null } = {}) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('LOCAL_PORT_INVALID');
  const trusted = buildHostInjectedC3Composition({ ownerSubject, runtimeInput });
  const bridge = await createHostInjectedConfiguredBridge(configPath, trusted);
  const server = createPocketIdMcpServer({ bridge, issuer, resource, ownerSubject, tokenAudiences });
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
    await startPocketIdMcp({
      configPath: process.env.LEEWAY_DEVICE_BRIDGE_CONFIG,
      issuer: process.env.LEEWAY_POCKET_ID_ISSUER,
      resource: process.env.LEEWAY_MCP_RESOURCE,
      ownerSubject: process.env.LEEWAY_POCKET_ID_OWNER_SUB,
      tokenAudiences: String(process.env.LEEWAY_POCKET_ID_TOKEN_AUDIENCES || '').split(/[\n,]/).map(value => value.trim()).filter(Boolean),
      port: Number(process.env.LEEWAY_MCP_LOCAL_PORT || 4271),
      runtimeInput: null,
    });
    console.error('LeeWay authenticated C3 read-only MCP listening on loopback');
  })().catch(() => {
    console.error('MCP host denied startup: missing or unqualified configuration');
    process.exitCode = 1;
  });
}
