/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.BINDING
TAG: LEEWAY.MCP.ZITADEL.BINDING.V2
WHO: LeeWay Industries
WHAT: Bind the existing canonical read-only MCP host to ZITADEL OIDC API JWT auth
WHY: Prevent HTTP exposure from bypassing OAuth resource and owner validation
WHERE: operator/identity/create-zitadel-mcp-server.mjs
WHEN: 2026-11-12
HOW: Fixed owner subject + ZITADEL issuer + exact resource -> authenticated transport
AUTHORITY: Read-only discovery; no device execution enrollment
LICENSE: MIT
*/
import { createRemoteMcpHttpServer } from '../../apps/desktop/remote-mcp-http.mjs';
import { createZitadelAuthenticator } from './zitadel-access.mjs';

export function createZitadelMcpServer({
  bridge,
  issuer,
  resource,
  ownerSubject,
  permission = 'device.bridge.read',
  tokenAudiences = [],
  projectId = '',
  roleClaim = '',
  revokedJtis = [],
  isTokenRevoked = null,
  fetchImpl,
} = {}) {
  const authenticate = createZitadelAuthenticator({
    issuer,
    resource,
    ownerSubject,
    permission,
    tokenAudiences,
    projectId,
    roleClaim,
    revokedJtis,
    isTokenRevoked,
    fetchImpl,
  });
  return createRemoteMcpHttpServer({
    bridge,
    authenticate,
    resourceUrl: resource,
    authorizationServerUrl: issuer,
  });
}
