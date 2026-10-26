/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.BINDING
TAG: LEEWAY.MCP.POCKET_ID.BINDING.V1
WHO: LeeWay Industries
WHAT: Bind the existing canonical read-only MCP host to Pocket ID API JWT auth
WHY: Prevent HTTP exposure from bypassing OAuth resource validation
WHERE: operator/identity/create-pocket-id-mcp-server.mjs
WHEN: 2026-10-26
HOW: Fixed owner subject + issuer + exact resource -> authenticated transport
AUTHORITY: Read-only discovery; no device execution enrollment
LICENSE: MIT
*/
import { createRemoteMcpHttpServer } from '../../apps/desktop/remote-mcp-http.mjs';
import { createPocketIdAuthenticator } from './pocket-id-access.mjs';

export function createPocketIdMcpServer({ bridge, issuer, resource, ownerSubject, permission = 'device.bridge.read', fetchImpl } = {}) {
  const authenticate = createPocketIdAuthenticator({ issuer, resource, ownerSubject, permission, fetchImpl });
  return createRemoteMcpHttpServer({ bridge, authenticate });
}
