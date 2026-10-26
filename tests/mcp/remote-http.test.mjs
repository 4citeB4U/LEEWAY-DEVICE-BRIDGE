/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE / MCP TRANSPORT TEST
TAG: LEEWAY-DEVICE-BRIDGE-REMOTE-MCP-CONTRACT-TEST-V1
WHO: LeeWay Industries authorized developers.
WHAT: Bounded remote transport authentication and read-only MCP behavior tests.
WHEN: Before any approved public host deployment.
WHERE: tests/mcp/remote-http.test.mjs
WHY: Reject unauthenticated discovery and remote mutation without breaking stdio.
HOW: Loopback Node HTTP fixture with actual SDK request/response messages.
AUTHORITY: Test fixture cannot certify production auth or device execution.
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createRemoteMcpHttpServer } from '../../apps/desktop/remote-mcp-http.mjs';

test('remote MCP fails closed when canonical bridge or authentication callback is absent', () => {
  assert.throws(() => createRemoteMcpHttpServer({ authenticate: async () => true }), /CANONICAL_BRIDGE_REQUIRED/);
  assert.throws(() => createRemoteMcpHttpServer({ bridge: { devices: new Map(), discover: async () => ({}) } }), /AUTHENTICATION_PROVIDER_REQUIRED/);
  assert.throws(() => createRemoteMcpHttpServer({
    bridge: { devices: new Map(), discover: async () => ({}) },
    authenticate: async () => true,
    host: '0.0.0.0',
  }), /REMOTE_PUBLIC_BIND_NOT_QUALIFIED/);
});

test('real SDK HTTP initializes and advertises only canonical discovery tools after authentication', async t => {
  const devices = new Map([['fixture-workstation', {}]]);
  const bridge = {
    devices,
    discover: async id => ({ deviceId: id, capabilities: [{ name: 'device.health', granted: false }] }),
  };
  const server = createRemoteMcpHttpServer({
    bridge,
    authenticate: async req => req.headers.authorization === 'Bearer fixture-owner-token',
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/mcp`;
  const rpc = async (method, id, authorized = true) => fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...(authorized ? { authorization: 'Bearer fixture-owner-token' } : {}),
    },
    body: JSON.stringify({
      jsonrpc: '2.0', id, method,
      ...(method === 'initialize' ? {
        params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1' } },
      } : { params: {} }),
    }),
  });
  assert.equal((await rpc('initialize', 1, false)).status, 401);
  const initialize = await rpc('initialize', 2);
  assert.equal(initialize.status, 200);
  assert.equal((await initialize.json()).result.serverInfo.name, 'leeway-device-bridge');
  const listed = await rpc('tools/list', 3);
  assert.equal(listed.status, 200);
  const tools = (await listed.json()).result.tools.map(tool => tool.name);
  assert.deepEqual(tools.sort(), ['bridge_capabilities', 'bridge_devices']);
  assert.ok(!tools.includes('device_files_write'));
  const denied = await rpc('tools/call', 4);
  assert.notEqual(denied.status, 401);
  // The request lacks a tool name and therefore cannot execute anything.
  assert.equal(devices.size, 1);
});
