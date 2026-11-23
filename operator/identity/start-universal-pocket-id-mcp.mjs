/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.HOST
TAG: LEEWAY.POCKET_ID.UNIVERSAL.MCP.START.V2
WHO: LeeWay Industries
WHAT: Start discovery MCP or explicitly enrolled owner-command MCP with the canonical Bridge
WHEN: 2026-10-27
WHERE: operator/identity/start-universal-pocket-id-mcp.mjs
WHY: Make qualified execution possible without silently promoting discovery credentials or bypassing C3
HOW: Require trusted Runtime composition before command exposure; retain loopback-only binding
AUTHORITY: Host-injected canonical Runtime Fabric gates; no public listener or permission bypass
LICENSE: MIT
*/
import http from 'node:http';
import { resolve as resolvePath } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createConfiguredBridge, createHostInjectedConfiguredBridge } from '../../apps/desktop/mcp-server.mjs';
import { requireTrustedRuntimeComposition } from '../../apps/desktop/runtime-composition.mjs';
import { createPocketIdUniversalHandler } from './create-pocket-id-universal-handler.mjs';

export async function startUniversalPocketIdMcp({
  configPath, issuer, resource, ownerSubject,
  port = 4272, host = '127.0.0.1', fetchImpl,
  enableExecution = false, runtimeInput = null
} = {}) {
  if (host !== '127.0.0.1' && host !== '::1') throw Error('PUBLIC_HTTP_BIND_DENIED');
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('MCP_PORT_INVALID');
  if (typeof enableExecution !== 'boolean') throw Error('INVALID_MCP_EXECUTION_MODE');
  if (enableExecution && runtimeInput === null) throw Error('TRUSTED_RUNTIME_COMPOSITION_REQUIRED');
  // Never construct execution authority from request input or a device manifest.
  // The trusted host must inject the existing Runtime Fabric admission and receipt providers.
  const trusted = runtimeInput === null ? null : requireTrustedRuntimeComposition(runtimeInput);
  if (enableExecution && (!trusted?.complianceCardGate || !trusted?.complianceCardProvider)) {
    throw Error('TRUSTED_COMPLIANCE_CARD_COMPOSITION_REQUIRED');
  }
  // Execution startup uses the bounded host-injected C3 seam. Discovery-only
  // startup keeps the existing read-only path and cannot expose command tools.
  const bridge = enableExecution
    ? await createHostInjectedConfiguredBridge(configPath, runtimeInput)
    : await createConfiguredBridge(configPath, trusted);
  const handler = createPocketIdUniversalHandler({
    issuer, resource, ownerSubject, fetchImpl,
    executionEnabled: enableExecution,
    resolveBridge: async principal => principal?.subject === ownerSubject ? bridge : null,
    resolveComplianceCardProvider: async principal => principal?.subject === ownerSubject
      ? trusted?.complianceCardProvider ?? null
      : null,
    allowedHosts: [host + ':' + port],
    allowedOrigins: []
  });
  const server = http.createServer(handler);
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, host, resolve);
    });
  } catch (e) {
    server.close();
    throw e;
  }
  return server;
}


/**
 * Recover the existing native discovery MCP without reviving legacy bootstrap
 * authority. Values come from the already configured Zitadel/Runtime bindings.
 * The CLI cannot enable execution, inject a trusted registry, or manufacture
 * Formula, Veritas or receipt decisions.
 */
export function resolveNativeDiscoveryStartup(env = process.env) {
  const configPath = String(env.LEEWAY_DEVICE_BRIDGE_CONFIG || '').trim();
  const issuer = String(env.LEEWAY_MCP_AUTH_ISSUER || '').trim();
  const resource = String(env.LEEWAY_MCP_AUDIENCE || '').trim();
  const ownerSubject = String(env.LEEWAY_MCP_OWNER_SUB || '').trim();
  const portValue = String(env.LEEWAY_MCP_LOCAL_PORT ?? '4272').trim();

  if (!configPath) throw Error('NATIVE_BRIDGE_CONFIG_REQUIRED');
  if (!issuer || !resource || !ownerSubject) throw Error('NATIVE_BRIDGE_ZITADEL_BINDINGS_REQUIRED');
  if (!/^[0-9]{4,5}$/.test(portValue) || Number(portValue) < 1024 ||
      Number(portValue) > 65535) throw Error('NATIVE_BRIDGE_PORT_INVALID');
  if (ownerSubject.length > 128 || !/^[A-Za-z0-9._:-]{8,128}$/.test(ownerSubject)) {
    throw Error('NATIVE_BRIDGE_OWNER_SUBJECT_INVALID');
  }
  let issuerUrl, resourceUrl;
  try {
    issuerUrl = new URL(issuer);
    resourceUrl = new URL(resource);
  } catch { throw Error('NATIVE_BRIDGE_OIDC_URL_INVALID'); }
  for (const url of [issuerUrl, resourceUrl]) {
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password ||
        url.search || url.hash) throw Error('NATIVE_BRIDGE_OIDC_URL_INVALID');
  }
  if (resourceUrl.pathname !== '/mcp') throw Error('NATIVE_BRIDGE_OIDC_RESOURCE_INVALID');

  return Object.freeze({
    configPath, issuer, resource, ownerSubject,
    port: Number(portValue), host: '127.0.0.1',
    enableExecution: false, runtimeInput: null,
  });
}

// Direct invocation is a discovery-only recovery entrypoint, never an
// execution-mode fallback. Owner-command mode remains host-injected C3 only.
if (process.argv[1] && import.meta.url === pathToFileURL(resolvePath(process.argv[1])).href) {
  (async () => {
    const opts = resolveNativeDiscoveryStartup();
    await startUniversalPocketIdMcp(opts);
    console.error('LEEWAY_NATIVE_DISCOVERY_LOOPBACK_READY port=' + opts.port);
  })().catch(error => {
    const code = /^[A-Z0-9_]+$/.test(error?.message || '') ? error.message : 'NATIVE_MCP_STARTUP_DENIED';
    console.error(code);
    process.exitCode = 1;
  });
}
