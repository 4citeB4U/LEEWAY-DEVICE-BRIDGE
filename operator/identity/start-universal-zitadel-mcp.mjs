/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.HOST
TAG: LEEWAY.ZITADEL.UNIVERSAL.MCP.START.V3
WHO: LeeWay Industries
WHAT: Start ZITADEL discovery MCP or explicitly enrolled owner-command MCP with the canonical Bridge
WHEN: 2026-11-12
WHERE: operator/identity/start-universal-zitadel-mcp.mjs
WHY: Make qualified execution possible without silently promoting discovery credentials or bypassing C3
HOW: Require trusted Runtime composition before command exposure; retain loopback-only binding
AUTHORITY: Host-injected canonical Runtime Fabric gates; no public listener or permission bypass
LICENSE: MIT
*/
import http from 'node:http';
import { createConfiguredBridge, createHostInjectedConfiguredBridge } from '../../apps/desktop/mcp-server.mjs';
import { requireTrustedRuntimeComposition } from '../../apps/desktop/runtime-composition.mjs';
import { createZitadelUniversalHandler } from './create-zitadel-universal-handler.mjs';

export async function startUniversalZitadelMcp({
  configPath,
  issuer,
  resource,
  ownerSubject,
  tokenAudiences = [],
  projectId = '',
  roleClaim = '',
  revokedJtis = [],
  isTokenRevoked = null,
  port = 4272,
  host = '127.0.0.1',
  fetchImpl,
  enableExecution = false,
  runtimeInput = null,
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
  const bridge = enableExecution
    ? await createHostInjectedConfiguredBridge(configPath, runtimeInput)
    : await createConfiguredBridge(configPath, trusted);
  const handler = createZitadelUniversalHandler({
    issuer,
    resource,
    ownerSubject,
    tokenAudiences,
    projectId,
    roleClaim,
    revokedJtis,
    isTokenRevoked,
    fetchImpl,
    executionEnabled: enableExecution,
    resolveBridge: async principal => (principal?.subject === ownerSubject ? bridge : null),
    resolveComplianceCardProvider: async principal =>
      principal?.subject === ownerSubject ? trusted?.complianceCardProvider ?? null : null,
    allowedHosts: [host + ':' + port],
    allowedOrigins: [],
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
