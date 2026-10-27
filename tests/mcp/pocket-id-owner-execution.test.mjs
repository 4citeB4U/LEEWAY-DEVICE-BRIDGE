/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.TEST
TAG: LEEWAY.MCP.OWNER.SCOPED.EXECUTION.TEST.V1
WHO: LeeWay Industries / authorized test engineers
WHAT: Test signed read-vs-execute scopes and canonical command admission over real MCP HTTP
WHEN: 2026-10-27
WHERE: tests/mcp/pocket-id-owner-execution.test.mjs
WHY: Prevent a read-only access token or untrusted startup from granting native execution
HOW: Ephemeral RSA test issuer, real SDK clients, deny-by-default Bridge, no physical device writes
AUTHORITY: TEST_ONLY; no production issuer enrollment, Veritas receipt or permission grant
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { generateKeyPairSync, sign } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Bridge } from '../../packages/protocol/index.mjs';
import { createPocketIdUniversalHandler } from '../../operator/identity/create-pocket-id-universal-handler.mjs';
import { startUniversalPocketIdMcp } from '../../operator/identity/start-universal-pocket-id-mcp.mjs';

function signedOwnerFixture() {
  const issuer = 'https://id.qualified-example.test';
  const resource = 'https://device.qualified-example.test/mcp';
  const ownerSubject = 'owner-qualified';
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const publicJwk = { ...publicKey.export({ format: 'jwk' }), kid: 'scope-test-key', alg: 'RS256', use: 'sig' };
  const fetchImpl = async url => ({
    ok: true,
    json: async () => String(url).endsWith('/openid-configuration')
      ? { issuer, jwks_uri: issuer + '/jwks.json' }
      : { keys: [publicJwk] }
  });
  const enc = v => Buffer.from(JSON.stringify(v)).toString('base64url');
  const token = (scope, overrides = {}) => {
    const now = Math.floor(Date.now() / 1000);
    const claims = {
      iss: issuer, aud: resource, sub: ownerSubject, scope,
      iat: now - 5, exp: now + 300, ...overrides
    };
    const message = enc({ alg: 'RS256', kid: 'scope-test-key', typ: 'at+jwt' }) + '.' + enc(claims);
    return message + '.' + sign('RSA-SHA256', Buffer.from(message), privateKey).toString('base64url');
  };
  return { issuer, resource, ownerSubject, fetchImpl, token };
}

async function harness(t, { executionEnabled }) {
  const auth = signedOwnerFixture();
  const actions = [], receipts = [];
  const bridge = new Bridge([{
    id: 'desktop-test-node',
    grants: ['device.health', 'device.files.write'],
    adapter: {
      discover: async () => ['device.health', 'device.files.write'],
      execute: async (capability, args) => {
        actions.push({ capability, args });
        return { nativeObservation: 'TEST_ONLY', capability };
      }
    }
  }], {
    admission: async ({ capability }) => capability === 'device.health',
    receiptSink: async record => { receipts.push(record); }
  });
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = new URL('http://127.0.0.1:' + server.address().port + '/mcp');
  server.on('request', createPocketIdUniversalHandler({
    ...auth, executionEnabled, allowedHosts: [url.host],
    resolveBridge: async principal => principal?.subject === auth.ownerSubject ? bridge : null
  }));
  const clients = [];
  t.after(async () => {
    await Promise.all(clients.map(client => client.close()));
    await new Promise(resolve => server.close(resolve));
  });
  async function connect(token) {
    const client = new Client({ name: 'scope-qualification', version: '1.0' });
    clients.push(client);
    await client.connect(new StreamableHTTPClientTransport(url, {
      requestInit: { headers: { Authorization: 'Bearer ' + token } }
    }));
    return client;
  }
  return { auth, url, connect, actions, receipts };
}
const decoded = value => JSON.parse(value.content[0].text);

test('owner Pocket ID scopes do not elevate discovery credentials', async t => {
  const f = await harness(t, { executionEnabled: true });
  const read = await f.connect(f.auth.token('device.bridge.read'));
  const execute = await f.connect(f.auth.token('device.bridge.execute'));
  const namesRead = (await read.listTools()).tools.map(x => x.name);
  const namesExecute = (await execute.listTools()).tools.map(x => x.name);
  assert.deepEqual(namesRead.sort(), ['bridge_capabilities', 'bridge_devices']);
  assert.ok(!namesRead.includes('device_files_write'));
  assert.ok(namesExecute.includes('device_health'));
  assert.ok(namesExecute.includes('device_files_write'));

  const allowed = decoded(await execute.callTool({
    name: 'device_health', arguments: { deviceId: 'desktop-test-node', arguments: {} }
  }));
  assert.equal(allowed.ok, true);
  assert.equal(f.actions.length, 1);
  assert.equal(f.receipts.filter(x => x.outcome === 'ADMITTED').length, 1);

  const denied = decoded(await execute.callTool({
    name: 'device_files_write',
    arguments: { deviceId: 'desktop-test-node', arguments: { path: 'do-not-write.txt', text: 'blocked' } }
  }));
  assert.equal(denied.error, 'ADMISSION_DENIED');
  assert.equal(f.actions.length, 1);
});
test('execution token cannot promote a discovery-only deployment', async t => {
  const f = await harness(t, { executionEnabled: false });
  await assert.rejects(f.connect(f.auth.token('device.bridge.execute')));
  const read = await f.connect(f.auth.token('device.bridge.read'));
  assert.deepEqual((await read.listTools()).tools.map(x => x.name).sort(),
    ['bridge_capabilities', 'bridge_devices']);
  assert.equal(f.actions.length, 0);
});
test('wrong owner and unsigned permissions cannot authenticate', async t => {
  const f = await harness(t, { executionEnabled: true });
  await assert.rejects(f.connect(f.auth.token('device.bridge.execute', { sub: 'attacker' })));
  await assert.rejects(f.connect(f.auth.token('invalid.scope')));
  assert.equal(f.actions.length, 0);
});
test('startup refuses command exposure without verified host-injected Runtime composition', async () => {
  await assert.rejects(
    startUniversalPocketIdMcp({ enableExecution: true, port: 4272 }),
    /TRUSTED_RUNTIME_COMPOSITION_REQUIRED/
  );
  await assert.rejects(
    startUniversalPocketIdMcp({ enableExecution: 'true', port: 4272 }),
    /INVALID_MCP_EXECUTION_MODE/
  );
});
