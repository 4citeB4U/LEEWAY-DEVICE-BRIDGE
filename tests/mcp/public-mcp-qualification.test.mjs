/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.PUBLIC.INGRESS.TEST
TAG: LEEWAY.MCP.PUBLIC_OAUTH_DISCOVERY.QUALIFIER.TEST.V1
WHO: LeeWay Industries
WHAT: Verify the public MCP qualification gate is strict about resource, issuer, and SSO redirects
WHEN: 2026-10-26
WHERE: tests/mcp/public-mcp-qualification.test.mjs
WHY: A workflow warning or Vercel login page must never count as OAuth qualification
HOW: Deterministic fetch fixtures; no credentials or external calls
AUTHORITY: Test fixture only
LICENSE: MIT
*/
import assert from "node:assert/strict";
import test from "node:test";
import { qualifyPublicMcpEndpoint } from "../../operator/identity/qualify-public-mcp-endpoint.mjs";

const endpoint = "https://bridge.example/mcp";
const issuer = "https://pocket-id.example:10000";
const metadataUrl = "https://bridge.example/.well-known/oauth-protected-resource/mcp";
const discoveryUrl = `${issuer}/.well-known/openid-configuration`;
const jwksUrl = `${issuer}/.well-known/jwks.json`;

function mockFetch({
  status = 401,
  challenge = `Bearer resource_metadata="${metadataUrl}"`,
  metadata,
  discovery = {
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/api/oidc/token`,
    jwks_uri: jwksUrl
  },
  jwks = { keys: [{ kty: "RSA", kid: "fixture" }] }
} = {}) {
  const calls = [];
  return {
    calls,
    fetchImpl: async (url, init = {}) => {
      calls.push({ url: String(url), init });
      if (String(url) === endpoint) {
        return new Response("unauthorized", {
          status,
          headers: challenge ? { "www-authenticate": challenge } : {}
        });
      }
      if (String(url) === metadataUrl) {
        return Response.json(metadata || {
          resource: endpoint,
          authorization_servers: [issuer],
          scopes_supported: ["read:runtime"],
          bearer_methods_supported: ["header"]
        });
      }
      if (String(url) === discoveryUrl) return Response.json(discovery);
      if (String(url) === jwksUrl) return Response.json(jwks);
      throw new Error("UNEXPECTED_URL");
    }
  };
}

test("public qualification accepts exact OAuth resource metadata and never sends a bearer token", async () => {
  const fixture = mockFetch();
  const result = await qualifyPublicMcpEndpoint({ endpoint, expectedIssuer: issuer, fetchImpl: fixture.fetchImpl });

  assert.equal(result.status, "PASS");
  assert.equal(result.checks.pocketIdDiscovery, "PASS");
  assert.equal(result.checks.pocketIdJwks, "PASS");
  assert.equal(result.checks.authenticatedMcpCall, "NOT_RUN");
  assert.equal(result.checks.deviceExecution, "NOT_PROBED");
  assert.equal(fixture.calls.length, 4);
  assert.equal(fixture.calls.every(({ init }) => !new Headers(init.headers).has("authorization")), true);
  assert.equal(fixture.calls.every(({ init }) => init.redirect === "manual"), true);
});

test("qualification verifies live OIDC discovery and issuer-origin JWKS", async () => {
  const wrongIssuer = mockFetch({ discovery: { issuer: "https://other-id.example" } });
  await assert.rejects(
    qualifyPublicMcpEndpoint({ endpoint, expectedIssuer: issuer, fetchImpl: wrongIssuer.fetchImpl }),
    /OIDC_DISCOVERY_ISSUER_MISMATCH/
  );

  const wrongJwksOrigin = mockFetch({
    discovery: {
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/api/oidc/token`,
      jwks_uri: "https://keys.other.example/jwks.json"
    }
  });
  await assert.rejects(
    qualifyPublicMcpEndpoint({ endpoint, expectedIssuer: issuer, fetchImpl: wrongJwksOrigin.fetchImpl }),
    /OIDC_JWKS_URI_ORIGIN_MISMATCH/
  );
});

test("qualification rejects Vercel SSO redirects instead of following them", async () => {
  const fixture = mockFetch({ status: 302 });
  await assert.rejects(
    qualifyPublicMcpEndpoint({ endpoint, expectedIssuer: issuer, fetchImpl: fixture.fetchImpl }),
    /UNAUTHENTICATED_MCP_EXPECTED_401_GOT_302/
  );
});

test("qualification fails closed on missing challenge, wrong resource, issuer, or scope", async () => {
  const noChallenge = mockFetch({ challenge: "" });
  await assert.rejects(
    qualifyPublicMcpEndpoint({ endpoint, expectedIssuer: issuer, fetchImpl: noChallenge.fetchImpl }),
    /OAUTH_BEARER_CHALLENGE_METADATA_MISMATCH/
  );

  for (const metadata of [
    { resource: "https://other.example/mcp", authorization_servers: [issuer], scopes_supported: ["read:runtime"] },
    { resource: endpoint, authorization_servers: ["https://other-id.example"], scopes_supported: ["read:runtime"] },
    { resource: endpoint, authorization_servers: [issuer], scopes_supported: ["openid"] }
  ]) {
    const fixture = mockFetch({ metadata });
    await assert.rejects(
      qualifyPublicMcpEndpoint({ endpoint, expectedIssuer: issuer, fetchImpl: fixture.fetchImpl }),
      /OAUTH_METADATA_(RESOURCE_MISMATCH|ISSUER_MISMATCH|SCOPE_MISSING)/
    );
  }
});

test("qualification refuses unsafe endpoints and non-MCP paths", async () => {
  await assert.rejects(
    qualifyPublicMcpEndpoint({ endpoint: "http://bridge.example/mcp", expectedIssuer: issuer }),
    /MCP_ENDPOINT_UNSAFE_URL/
  );
  await assert.rejects(
    qualifyPublicMcpEndpoint({ endpoint: "https://bridge.example/api/mcp", expectedIssuer: issuer }),
    /MCP_ENDPOINT_MUST_END_IN_MCP/
  );
});
