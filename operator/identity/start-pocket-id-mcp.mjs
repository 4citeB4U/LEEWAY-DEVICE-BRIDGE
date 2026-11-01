/* Legacy module path retained for rollback compatibility. Active startup is provider-neutral OIDC. */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { startOidcMcp } from './start-oidc-mcp.mjs';

export const startPocketIdMcp = startOidcMcp;

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  startOidcMcp({
    configPath: process.env.LEEWAY_DEVICE_BRIDGE_CONFIG,
    issuer: process.env.LEEWAY_OIDC_ISSUER || process.env.LEEWAY_POCKET_ID_ISSUER,
    resource: process.env.LEEWAY_MCP_RESOURCE,
    ownerSubject: process.env.LEEWAY_OIDC_OWNER_SUB || process.env.LEEWAY_POCKET_ID_OWNER_SUB,
    port: Number(process.env.LEEWAY_MCP_LOCAL_PORT || 4271),
  }).then(() => {
    console.error('LeeWay authenticated read-only OIDC MCP listening on loopback');
  }).catch(() => {
    console.error('MCP host denied startup: missing or unqualified OIDC configuration');
    process.exitCode = 1;
  });
}
