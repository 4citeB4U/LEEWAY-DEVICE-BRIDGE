/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.RESOURCE
TAG: LEEWAY.POCKET_ID.PUBLIC_MCP_RESOURCE_CONFIG.V1
WHO: LeeWay Industries
WHAT: Resolve the client-facing Pocket ID resource metadata for the Vercel MCP ingress
WHEN: 2026-10-26
WHERE: operator/identity/public-mcp-resource-config.mjs
WHY: Keep OAuth resource identity exact across the public Device Bridge and Runtime Fabric
HOW: Validate configured HTTPS issuer and canonical /mcp audience; never provide defaults
AUTHORITY: Configuration validation only; no token issuance or execution authority
LICENSE: MIT
*/

export const RUNTIME_READ_SCOPE = "read:runtime";
export const PUBLIC_MCP_METADATA_PATH = "/.well-known/oauth-protected-resource/mcp";

function secureHttpsUrl(value) {
  let url;
  try {
    url = new URL(String(value || "").trim());
  } catch {
    return undefined;
  }

  if (url.protocol !== "https:"
    || !url.hostname
    || url.username
    || url.password
    || url.search
    || url.hash) {
    return undefined;
  }
  return url;
}

export function resolvePublicMcpResourceConfig(env = process.env) {
  const issuer = String(env.LEEWAY_MCP_AUTH_ISSUER || "").trim();
  const audienceValue = String(env.LEEWAY_MCP_AUDIENCE || "").trim();
  if (!issuer || !audienceValue) {
    return { configured: false, reason: "MCP_OAUTH_ENVIRONMENT_INCOMPLETE" };
  }

  const issuerUrl = secureHttpsUrl(issuer);
  const audienceUrl = secureHttpsUrl(audienceValue);
  if (!issuerUrl || !audienceUrl || audienceUrl.pathname !== "/mcp") {
    return { configured: false, reason: "MCP_OAUTH_ENVIRONMENT_INVALID" };
  }

  const audience = audienceUrl.toString().replace(/\/$/, "");
  const metadataUrl = new URL(PUBLIC_MCP_METADATA_PATH, audienceUrl.origin).toString();
  return Object.freeze({
    configured: true,
    issuer,
    audience,
    metadataUrl,
    scopes: Object.freeze([RUNTIME_READ_SCOPE])
  });
}
