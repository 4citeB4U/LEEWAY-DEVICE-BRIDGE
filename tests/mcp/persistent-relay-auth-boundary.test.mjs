/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.PUBLIC.RELAY.TEST
TAG: LEEWAY.RELAY.MCP.AUTH_BOUNDARY.TEST.V1
WHO: LeeWay Industries / W01 repair reviewers
WHAT: Prove the persistent relay denies unauthenticated MCP and device-metadata reads
WHY: Public Funnel reachability must not bypass the existing owner-scoped read authority
WHERE: tests/mcp/persistent-relay-auth-boundary.test.mjs
WHEN: 2026-11-12 America/Chicago
HOW: Ephemeral loopback relay with injected read policy; no physical device or external issuer
AUTHORITY: Source/integration test only; not production, Veritas, registration or receipt proof
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createDeviceRelayServer } from '../../api/device-relay.mjs';
import { createRelayMcpAccessPolicy } from '../../operator/identity/relay-mcp-access-policy.mjs';

const resource = 'https://bridge.example.test/mcp';
const metadataUrl = 'https://bridge.example.test/.well-known/oauth-protected-resource/mcp';
const issuer = 'https://identity.example.test';
const acceptedToken = 'Bearer test-owner-read-token';

function policy(authenticate) {
  return Object.freeze({
    configured: true,
    resource,
    metadataUrl,
    issuer,
    scopes: Object.freeze(['device.bridge.read']),
    authenticate,
  });
}

async function fixture(mcpAccessPolicy = null) {
  const relay = createDeviceRelayServer({ mcpAccessPolicy });
  relay.server.listen(0, '127.0.0.1');
  await once(relay.server, 'listening');
  const { port } = relay.server.address();
  return {
    relay,
    base: `http://127.0.0.1:${port}`,
    async close() {
      relay.server.close();
      await once(relay.server, 'close');
    },
  };
}

function rpc(method, params = {}) {
  return JSON.stringify({ jsonrpc: '2.0', id: 1, method, params });
}

async function post(base, body, authorization) {
  return fetch(`${base}/mcp`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(authorization ? { authorization } : {}),
    },
    body,
  });
}

test('relay policy reuses the configured canonical resource and fails closed when enrollment is absent', () => {
  assert.deepEqual(createRelayMcpAccessPolicy({ env: {} }), {
    configured: false,
    reason: 'MCP_OAUTH_ENVIRONMENT_INCOMPLETE',
  });
  assert.deepEqual(createRelayMcpAccessPolicy({ env: {
    LEEWAY_MCP_AUTH_ISSUER: issuer,
    LEEWAY_MCP_AUDIENCE: resource,
  } }), {
    configured: false,
    reason: 'MCP_OWNER_SUBJECT_UNBOUND',
  });
  const configured = createRelayMcpAccessPolicy({ env: {
    LEEWAY_MCP_AUTH_ISSUER: issuer,
    LEEWAY_MCP_AUDIENCE: resource,
    LEEWAY_MCP_OWNER_SUB: 'owner-123',
  } });
  assert.equal(configured.configured, true);
  assert.equal(configured.resource, resource);
  assert.equal(configured.issuer, issuer);
  assert.deepEqual(configured.scopes, ['device.bridge.read']);
  assert.equal(typeof configured.authenticate, 'function');
});

test('unbound relay read authority fails closed without stopping relay HTTP', async t => {
  const f = await fixture();
  t.after(() => f.close());
  const mcp = await post(f.base, rpc('tools/list'));
  assert.equal(mcp.status, 503);
  assert.equal((await mcp.json()).error, 'MCP_READ_AUTHORITY_UNBOUND');
  const devices = await fetch(`${f.base}/api/devices`);
  assert.equal(devices.status, 503);
});

test('unauthenticated and rejected credentials cannot list or dispatch relay tools', async t => {
  let calls = 0;
  const f = await fixture(policy(async req => {
    calls += 1;
    return req.headers.authorization === acceptedToken;
  }));
  t.after(() => f.close());

  for (const [body, authorization] of [
    [rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1' } }), undefined],
    [rpc('tools/list'), 'Bearer rejected-token'],
    [rpc('tools/call', { name: 'bridge_devices', arguments: {} }), undefined],
  ]) {
    const response = await post(f.base, body, authorization);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('www-authenticate'), `Bearer resource_metadata="${metadataUrl}"`);
    assert.equal((await response.json()).error, 'MCP_READ_AUTHORIZATION_REQUIRED');
  }
  assert.equal(calls, 3);
});

test('owner-scoped read policy admits bounded discovery while metadata stays least privilege', async t => {
  const f = await fixture(policy(async req => req.headers.authorization === acceptedToken));
  t.after(() => f.close());

  const metadata = await fetch(`${f.base}/.well-known/oauth-protected-resource/mcp`);
  assert.equal(metadata.status, 200);
  assert.deepEqual(await metadata.json(), {
    resource,
    authorization_servers: [issuer],
    scopes_supported: ['device.bridge.read'],
    bearer_methods_supported: ['header'],
    resource_documentation: 'https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE',
  });

  const listing = await post(f.base, rpc('tools/list'), acceptedToken);
  assert.equal(listing.status, 200);
  const listingBody = await listing.json();
  assert.ok(listingBody.result.tools.some(tool => tool.name === 'bridge_devices'));

  const devices = await fetch(`${f.base}/api/devices`, { headers: { authorization: acceptedToken } });
  assert.equal(devices.status, 200);
  assert.equal((await devices.json()).ok, true);
});
