/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.PUBLIC.INGRESS
TAG: LEEWAY.VERCEL.MCP.AUTHENTICATED.FORWARDER.V2
WHO: LeeWay Industries
WHAT: Route public Vercel MCP requests to the ZITADEL OIDC-protected Runtime Fabric resource
WHY: Keep the public OAuth resource identity and upstream MCP path consistent without duplicating execution authority
WHERE: api/mcp.mjs
WHEN: 2026-10-26
HOW: Validate explicit HTTPS bindings; preserve bounded MCP/auth headers; reject redirects; stream bounded responses
AUTHORITY: Transport only; Runtime Fabric verifies OIDC JWT/scope and owns the read-only tool
LICENSE: MIT
*/
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { resolvePublicMcpResourceConfig } from "../operator/identity/public-mcp-resource-config.mjs";

const MAX_BODY_BYTES = 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 30_000;
const REQUEST_HEADER_ALLOWLIST = [
  "authorization",
  "content-type",
  "accept",
  "mcp-protocol-version",
  "mcp-method",
  "mcp-name",
  "mcp-session-id",
  "last-event-id"
];
const RESPONSE_HEADER_ALLOWLIST = [
  "mcp-protocol-version",
  "mcp-session-id",
  "last-event-id",
  "retry-after"
];
const DEFAULT_ALLOWED_ORIGINS = Object.freeze([
  "https://chatgpt.com",
  "https://chat.openai.com",
  "https://vscode.dev"
]);

function jsonResponse(res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...extraHeaders
  });
  res.end(JSON.stringify(body));
}

function corsHeaders(originHeader) {
  if (typeof originHeader !== "string") return {};
  return {
    "access-control-allow-origin": originHeader,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": [...REQUEST_HEADER_ALLOWLIST, "origin"].join(", "),
    "access-control-expose-headers": ["www-authenticate", ...RESPONSE_HEADER_ALLOWLIST].join(", "),
    "access-control-max-age": "600",
    "vary": "Origin"
  };
}

function readHeader(headers, name) {
  const value = headers?.[name];
  return typeof value === "string" ? value : undefined;
}

function resolveAllowedOrigins(env) {
  const configured = String(env.LEEWAY_MCP_ALLOWED_ORIGINS || "")
    .split(/[\n,]/)
    .map(value => value.trim())
    .filter(Boolean);
  const candidates = configured.length ? configured : DEFAULT_ALLOWED_ORIGINS;
  const origins = new Set();
  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      if (url.origin === candidate && !url.username && !url.password && !url.pathname.includes("//")) {
        origins.add(url.origin);
      }
    } catch {
      // Invalid configured origins are ignored; an explicit Origin then fails closed.
    }
  }
  return origins;
}

function isAdmittedOrigin(originHeader, env) {
  // Non-browser MCP clients normally omit Origin and remain supported.
  if (originHeader === undefined) return true;
  try {
    const origin = new URL(originHeader);
    if (origin.origin !== originHeader || origin.username || origin.password) return false;
    return resolveAllowedOrigins(env).has(origin.origin);
  } catch {
    return false;
  }
}

function resolveUpstreamUrl(env) {
  const value = String(env.LEEWAY_MCP_UPSTREAM || "").trim();
  if (!value) return { configured: false, reason: "LEEWAY_RUNTIME_UPSTREAM_UNBOUND" };

  let url;
  try {
    url = new URL(value);
  } catch {
    return { configured: false, reason: "LEEWAY_RUNTIME_UPSTREAM_INVALID" };
  }

  if (url.protocol !== "https:"
    || !url.hostname
    || url.username
    || url.password
    || url.search
    || url.hash
    || url.pathname !== "/mcp") {
    return { configured: false, reason: "LEEWAY_RUNTIME_UPSTREAM_INVALID" };
  }

  return { configured: true, url };
}

function bearerChallenge(metadataUrl, upstreamChallenge) {
  const resourceParameter = `resource_metadata="${metadataUrl}"`;
  if (!upstreamChallenge) return `Bearer ${resourceParameter}`;

  const existing = upstreamChallenge.trim();
  if (/resource_metadata\s*=\s*"[^"]*"/i.test(existing)) {
    return existing.replace(/resource_metadata\s*=\s*"[^"]*"/i, resourceParameter);
  }
  if (/^Bearer(?:\s|$)/i.test(existing)) return `${existing}, ${resourceParameter}`;
  return `Bearer ${resourceParameter}`;
}

async function readRequestBody(req) {
  let body;
  if (req.body !== undefined) {
    if (Buffer.isBuffer(req.body) || req.body instanceof Uint8Array) {
      body = Buffer.from(req.body);
    } else if (typeof req.body === "string") {
      body = Buffer.from(req.body);
    } else {
      body = Buffer.from(JSON.stringify(req.body));
    }
  } else {
    const chunks = [];
    let length = 0;
    for await (const chunk of req) {
      length += chunk.length;
      if (length > MAX_BODY_BYTES) throw new Error("MCP_BODY_TOO_LARGE");
      chunks.push(chunk);
    }
    body = Buffer.concat(chunks);
  }

  if (body.length > MAX_BODY_BYTES) throw new Error("MCP_BODY_TOO_LARGE");
  JSON.parse(body.toString("utf8"));
  return body;
}

function forwardedRequestHeaders(req, body) {
  const headers = {};
  for (const name of REQUEST_HEADER_ALLOWLIST) {
    const value = readHeader(req.headers, name);
    if (value !== undefined) headers[name] = value;
  }

  // Preserve compatibility with clients that send MCP routing information in
  // JSON-RPC only. Existing headers are never rewritten, so mismatches still
  // reach the Runtime Fabric and fail closed there.
  if (body && (!headers["mcp-method"] || !headers["mcp-name"])) {
    const payload = JSON.parse(body.toString("utf8"));
    if (!headers["mcp-method"]
      && (payload?.method === "tools/list" || payload?.method === "tools/call")) {
      headers["mcp-method"] = payload.method;
    }
    if (payload?.method === "tools/call" && payload?.params?.name && !headers["mcp-name"]) {
      headers["mcp-name"] = payload.params.name;
    }
  }

  return headers;
}

function forwardedResponseHeaders(upstream, resourceConfig) {
  const headers = {
    "content-type": upstream.headers.get("content-type") || "application/json",
    "cache-control": "no-store"
  };
  for (const name of RESPONSE_HEADER_ALLOWLIST) {
    const value = upstream.headers.get(name);
    if (value !== null) headers[name] = value;
  }

  if (upstream.status === 401 || upstream.status === 403) {
    headers["www-authenticate"] = bearerChallenge(
      resourceConfig.metadataUrl,
      upstream.headers.get("www-authenticate")
    );
  }
  return headers;
}

export function createMcpIngressHandler({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  return async function handleMcpIngress(req, res) {
    const origin = readHeader(req.headers, "origin");
    if (!isAdmittedOrigin(origin, env)) {
      return jsonResponse(res, 403, { error: "BROWSER_ORIGIN_NOT_ADMITTED" });
    }
    const originHeaders = corsHeaders(origin);
    const respond = (status, body, extraHeaders = {}) =>
      jsonResponse(res, status, body, { ...originHeaders, ...extraHeaders });

    if (req.method === "OPTIONS") {
      res.writeHead(204, originHeaders);
      return res.end();
    }
    if (req.method !== "POST" && req.method !== "GET") {
      return respond(405, { error: "METHOD_NOT_ALLOWED" }, { allow: "GET, POST, OPTIONS" });
    }

    const resourceConfig = resolvePublicMcpResourceConfig(env);
    if (!resourceConfig.configured) {
      return respond(503, { error: resourceConfig.reason });
    }

    const authorization = readHeader(req.headers, "authorization");
    if (!authorization || !/^Bearer [A-Za-z0-9_~+./=-]+$/.test(authorization)) {
      return respond(401, { error: "BEARER_REQUIRED" }, {
        "www-authenticate": bearerChallenge(resourceConfig.metadataUrl)
      });
    }

    if (req.method === "POST"
      && !String(readHeader(req.headers, "content-type") || "").toLowerCase().startsWith("application/json")) {
      return respond(415, { error: "JSON_REQUIRED" });
    }

    let body;
    if (req.method === "POST") {
      try {
        body = await readRequestBody(req);
      } catch (error) {
        const tooLarge = error instanceof Error && error.message === "MCP_BODY_TOO_LARGE";
        return respond(tooLarge ? 413 : 400, {
          error: tooLarge ? "MCP_BODY_TOO_LARGE" : "MCP_BODY_INVALID"
        });
      }
    }

    const upstreamConfig = resolveUpstreamUrl(env);
    if (!upstreamConfig.configured) {
      return respond(503, { error: upstreamConfig.reason });
    }
    if (typeof fetchImpl !== "function") {
      return respond(503, { error: "FETCH_UNAVAILABLE" });
    }

    let upstream;
    try {
      upstream = await fetchImpl(upstreamConfig.url, {
        method: req.method,
        headers: forwardedRequestHeaders(req, body),
        ...(body !== undefined ? { body } : {}),
        redirect: "error",
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
      });
    } catch {
      return respond(502, { error: "LEEWAY_RUNTIME_UPSTREAM_UNAVAILABLE" });
    }

    const contentType = upstream.headers.get("content-type") || "application/json";
    if (!/^(application\/json|text\/event-stream)(?:\s*;|$)/i.test(contentType)) {
      return respond(502, { error: "UPSTREAM_CONTENT_TYPE_INVALID" });
    }

    res.writeHead(upstream.status, { ...forwardedResponseHeaders(upstream, resourceConfig), ...originHeaders });
    const sizeGuard = new Transform({
      transform(chunk, _encoding, callback) {
        this.bytes = (this.bytes || 0) + chunk.length;
        if (this.bytes > MAX_BODY_BYTES) {
          callback(new Error("UPSTREAM_BODY_TOO_LARGE"));
          return;
        }
        callback(null, chunk);
      }
    });

    try {
      const source = upstream.body ? Readable.fromWeb(upstream.body) : Readable.from([]);
      await pipeline(source, sizeGuard, res, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
    } catch (error) {
      if (!res.headersSent) return jsonResponse(res, 502, { error: "UPSTREAM_RESPONSE_STREAM_FAILED" });
      res.destroy(error);
    }
  };
}

export default createMcpIngressHandler();
