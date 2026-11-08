/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.TEST
TAG: TRUSTED-REGISTRY-DEVICE-DISCOVERY
WHAT: Prove adapter configuration cannot masquerade as registered-device identity
WHY: Device enumeration must be neutral across hosts and list only trusted Runtime registry entries
HOW: Real MCP SDK calls with isolated adapters and injected registry fixtures
LICENSE: Internal LeeWay governance.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Bridge } from '../../packages/protocol/index.mjs';
import { createServer } from '../../apps/desktop/mcp-server.mjs';

async function readDevices(t, bridge) {
  const server = createServer(bridge);
  const client = new Client({ name: 'registered-device-discovery-test', version: '1' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  t.after(async () => { await client.close(); await server.close(); });
  const response = await client.callTool({ name: 'bridge_devices', arguments: {} });
  return JSON.parse(response.content[0].text);
}

test('unbound registration authority lists no configured adapter as a device', async t => {
  const bridge = new Bridge([{
    id: 'development-adapter', grants: ['device.health'],
    adapter: { discover: async () => ['device.health'], execute: async () => ({ ok: true }) },
  }], { admission: async () => false, receiptSink: async () => {} });

  const result = await readDevices(t, bridge);
  assert.deepEqual(result.devices, []);
  assert.equal(result.registrationState, 'REGISTRATION_AUTHORITY_UNBOUND');
  assert.equal(result.registrationAuthority, null);
  assert.equal(result.reachability, 'NOT_PROBED');
});

test('only registered IDs with usable configured adapters are listed', async t => {
  const bridge = new Bridge([
    { id: 'adapter-alpha', grants: ['device.health'], adapter: { discover: async () => ['device.health'], execute: async () => ({}) } },
    { id: 'adapter-beta', grants: ['device.health'], adapter: { discover: async () => ['device.health'], execute: async () => ({}) } },
  ], {
    admission: async () => false,
    receiptSink: async () => {},
    deviceRegistry: new Map([
      ['adapter-alpha', { platform: 'portable-platform' }],
      ['registry-only', { platform: 'other-platform' }],
      ['adapter-beta', {}],
    ]),
  });

  const result = await readDevices(t, bridge);
  assert.deepEqual(result.devices, ['adapter-alpha']);
  assert.equal(result.registrationState, 'TRUSTED_REGISTRY_READ');
  assert.equal(result.registrationAuthority, 'TRUSTED_RUNTIME_DEVICE_REGISTRY');
  assert.equal(result.reachability, 'NOT_PROBED');
});

test('legacy configured IDs are not synthesized into the production admission registry', async () => {
  const { createProductionAdmission } = await import('../../apps/desktop/mcp-server.mjs');
  const admission = createProductionAdmission([
    { id: 'adapter-only', platform: 'portable-platform' },
  ], {
    adapterRegistry: { adapters: [{ platform: 'portable-platform', capabilities: { 'device.health': { state: 'AVAILABLE' } } }] },
    formulaPreGate: async () => true,
    veritasPreGate: async () => true,
  });

  assert.equal(await admission({ deviceId: 'adapter-only', capability: 'device.health', args: {} }), false);
});
