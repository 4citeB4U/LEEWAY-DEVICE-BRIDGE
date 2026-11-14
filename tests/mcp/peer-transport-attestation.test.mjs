/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.PEER.TRANSPORT.TEST
TAG: LEEWAY.BRIDGE.PEER.TRANSPORT.ATTESTATION.TEST.V1
WHAT: Verify that relay observations can inform Continuum without claiming an
      unobserved offline/LAN peer path or executing a file transfer.
WHY: Shared-owner portable devices need a truthful seam between Device Bridge
     admission and Continuum route planning.
HOW: Isolated trusted-registry relay rooms plus owner-scoped MCP read policy.
AUTHORITY: Source/integration test only; not a physical peer-transfer proof.
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { createDeviceRelayServer } from '../../api/device-relay.mjs';

const ownerToken = 'Bearer owner-read-token';
const ownerSubject = 'stable-owner-subject-001';
const sourceDeviceId = 'portable-windows-node-01';
const targetDeviceId = 'portable-android-node-02';

function registry(owner = ownerSubject) {
  const record = (deviceId, platform) => ({
    identityVerified: true,
    registrationState: 'TRUSTED_REGISTRY_READ',
    registrationAuthority: 'TRUSTED_RUNTIME_DEVICE_REGISTRY',
    ownerSubject: owner,
    platform,
  });
  return new Map([
    [sourceDeviceId, record(sourceDeviceId, 'windows')],
    [targetDeviceId, record(targetDeviceId, 'android')],
  ]);
}

async function fixture(deviceRegistry = registry()) {
  const relay = createDeviceRelayServer({
    requireTrustedEnrollment: true,
    deviceRegistry,
    mcpAccessPolicy: {
      configured: true,
      resource: 'https://bridge.example.test/mcp', metadataUrl: 'https://bridge.example.test/.well-known/oauth-protected-resource/mcp',
      issuer: 'https://identity.example.test', scopes: ['device.bridge.read'],
      authenticate: async req => req.headers.authorization === ownerToken,
    },
  });
  relay.server.listen(0, '127.0.0.1');
  await once(relay.server, 'listening');
  const port = relay.server.address().port;
  return {
    relay, base: `http://127.0.0.1:${port}`, ws: `ws://127.0.0.1:${port}/api/device-relay`,
    async close() {
      for (const client of relay.wss.clients) client.close();
      relay.server.close();
      await once(relay.server, 'close');
    },
  };
}

async function connectPhone(url, deviceId) {
  const socket = new WebSocket(url);
  await once(socket, 'open');
  socket.send(JSON.stringify({ type: 'hello', role: 'phone', deviceId, token: `pairing-token-${deviceId}-0123456789` }));
  const [raw] = await once(socket, 'message');
  assert.equal(JSON.parse(raw.toString()).type, 'hello-ack');
  return socket;
}

async function invoke(base, args) {
  const response = await fetch(`${base}/mcp`, {
    method: 'POST', headers: { authorization: ownerToken, 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'bridge_peer_transport', arguments: args } }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  return { body, value: JSON.parse(body.result.content[0].text) };
}

test('attestation reports shared enrollment and relay presence without manufacturing local-peer transfer', async t => {
  const f = await fixture();
  t.after(() => f.close());
  const source = await connectPhone(f.ws, sourceDeviceId);
  const target = await connectPhone(f.ws, targetDeviceId);
  t.after(() => { source.close(); target.close(); });

  const { value } = await invoke(f.base, { sourceDeviceId, targetDeviceId });
  assert.equal(value.ok, true);
  assert.equal(value.ownerBinding, 'SHARED_VERIFIED_OWNER');
  assert.equal(value.relay.state, 'AVAILABLE_OWNER_BOUND_WSS');
  assert.equal(value.directPeer.state, 'NOT_OBSERVED');
  assert.equal(value.lanPeer.state, 'NOT_OBSERVED');
  assert.equal(value.continuum.fileTransferExecution, 'NOT_EXECUTED');
});

test('attestation fails closed for unshared owners and malformed pairs', async t => {
  const mixed = registry();
  mixed.get(targetDeviceId).ownerSubject = 'different-owner-subject-002';
  const f = await fixture(mixed);
  t.after(() => f.close());
  const denied = await invoke(f.base, { sourceDeviceId, targetDeviceId });
  assert.equal(denied.body.result.isError, true);
  assert.equal(denied.value.error, 'PEER_SHARED_OWNER_REQUIRED');

  const invalid = await invoke(f.base, { sourceDeviceId, targetDeviceId: sourceDeviceId });
  assert.equal(invalid.body.result.isError, true);
  assert.equal(invalid.value.error, 'PEER_DEVICE_PAIR_INVALID');
});
