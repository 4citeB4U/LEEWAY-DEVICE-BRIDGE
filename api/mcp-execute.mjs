/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.PUBLIC.EXECUTION.INGRESS
TAG: LEEWAY.VERCEL.MCP.EXECUTE.AUTHENTICATED.FORWARDER.V1
WHAT: Forward separately authorized execution MCP traffic to the qualified Runtime execution boundary.
WHY: Keep /mcp discovery-only and prevent read credentials from being promoted into device control.
HOW: Require the exact execution resource, execution scope advertisement, distinct upstream, and Runtime-side C3 admission.
AUTHORITY: Transport only; Runtime Fabric independently verifies token scope, owner policy, Formula, Veritas, and receipt admission.
*/
import { createMcpIngressHandler } from "./mcp.mjs";
import { resolveExecutionMcpResourceConfig } from "../operator/identity/public-mcp-resource-config.mjs";

export function createExecutionMcpIngressHandler(options = {}) {
  return createMcpIngressHandler({
    ...options,
    resolveResourceConfig: resolveExecutionMcpResourceConfig,
    upstreamEnvKey: "LEEWAY_MCP_EXECUTION_UPSTREAM",
    upstreamPath: "/mcp-execute"
  });
}

export default createExecutionMcpIngressHandler();
