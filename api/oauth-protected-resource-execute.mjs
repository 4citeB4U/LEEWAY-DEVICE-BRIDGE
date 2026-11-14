/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.PUBLIC.EXECUTION.OAUTH
TAG: LEEWAY.VERCEL.MCP.EXECUTE.PROTECTED_RESOURCE_METADATA.V1
WHAT: Publish metadata for the distinct owner-authorized execution resource.
WHY: Clients must request an execution token for /mcp-execute; read-resource tokens are never interchangeable.
HOW: Reuse the generic metadata transport with the execution-only configuration resolver.
AUTHORITY: Metadata only; it does not issue tokens or grant device control.
*/
import { createOAuthProtectedResourceHandler } from "./oauth-protected-resource.mjs";
import { resolveExecutionMcpResourceConfig } from "../operator/identity/public-mcp-resource-config.mjs";

export function createExecutionOAuthProtectedResourceHandler(options = {}) {
  return createOAuthProtectedResourceHandler({ ...options, resolveResourceConfig: resolveExecutionMcpResourceConfig });
}

export default createExecutionOAuthProtectedResourceHandler();
