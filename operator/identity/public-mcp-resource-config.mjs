/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.RESOURCE
TAG: LEEWAY.ZITADEL.PUBLIC_MCP_RESOURCE_CONFIG.V3
WHO: LeeWay Industries
WHAT: Resolve the client-facing ZITADEL OIDC resource metadata for the public Device Bridge MCP ingress
WHEN: 2026-11-12
WHERE: operator/identity/public-mcp-resource-config.mjs
WHY: Keep OAuth resource identity exact across Device Bridge and Runtime Fabric with fail-closed ZITADEL-only rules
HOW: Reconcile canonical LEEWAY_MCP_* with explicit workstation LEEWAY_OIDC_ISSUER/LEEWAY_MCP_RESOURCE/LEEWAY_MCP_PROJECT_ID without defaults
AUTHORITY: Configuration validation only; no token issuance or execution authority
LICENSE: MIT
*/
import { isRetiredIssuerUrl } from "./zitadel-access.mjs";

export const RUNTIME_READ_SCOPE = "read:runtime";
export const BRIDGE_READ_SCOPE = "device.bridge.read";
export const BRIDGE_EXECUTE_SCOPE = "device.bridge.execute";
export const PUBLIC_MCP_METADATA_PATH = "/.well-known/oauth-protected-resource/mcp";
export const EXECUTION_MCP_METADATA_PATH = "/.well-known/oauth-protected-resource/mcp-execute";

const RETIRED_ENV_PREFIX = `${["LEEWAY", "POCKET", "ID"].join("_")}_`;

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

function hasRetiredIdentityEnv(env) {
  return Object.entries(env || {}).some(
    ([key, value]) => key.startsWith(RETIRED_ENV_PREFIX) && String(value || "").trim() !== ""
  );
}

function reconcilePair(env, primaryKey, aliasKey, { normalize = value => value } = {}) {
  const primary = String(env?.[primaryKey] || "").trim();
  const alias = String(env?.[aliasKey] || "").trim();
  if (primary && alias && normalize(primary) !== normalize(alias)) {
    return { conflict: true, value: "" };
  }
  return { conflict: false, value: primary || alias };
}

export function resolvePublicMcpResourceConfig(env = process.env) {
  if (hasRetiredIdentityEnv(env)) {
    return { configured: false, reason: "MCP_OAUTH_RETIRED_FALLBACK_FORBIDDEN" };
  }

  const issuerPair = reconcilePair(env, "LEEWAY_MCP_AUTH_ISSUER", "LEEWAY_OIDC_ISSUER", {
    normalize: value => value.replace(/\/+$/, "")
  });
  const audiencePair = reconcilePair(env, "LEEWAY_MCP_AUDIENCE", "LEEWAY_MCP_RESOURCE", {
    normalize: value => value.replace(/\/+$/, "")
  });
  if (issuerPair.conflict || audiencePair.conflict) {
    return { configured: false, reason: "MCP_OAUTH_ENVIRONMENT_CONFLICT" };
  }

  const issuer = issuerPair.value;
  const audienceValue = audiencePair.value;
  if (!issuer || !audienceValue) {
    return { configured: false, reason: "MCP_OAUTH_ENVIRONMENT_INCOMPLETE" };
  }

  if (isRetiredIssuerUrl(issuer)) {
    return { configured: false, reason: "MCP_OAUTH_RETIRED_ISSUER_REJECTED" };
  }

  const issuerUrl = secureHttpsUrl(issuer);
  const audienceUrl = secureHttpsUrl(audienceValue);
  if (!issuerUrl || !audienceUrl || audienceUrl.pathname !== "/mcp") {
    return { configured: false, reason: "MCP_OAUTH_ENVIRONMENT_INVALID" };
  }

  const projectId = String(env?.LEEWAY_MCP_PROJECT_ID || "").trim();
  if (projectId && !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(projectId)) {
    return { configured: false, reason: "MCP_OAUTH_PROJECT_ID_INVALID" };
  }

  const audience = audienceUrl.toString().replace(/\/$/, "");
  const metadataUrl = new URL(PUBLIC_MCP_METADATA_PATH, audienceUrl.origin).toString();
  return Object.freeze({
    configured: true,
    provider: "ZITADEL",
    issuer,
    audience,
    metadataUrl,
    ...(projectId ? { projectId } : {}),
    // This is permission *advertisement* only. ZITADEL must separately grant
    // actual owner-delegated scopes, Runtime Fabric must verify the token, and
    // native device availability remains unproven until independently measured.
    scopes: Object.freeze(env.LEEWAY_MCP_DISCOVERY_AUTHORIZED === "owner-read-only"
      ? [RUNTIME_READ_SCOPE, BRIDGE_READ_SCOPE] : [RUNTIME_READ_SCOPE])
  });
}

/**
 * Execution is a separate protected resource.  In particular, a read token
 * for /mcp must never become a write token merely because an operator points
 * a client at a different path.  The explicit feature flag also prevents a
 * partially configured deployment from advertising a command surface.
 */
export function resolveExecutionMcpResourceConfig(env = process.env) {
  if (hasRetiredIdentityEnv(env)) {
    return { configured: false, reason: "MCP_OAUTH_RETIRED_FALLBACK_FORBIDDEN" };
  }
  if (env?.LEEWAY_MCP_EXECUTION_AUTHORIZED !== "owner-execute") {
    return { configured: false, reason: "MCP_EXECUTION_NOT_AUTHORIZED" };
  }

  const issuerPair = reconcilePair(env, "LEEWAY_MCP_AUTH_ISSUER", "LEEWAY_OIDC_ISSUER", {
    normalize: value => value.replace(/\/+$/, "")
  });
  if (issuerPair.conflict) return { configured: false, reason: "MCP_OAUTH_ENVIRONMENT_CONFLICT" };
  if (!issuerPair.value) return { configured: false, reason: "MCP_OAUTH_ENVIRONMENT_INCOMPLETE" };
  if (isRetiredIssuerUrl(issuerPair.value)) return { configured: false, reason: "MCP_OAUTH_RETIRED_ISSUER_REJECTED" };

  const issuerUrl = secureHttpsUrl(issuerPair.value);
  const audienceUrl = secureHttpsUrl(env?.LEEWAY_MCP_EXECUTION_AUDIENCE);
  if (!issuerUrl || !audienceUrl || audienceUrl.pathname !== "/mcp-execute") {
    return { configured: false, reason: "MCP_EXECUTION_ENVIRONMENT_INVALID" };
  }

  const audience = audienceUrl.toString().replace(/\/$/, "");
  return Object.freeze({
    configured: true,
    provider: "ZITADEL",
    issuer: issuerUrl.toString().replace(/\/$/, ""),
    audience,
    metadataUrl: new URL(EXECUTION_MCP_METADATA_PATH, audienceUrl.origin).toString(),
    scopes: Object.freeze([RUNTIME_READ_SCOPE, BRIDGE_READ_SCOPE, BRIDGE_EXECUTE_SCOPE])
  });
}
