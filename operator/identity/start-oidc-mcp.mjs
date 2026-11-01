/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.HOST
TAG: LEEWAY.OIDC.MCP.HOST.V1
WHAT: Start one authenticated read-only MCP HTTP service with the canonical configured Bridge.
HOW: Existing config + fail-closed admission + strict OIDC JWT + loopback HTTP.
AUTHORITY: No command execution; no public listener; HTTPS termination must be separately qualified.
*/
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createConfiguredBridge } from '../../apps/desktop/mcp-server.mjs';
import { createOidcMcpServer } from './create-oidc-mcp-server.mjs';

export async function startOidcMcp({ configPath, issuer, resource, ownerSubject, projectId = '', roleKey = 'device.discovery.read', roleClaim = '', port = 4271 } = {}) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('LOCAL_PORT_INVALID');
  const bridge = await createConfiguredBridge(configPath);
  const server = createOidcMcpServer({ bridge, issuer, resource, ownerSubject, projectId, roleKey, roleClaim });
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
  startOidcMcp({
    configPath: process.env.LEEWAY_DEVICE_BRIDGE_CONFIG,
    issuer: process.env.LEEWAY_OIDC_ISSUER,
    resource: process.env.LEEWAY_MCP_RESOURCE,
    ownerSubject: process.env.LEEWAY_OIDC_OWNER_SUB,
    projectId: process.env.LEEWAY_MCP_PROJECT_ID,
    roleKey: process.env.LEEWAY_MCP_DISCOVERY_ROLE || 'device.discovery.read',
    roleClaim: process.env.LEEWAY_MCP_ROLE_CLAIM,
    port: Number(process.env.LEEWAY_MCP_LOCAL_PORT || 4271),
  }).then(() => {
    console.error('LeeWay authenticated read-only OIDC MCP listening on loopback');
  }).catch(() => {
    console.error('MCP host denied startup: missing or unqualified OIDC configuration');
    process.exitCode = 1;
  });
}
