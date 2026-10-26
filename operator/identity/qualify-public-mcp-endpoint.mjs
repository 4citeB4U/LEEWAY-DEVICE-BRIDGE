/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.DEPLOYMENT.QUALIFICATION
TAG: LEEWAY.MCP.PUBLIC_OAUTH_DISCOVERY.QUALIFIER.V1
WHO: LeeWay Industries
WHAT: Verify the explicit public Vercel /mcp OAuth-discovery contract without credentials
WHEN: 2026-10-26
WHERE: operator/identity/qualify-public-mcp-endpoint.mjs
WHY: Reject stale Fly targets, SSO redirects, missing challenges, and mismatched OAuth resources
HOW: POST one unauthenticated initialize request, then GET path-scoped metadata over verified HTTPS
AUTHORITY: Discovery only; does not prove authenticated MCP calls or device execution
LICENSE: MIT
*/
import path from "node:path";
import { fileURLToPath } from "node:url";

const MCP_METADATA_PATH = "/.well-known/oauth-protected-resource/mcp";
const OIDC_DISCOVERY_PATH = "/.well-known/openid-configuration";
const READ_SCOPE = "read:runtime";
const MAX_METADATA_BYTES = 64 * 1024;

function parseHttpsUrl(value, label, expectedPath) {
  const raw = String(value || "").trim();
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${label}_INVALID_URL`);
  }
  if (url.protocol !== "https:" || !url.hostname || url.username || url.password || url.search || url.hash) {
    throw new Error(`${label}_UNSAFE_URL`);
  }
  if (expectedPath && url.pathname !== expectedPath) throw new Error(`${label}_MUST_END_IN_MCP`);
  return { raw: expectedPath ? url.toString() : raw, url };
}

async function readBoundedJson(response) {
  const length = Number(response.headers.get("content-length") || 0);
  if (length > MAX_METADATA_BYTES) throw new Error("OAUTH_METADATA_TOO_LARGE");
  const reader = response.body?.getReader?.();
  let raw;
  if (!reader) {
    raw = await response.text();
  } else {
    const chunks = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_METADATA_BYTES) {
          await reader.cancel();
          throw new Error("OAUTH_METADATA_TOO_LARGE");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    raw = new TextDecoder().decode(bytes);
  }
  if (new TextEncoder().encode(raw).byteLength > MAX_METADATA_BYTES) throw new Error("OAUTH_METADATA_TOO_LARGE");
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("OAUTH_METADATA_INVALID_JSON");
  }
}

function requireHttpsEndpoint(value, label, expectedOrigin) {
  const endpoint = parseHttpsUrl(value, label).url;
  if (expectedOrigin && endpoint.origin !== expectedOrigin) throw new Error(`${label}_ORIGIN_MISMATCH`);
  return endpoint.toString();
}

async function fetchJson(fetchImpl, url, label) {
  const response = await fetchImpl(url, {
    method: "GET",
    headers: { accept: "application/json" },
    redirect: "manual",
    signal: AbortSignal.timeout(10_000)
  });
  if (response.status !== 200) throw new Error(`${label}_HTTP_${response.status}`);
  if (!(response.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
    throw new Error(`${label}_NOT_JSON`);
  }
  return readBoundedJson(response);
}

export async function qualifyPublicMcpEndpoint({ endpoint, expectedIssuer, fetchImpl = globalThis.fetch } = {}) {
  const resource = parseHttpsUrl(endpoint, "MCP_ENDPOINT", "/mcp");
  const issuer = parseHttpsUrl(expectedIssuer, "EXPECTED_ISSUER");
  if (issuer.url.pathname !== "/") throw new Error("EXPECTED_ISSUER_MUST_BE_ORIGIN_ROOT");
  if (typeof fetchImpl !== "function") throw new Error("FETCH_UNAVAILABLE");

  const metadataUrl = new URL(MCP_METADATA_PATH, resource.url.origin).toString();
  const unauthenticated = await fetchImpl(resource.raw, {
    method: "POST",
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "leeway-public-mcp-qualifier", version: "1.0.0" }
      }
    }),
    redirect: "manual",
    signal: AbortSignal.timeout(10_000)
  });
  if (unauthenticated.status !== 401) {
    throw new Error(`UNAUTHENTICATED_MCP_EXPECTED_401_GOT_${unauthenticated.status}`);
  }
  if (!(unauthenticated.headers.get("www-authenticate") || "").includes(`resource_metadata="${metadataUrl}"`)) {
    throw new Error("OAUTH_BEARER_CHALLENGE_METADATA_MISMATCH");
  }

  const metadataResponse = await fetchImpl(metadataUrl, {
    method: "GET",
    headers: { accept: "application/json" },
    redirect: "manual",
    signal: AbortSignal.timeout(10_000)
  });
  if (metadataResponse.status !== 200) throw new Error(`OAUTH_METADATA_HTTP_${metadataResponse.status}`);
  if (!(metadataResponse.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
    throw new Error("OAUTH_METADATA_NOT_JSON");
  }
  const metadata = await readBoundedJson(metadataResponse);
  if (metadata.resource !== resource.raw) throw new Error("OAUTH_METADATA_RESOURCE_MISMATCH");
  if (!Array.isArray(metadata.authorization_servers) || !metadata.authorization_servers.includes(issuer.raw)) {
    throw new Error("OAUTH_METADATA_ISSUER_MISMATCH");
  }
  if (!Array.isArray(metadata.scopes_supported) || !metadata.scopes_supported.includes(READ_SCOPE)) {
    throw new Error("OAUTH_METADATA_SCOPE_MISSING");
  }

  const discoveryUrl = new URL(OIDC_DISCOVERY_PATH, issuer.url.origin).toString();
  const discovery = await fetchJson(fetchImpl, discoveryUrl, "OIDC_DISCOVERY");
  if (discovery.issuer !== issuer.raw) throw new Error("OIDC_DISCOVERY_ISSUER_MISMATCH");
  requireHttpsEndpoint(discovery.authorization_endpoint, "OIDC_AUTHORIZATION_ENDPOINT");
  requireHttpsEndpoint(discovery.token_endpoint, "OIDC_TOKEN_ENDPOINT");
  const jwksUrl = requireHttpsEndpoint(discovery.jwks_uri, "OIDC_JWKS_URI", issuer.url.origin);
  const jwks = await fetchJson(fetchImpl, jwksUrl, "OIDC_JWKS");
  if (!Array.isArray(jwks.keys)) throw new Error("OIDC_JWKS_INVALID");

  return {
    status: "PASS",
    target: resource.raw,
    issuer: issuer.raw,
    checks: {
      publicMcpUnauthenticatedRefusal: "PASS",
      bearerChallenge: "PASS",
      protectedResourceMetadata: "PASS",
      pocketIdDiscovery: "PASS",
      pocketIdJwks: "PASS",
      authenticatedMcpCall: "NOT_RUN",
      deviceExecution: "NOT_PROBED"
    },
    observedAt: new Date().toISOString()
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await qualifyPublicMcpEndpoint({
      endpoint: process.env.LEEWAY_PUBLIC_MCP_ENDPOINT,
      expectedIssuer: process.env.LEEWAY_MCP_EXPECTED_ISSUER
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      status: "FAIL",
      reason: error instanceof Error ? error.message : "PUBLIC_MCP_QUALIFICATION_FAILED",
      credentialsUsed: false
    }, null, 2));
    process.exitCode = 1;
  }
}
