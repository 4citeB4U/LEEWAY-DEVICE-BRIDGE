/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.PUBLIC.INGRESS.OAUTH
TAG: LEEWAY.VERCEL.MCP.PROTECTED_RESOURCE_METADATA.V1
WHO: LeeWay Industries
WHAT: Publish OAuth Protected Resource Metadata for the public Device Bridge MCP resource
WHEN: 2026-10-26
WHERE: api/oauth-protected-resource.mjs
WHY: Let MCP clients discover the configured Pocket ID authorization server before presenting a bearer token
HOW: Return only the explicit HTTPS issuer, public /mcp audience, and read scope; fail closed when unbound
AUTHORITY: Metadata only; Pocket ID issues tokens and Runtime Fabric verifies them
LICENSE: MIT
*/
import {
  resolvePublicMcpResourceConfig,
  RUNTIME_READ_SCOPE
} from "../operator/identity/public-mcp-resource-config.mjs";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "*",
  "access-control-max-age": "86400"
};

function sendJson(res, status, body) {
  res.writeHead(status, {
    ...CORS_HEADERS,
    "cache-control": "public, max-age=300",
    "content-type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(body));
}

export function createOAuthProtectedResourceHandler({ env = process.env } = {}) {
  return function handler(req, res) {
    if (req.method === "OPTIONS") {
      res.writeHead(204, CORS_HEADERS);
      res.end();
      return;
    }
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "METHOD_NOT_ALLOWED" });
      return;
    }

    const config = resolvePublicMcpResourceConfig(env);
    if (!config.configured) {
      sendJson(res, 503, { error: "OAUTH_RESOURCE_METADATA_UNAVAILABLE", reason: config.reason });
      return;
    }

    sendJson(res, 200, {
      resource: config.audience,
      authorization_servers: [config.issuer],
      scopes_supported: [RUNTIME_READ_SCOPE],
      bearer_methods_supported: ["header"]
    });
  };
}

export default createOAuthProtectedResourceHandler();
