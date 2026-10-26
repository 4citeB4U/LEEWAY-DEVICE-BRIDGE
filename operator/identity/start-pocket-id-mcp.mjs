/*
LEEWAY HEADER — DO NOT REMOVE
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
import { createConfiguredBridge } from '../../apps/desktop/mcp-server.mjs';
import { createPocketIdMcpServer } from './create-pocket-id-mcp-server.mjs';

export async function startPocketIdMcp({ configPath, issuer, resource, ownerSubject, port = 4271 } = {}) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('LOCAL_PORT_INVALID');
  const bridge = await createConfiguredBridge(configPath);
  const server = createPocketIdMcpServer({ bridge, issuer, resource, ownerSubject });
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
  startPocketIdMcp({
    configPath: process.env.LEEWAY_DEVICE_BRIDGE_CONFIG,
    issuer: process.env.LEEWAY_POCKET_ID_ISSUER,
    resource: process.env.LEEWAY_MCP_RESOURCE,
    ownerSubject: process.env.LEEWAY_POCKET_ID_OWNER_SUB,
    port: Number(process.env.LEEWAY_MCP_LOCAL_PORT || 4271),
  }).then(() => {
    console.error('LeeWay authenticated read-only MCP listening on loopback');
  }).catch(() => {
    console.error('MCP host denied startup: missing or unqualified configuration');
    process.exitCode = 1;
  });
}
