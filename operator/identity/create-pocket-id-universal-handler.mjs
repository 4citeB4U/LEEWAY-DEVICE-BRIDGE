/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.BINDING
TAG: LEEWAY.MCP.POCKET_ID.UNIVERSAL.V2
WHO: LeeWay Industries
WHAT: Authenticate scoped Pocket ID discovery and governed device command MCP sessions
WHEN: 2026-10-27
WHERE: operator/identity/create-pocket-id-universal-handler.mjs
WHY: Restore canonical Device Bridge commands without upgrading read-only tokens to execution authority
HOW: Verify issuer/audience/owner and separate scopes; route through the original Bridge C3 admission
AUTHORITY: Trusted host opts in only with production Runtime composition; no standalone grant
LICENSE: MIT
*/
import { createRemoteMcpHandler } from '../../apps/desktop/mcp-http.mjs';
import { createPocketIdAuthenticator } from './pocket-id-access.mjs';

export const DEVICE_BRIDGE_EXECUTE_PERMISSION = 'device.bridge.execute';

/**
 * The read scope retains the original discovery-only behavior.
 * The execute scope can expose the canonical tool factory ONLY when the
 * trusted host has explicitly enabled it with a qualified Runtime composition.
 * Tool listing does not bypass Bridge.call's device grants, Formula, consent,
 * independent Veritas PRE, or durable pre-execution receipt sink.
 */
export function createPocketIdUniversalHandler({
  issuer, resource, ownerSubject, permission = 'device.bridge.read',
  fetchImpl, resolveBridge, allowedHosts, allowedOrigins = [],
  executionEnabled = false
} = {}) {
  if (typeof resolveBridge !== 'function') throw Error('TRUSTED_BRIDGE_RESOLVER_REQUIRED');
  if (typeof executionEnabled !== 'boolean' || permission === DEVICE_BRIDGE_EXECUTE_PERMISSION) {
    throw Error('INVALID_MCP_TOOL_SCOPE_CONFIGURATION');
  }
  const readAuthenticator = createPocketIdAuthenticator({
    issuer, resource, ownerSubject, permission, fetchImpl
  });
  const executeAuthenticator = executionEnabled
    ? createPocketIdAuthenticator({
        issuer, resource, ownerSubject,
        permission: DEVICE_BRIDGE_EXECUTE_PERMISSION, fetchImpl
      })
    : null;

  return createRemoteMcpHandler({
    authenticate: async req => {
      if (executeAuthenticator && await executeAuthenticator(req)) {
        return Object.freeze({
          subject: ownerSubject, issuer, resource,
          permission: DEVICE_BRIDGE_EXECUTE_PERMISSION, mayExecute: true
        });
      }
      if (await readAuthenticator(req)) {
        return Object.freeze({
          subject: ownerSubject, issuer, resource, permission, mayExecute: false
        });
      }
      return null;
    },
    resolveBridge,
    allowedHosts,
    allowedOrigins,
    discoveryOnly: principal => principal?.mayExecute !== true
  });
}
