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
import { LEEWAY_MCP_INSTRUCTIONS } from "../packages/protocol/operating-contract.mjs";

const MAX_BODY_BYTES = 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 30_000;
const REQUEST_HEADER_ALLOWLIST = [
  "authorization",
  "content-type",
  "accept",
  "mcp-protocol-version",
  "mcp-session-id",
  "last-event-id"
];
const RESPONSE_HEADER_ALLOWLIST = [
  "mcp-protocol-version",
  "mcp-session-id",
  "last-event-id",
  "retry-after"
];

function jsonResponse(res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...extraHeaders
  });
  res.end(JSON.stringify(body));
}

function readHeader(headers, name) {
  const value = headers?.[name];
  return typeof value === "string" ? value : undefined;
}

function resolveBrowserOriginAllowlist(env) {
  const raw = String(env.LEEWAY_MCP_ALLOWED_BROWSER_ORIGINS || "");
  const origins = new Set();
  for (const candidate of raw.split(",").map(value => value.trim()).filter(Boolean)) {
    let parsed;
    try { parsed = new URL(candidate); } catch { continue; }
    if (parsed.protocol !== "https:" || parsed.origin !== candidate || parsed.pathname !== "/" || parsed.search || parsed.hash) continue;
    origins.add(parsed.origin);
  }
  return origins;
}

function browserCorsHeaders(origin) {
  if (!origin) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "Authorization, Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id, Last-Event-Id",
    "access-control-expose-headers": "WWW-Authenticate, MCP-Protocol-Version, MCP-Session-Id, Last-Event-Id",
    "vary": "Origin"
  };
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

function forwardedRequestHeaders(req) {
  const headers = {};
  for (const name of REQUEST_HEADER_ALLOWLIST) {
    const value = readHeader(req.headers, name);
    if (value !== undefined) headers[name] = value;
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

function attachLeeWayInstructions(initializeResult, requestId) {
  if (initializeResult?.jsonrpc !== "2.0" || initializeResult.id !== requestId ||
      !initializeResult.result || typeof initializeResult.result !== "object" || Array.isArray(initializeResult.result)) return false;
  const upstreamInstructions = typeof initializeResult.result.instructions === "string"
    ? initializeResult.result.instructions.trim()
    : "";
  initializeResult.result.instructions = upstreamInstructions
    ? `${upstreamInstructions}\n\n${LEEWAY_MCP_INSTRUCTIONS}`
    : LEEWAY_MCP_INSTRUCTIONS;
  return true;
}

function augmentInitializeEventStream(bytes, requestId) {
  const sections = bytes.toString("utf8").split(/(\r?\n\r?\n)/);
  let changed = false;
  for (let index = 0; index < sections.length; index += 2) {
    const block = sections[index];
    const lines = block.split(/\r?\n/);
    const dataIndexes = lines.map((line, lineIndex) => line.startsWith("data:") ? lineIndex : -1).filter(lineIndex => lineIndex >= 0);
    if (!dataIndexes.length) continue;
    const data = dataIndexes.map(lineIndex => lines[lineIndex].slice(5).replace(/^ /, "")).join("\n");
    let message;
    try { message = JSON.parse(data); } catch { continue; }
    if (!attachLeeWayInstructions(message, requestId)) continue;

    const firstDataIndex = dataIndexes[0];
    const insertionIndex = lines.slice(0, firstDataIndex).filter(line => !line.startsWith("data:")).length;
    const retained = lines.filter(line => !line.startsWith("data:"));
    retained.splice(insertionIndex, 0, `data: ${JSON.stringify(message)}`);
    sections[index] = retained.join(block.includes("\r\n") ? "\r\n" : "\n");
    changed = true;
  }
  return changed ? Buffer.from(sections.join(""), "utf8") : null;
}

export function createMcpIngressHandler({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  return async function handleMcpIngress(req, res) {
    const origin = readHeader(req.headers, "origin");
    const allowedOrigins = resolveBrowserOriginAllowlist(env);
    const corsHeaders = browserCorsHeaders(origin);
    const reply = (status, body, extraHeaders = {}) => jsonResponse(res, status, body, { ...corsHeaders, ...extraHeaders });

    if (origin && !allowedOrigins.has(origin)) {
      return reply(403, { error: "BROWSER_ORIGIN_NOT_ADMITTED" });
    }
    if (req.method === "OPTIONS") {
      if (!origin) return reply(405, { error: "METHOD_NOT_ALLOWED" }, { allow: "POST, OPTIONS" });
      return res.writeHead(204, {
        ...corsHeaders,
        "cache-control": "no-store",
        allow: "POST, OPTIONS"
      }).end();
    }
    if (req.method !== "POST") {
      return reply(405, { error: "METHOD_NOT_ALLOWED" }, { allow: "POST, OPTIONS" });
    }

    const resourceConfig = resolvePublicMcpResourceConfig(env);
    if (!resourceConfig.configured) {
      return reply(503, { error: resourceConfig.reason });
    }

    const authorization = readHeader(req.headers, "authorization");
    if (!authorization || !/^Bearer [A-Za-z0-9_~+./=-]+$/.test(authorization)) {
      return reply(401, { error: "BEARER_REQUIRED" }, {
        "www-authenticate": bearerChallenge(resourceConfig.metadataUrl)
      });
    }

    if (!String(readHeader(req.headers, "content-type") || "").toLowerCase().startsWith("application/json")) {
      return reply(415, { error: "JSON_REQUIRED" });
    }

    let body;
    try {
      body = await readRequestBody(req);
    } catch (error) {
      const tooLarge = error instanceof Error && error.message === "MCP_BODY_TOO_LARGE";
      return reply(tooLarge ? 413 : 400, {
        error: tooLarge ? "MCP_BODY_TOO_LARGE" : "MCP_BODY_INVALID"
      });
    }

    const upstreamConfig = resolveUpstreamUrl(env);
    if (!upstreamConfig.configured) {
      return reply(503, { error: upstreamConfig.reason });
    }
    if (typeof fetchImpl !== "function") {
      return reply(503, { error: "FETCH_UNAVAILABLE" });
    }

    let upstream;
    try {
      upstream = await fetchImpl(upstreamConfig.url, {
        method: "POST",
        headers: forwardedRequestHeaders(req),
        body,
        redirect: "error",
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
      });
    } catch {
      return reply(502, { error: "LEEWAY_RUNTIME_UPSTREAM_UNAVAILABLE" });
    }

    const contentType = upstream.headers.get("content-type") || "application/json";
    if (!/^(application\/json|text\/event-stream)(?:\s*;|$)/i.test(contentType)) {
      return reply(502, { error: "UPSTREAM_CONTENT_TYPE_INVALID" });
    }

    const mcpRequest = JSON.parse(body.toString("utf8"));
    const isJson = /^application\/json(?:\s*;|$)/i.test(contentType);
    const isEventStream = /^text\/event-stream(?:\s*;|$)/i.test(contentType);
    if (mcpRequest.method === "initialize" && upstream.status === 200 && (isJson || isEventStream)) {
      const chunks = [];
      let responseBytes = 0;
      try {
        if (upstream.body) {
          for await (const chunk of Readable.fromWeb(upstream.body)) {
            responseBytes += chunk.length;
            if (responseBytes > MAX_BODY_BYTES) throw new Error("UPSTREAM_BODY_TOO_LARGE");
            chunks.push(Buffer.from(chunk));
          }
        }
      } catch {
        return reply(502, { error: "UPSTREAM_INITIALIZE_RESPONSE_INVALID" });
      }
      const rawInitialize = Buffer.concat(chunks);
      let augmentedInitialize = null;
      if (isJson) {
        try {
          const initializeResult = JSON.parse(rawInitialize.toString("utf8"));
          if (attachLeeWayInstructions(initializeResult, mcpRequest.id)) {
            augmentedInitialize = Buffer.from(JSON.stringify(initializeResult), "utf8");
          }
        } catch { /* Preserve the bounded upstream response unchanged. */ }
      } else {
        augmentedInitialize = augmentInitializeEventStream(rawInitialize, mcpRequest.id);
      }
      if (augmentedInitialize) {
        res.writeHead(upstream.status, { ...forwardedResponseHeaders(upstream, resourceConfig), ...corsHeaders });
        res.end(augmentedInitialize);
        return;
      }
      res.writeHead(upstream.status, { ...forwardedResponseHeaders(upstream, resourceConfig), ...corsHeaders });
      res.end(rawInitialize);
      return;
    }

    res.writeHead(upstream.status, { ...forwardedResponseHeaders(upstream, resourceConfig), ...corsHeaders });
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
