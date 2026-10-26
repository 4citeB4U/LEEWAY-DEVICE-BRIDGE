/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.BINDING
TAG: LEEWAY.MCP.POCKET_ID.UNIVERSAL.V1
WHO: LeeWay Industries
WHAT: Bind existing Pocket ID JWT authentication to the universal MCP handler
WHEN: 2026-10-26
WHERE: operator/identity/create-pocket-id-universal-handler.mjs
WHY: Reuse one canonical Device Bridge tool factory with no duplicate gateway or broadened OAuth grants
HOW: Owner-subject verified JWT, explicit principal-scoped bridge resolution, read-only discovery
AUTHORITY: Discovery only; execution requires separate independently governed production admission
LICENSE: MIT
*/
import { createRemoteMcpHandler } from '../../apps/desktop/mcp-http.mjs';
import { createPocketIdAuthenticator } from './pocket-id-access.mjs';
export function createPocketIdUniversalHandler({issuer,resource,ownerSubject,permission='device.bridge.read',fetchImpl,resolveBridge,allowedHosts,allowedOrigins=[]}={}){
 if(typeof resolveBridge!=='function') throw Error('TRUSTED_BRIDGE_RESOLVER_REQUIRED');
 const verified=createPocketIdAuthenticator({issuer,resource,ownerSubject,permission,fetchImpl});
 return createRemoteMcpHandler({
  authenticate:async req=>(await verified(req))?Object.freeze({subject:ownerSubject,issuer,resource,permission}):null,
  resolveBridge,
  allowedHosts,allowedOrigins,discoveryOnly:true
 });
}
