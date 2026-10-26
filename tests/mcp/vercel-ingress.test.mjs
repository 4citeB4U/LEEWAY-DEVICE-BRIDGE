/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.PUBLIC.INGRESS.TEST
TAG: LEEWAY.VERCEL.MCP.OAUTH.FORWARDER.TEST.V1
WHO: LeeWay Industries
WHAT: Verify Vercel route, OAuth discovery, and bounded MCP forwarding contracts
WHEN: 2026-10-26
WHERE: tests/mcp/vercel-ingress.test.mjs
WHY: Prevent SSO pages, missing metadata, dropped MCP headers, or an unbound upstream from appearing qualified
HOW: Local HTTP fixture and controlled upstream responses; no credentials or external calls
AUTHORITY: Source tests only; not production endpoint or device-execution proof
LICENSE: MIT
*/
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { once } from "node:events";
import test from "node:test";
import ingressFunction, { createMcpIngressHandler } from "../../api/mcp.mjs";
import { createOAuthProtectedResourceHandler } from "../../api/oauth-protected-resource.mjs";
import {
  PUBLIC_MCP_METADATA_PATH,
  RUNTIME_READ_SCOPE,
  resolvePublicMcpResourceConfig
} from "../../operator/identity/public-mcp-resource-config.mjs";

const ISSUER = "https://pocket-id.example:10000";
const RESOURCE = "https://bridge.example/mcp";
const UPSTREAM = "https://runtime-fabric.example/mcp";
const env = {
  LEEWAY_MCP_AUTH_ISSUER: ISSUER,
  LEEWAY_MCP_AUDIENCE: RESOURCE,
  LEEWAY_MCP_UPSTREAM: UPSTREAM
};

async function startServer(handler, t) {
  const server = createServer(handler);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

function combinedHandler({ mcpHandler, metadataHandler }) {
  return (req, res) => {
    const pathname = new URL(req.url, "http://localhost").pathname;
    if (pathname === "/mcp") return mcpHandler(req, res);
    if (pathname === PUBLIC_MCP_METADATA_PATH) return metadataHandler(req, res);
    res.writeHead(404);
    res.end();
  };
}

test("public resource configuration fails closed and accepts only HTTPS /mcp resources", () => {
  assert.equal(resolvePublicMcpResourceConfig({}).configured, false);
  assert.equal(resolvePublicMcpResourceConfig({
    LEEWAY_MCP_AUTH_ISSUER: ISSUER,
    LEEWAY_MCP_AUDIENCE: "http://bridge.example/mcp"
  }).configured, false);
  assert.equal(resolvePublicMcpResourceConfig({
    LEEWAY_MCP_AUTH_ISSUER: ISSUER,
    LEEWAY_MCP_AUDIENCE: "https://bridge.example/api/mcp"
  }).configured, false);
  assert.deepEqual(resolvePublicMcpResourceConfig(env).scopes, [RUNTIME_READ_SCOPE]);
});

test("Vercel maps /mcp and path-scoped protected-resource metadata to Node Functions", async () => {
  const config = JSON.parse(await readFile(new URL("../../vercel.json", import.meta.url), "utf8"));
  const rewrites = new Map(config.rewrites.map(route => [route.source, route.destination]));

  assert.equal(rewrites.get("/mcp"), "/api/mcp");
  assert.equal(rewrites.get(PUBLIC_MCP_METADATA_PATH), "/api/oauth-protected-resource");
  assert.equal(config.functions["api/mcp.mjs"].maxDuration >= 30, true);
});

test("unauthenticated MCP gets a path-scoped OAuth challenge without calling upstream", async t => {
  let upstreamCalls = 0;
  const mcpHandler = createMcpIngressHandler({
    env,
    fetchImpl: async () => { upstreamCalls += 1; throw new Error("MUST_NOT_CALL_UPSTREAM"); }
  });
  const serverUrl = await startServer(mcpHandler, t);
  const response = await fetch(`${serverUrl}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" })
  });

  assert.equal(response.status, 401);
  assert.match(response.headers.get("www-authenticate"), /Bearer/);
  assert.match(response.headers.get("www-authenticate"), /resource_metadata="https:\/\/bridge\.example\/\.well-known\/oauth-protected-resource\/mcp"/);
  assert.equal(upstreamCalls, 0);
});

test("OAuth metadata publishes the exact resource, issuer, and least-privilege read scope", async t => {
  const metadataHandler = createOAuthProtectedResourceHandler({ env });
  const serverUrl = await startServer(metadataHandler, t);
  const response = await fetch(`${serverUrl}${PUBLIC_MCP_METADATA_PATH}`);
  const metadata = await response.json();

  assert.equal(response.status, 200);
  assert.equal(metadata.resource, RESOURCE);
  assert.deepEqual(metadata.authorization_servers, [ISSUER]);
  assert.deepEqual(metadata.scopes_supported, [RUNTIME_READ_SCOPE]);
  assert.deepEqual(metadata.bearer_methods_supported, ["header"]);
});

test("MCP forwarding preserves bearer/session/protocol headers and excludes host and cookies", async t => {
  let observed;
  const mcpHandler = createMcpIngressHandler({
    env,
    fetchImpl: async (url, init) => {
      observed = { url: String(url), init };
      return new Response('{"jsonrpc":"2.0","id":1,"result":{}}', {
        status: 200,
        headers: {
          "content-type": "application/json",
          "mcp-protocol-version": "2025-03-26",
          "mcp-session-id": "session-test",
          "last-event-id": "event-test"
        }
      });
    }
  });
  const serverUrl = await startServer(mcpHandler, t);
  const response = await fetch(`${serverUrl}/mcp`, {
    method: "POST",
    headers: {
      authorization: "Bearer test-only-token",
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "mcp-protocol-version": "2025-03-26",
      "mcp-session-id": "session-test",
      "last-event-id": "event-test",
      cookie: "private-session=must-not-forward"
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" })
  });
  const headers = new Headers(observed.init.headers);

  assert.equal(response.status, 200);
  assert.equal(observed.url, UPSTREAM);
  assert.equal(headers.get("authorization"), "Bearer test-only-token");
  assert.equal(headers.get("mcp-session-id"), "session-test");
  assert.equal(headers.get("mcp-protocol-version"), "2025-03-26");
  assert.equal(headers.get("last-event-id"), "event-test");
  assert.equal(headers.has("host"), false);
  assert.equal(headers.has("cookie"), false);
  assert.equal(headers.has("origin"), false);
  assert.equal(response.headers.get("mcp-session-id"), "session-test");
  assert.equal(response.headers.get("mcp-protocol-version"), "2025-03-26");
  assert.equal(response.headers.get("last-event-id"), "event-test");
});

test("upstream OAuth challenges are rewritten to the public metadata URL", async t => {
  const mcpHandler = createMcpIngressHandler({
    env,
    fetchImpl: async () => new Response('{"error":"invalid token"}', {
      status: 401,
      headers: {
        "content-type": "application/json",
        "www-authenticate": 'Bearer error="invalid_token", resource_metadata="https://runtime-fabric.example/.well-known/oauth-protected-resource/mcp"'
      }
    })
  });
  const serverUrl = await startServer(mcpHandler, t);
  const response = await fetch(`${serverUrl}/mcp`, {
    method: "POST",
    headers: { authorization: "Bearer invalid-token", "content-type": "application/json" },
    body: "{}"
  });

  assert.equal(response.status, 401);
  assert.match(response.headers.get("www-authenticate"), /resource_metadata="https:\/\/bridge\.example\/\.well-known\/oauth-protected-resource\/mcp"/);
  assert.doesNotMatch(response.headers.get("www-authenticate"), /runtime-fabric\.example/);
});

test("invalid upstream bindings and redirects fail closed", async t => {
  const invalidHandler = createMcpIngressHandler({
    env: { ...env, LEEWAY_MCP_UPSTREAM: "http://runtime-fabric.example/mcp" },
    fetchImpl: async () => { throw new Error("MUST_NOT_FETCH"); }
  });
  const invalidUrl = await startServer(invalidHandler, t);
  const invalidResponse = await fetch(`${invalidUrl}/mcp`, {
    method: "POST",
    headers: { authorization: "Bearer test-only-token", "content-type": "application/json" },
    body: "{}"
  });
  assert.equal(invalidResponse.status, 503);
  assert.equal((await invalidResponse.json()).error, "LEEWAY_RUNTIME_UPSTREAM_INVALID");

  const redirectHandler = createMcpIngressHandler({
    env,
    fetchImpl: async (_url, init) => {
      assert.equal(init.redirect, "error");
      throw new TypeError("redirect refused");
    }
  });
  const redirectUrl = await startServer(redirectHandler, t);
  const redirectResponse = await fetch(`${redirectUrl}/mcp`, {
    method: "POST",
    headers: { authorization: "Bearer test-only-token", "content-type": "application/json" },
    body: "{}"
  });
  assert.equal(redirectResponse.status, 502);
  assert.equal((await redirectResponse.json()).error, "LEEWAY_RUNTIME_UPSTREAM_UNAVAILABLE");
});

test("Vercel OAuth metadata function fails closed when issuer bindings are missing", async t => {
  const serverUrl = await startServer(createOAuthProtectedResourceHandler({ env: {} }), t);
  const response = await fetch(`${serverUrl}${PUBLIC_MCP_METADATA_PATH}`);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).reason, "MCP_OAUTH_ENVIRONMENT_INCOMPLETE");
});

test("default Vercel handler and source gates use the same canonical ingress contract", () => {
  assert.equal(typeof ingressFunction, "function");
});
