/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.BINDING
TAG: LEEWAY.MCP.OIDC.BINDING.V1
WHAT: Bind the canonical read-only MCP host to provider-neutral OIDC JWT auth.
AUTHORITY: Read-only discovery; no device execution enrollment.
*/
import { createRemoteMcpHttpServer } from '../../apps/desktop/remote-mcp-http.mjs';
import { createOidcAuthenticator } from './oidc-access.mjs';

export function createOidcMcpServer({ bridge, issuer, resource, ownerSubject, permission = 'device.bridge.read', roleKey = 'device.discovery.read', projectId = '', roleClaim = '', fetchImpl } = {}) {
  const authenticate = createOidcAuthenticator({ issuer, resource, ownerSubject, permission, roleKey, projectId, roleClaim, fetchImpl });
  return createRemoteMcpHttpServer({ bridge, authenticate, resourceUrl: resource, authorizationServerUrl: issuer });
}
