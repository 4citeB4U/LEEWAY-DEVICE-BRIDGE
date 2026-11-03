import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { createDeviceRelayServer } from '../api/device-relay.mjs';

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

async function closeRelay(relay) {
  for (const socket of relay.wss.clients) socket.close();
  await new Promise(resolve => relay.server.close(() => resolve()));
}

function open(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.once('open', () => resolve(socket));
    socket.once('error', reject);
  });
}

function nextMessage(socket, timeoutMs = 2_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('message timeout'));
    }, timeoutMs);
    const onMessage = value => { cleanup(); resolve(JSON.parse(value.toString('utf8'))); };
    const onError = error => { cleanup(); reject(error); };
    const cleanup = () => {
      clearTimeout(timer);
      socket.off('message', onMessage);
      socket.off('error', onError);
    };
    socket.on('message', onMessage);
    socket.on('error', onError);
  });
}

function fakeStore() {
  const tokens = new Map();
  const owners = new Map();
  const pending = new Map();
  const completed = new Set();
  const inboxes = new Map();
  return {
    kind: 'FAKE_REDIS',
    durable: true,
    async claimToken(deviceId, hash) {
      if (!tokens.has(deviceId)) tokens.set(deviceId, hash);
      return tokens.get(deviceId) === hash;
    },
    async tokenMatches(deviceId, hash) { return tokens.get(deviceId) === hash; },
    async getOwner(deviceId, role) { return owners.get(`${deviceId}:${role}`) || null; },
    async setOwner(deviceId, role, nodeId) { owners.set(`${deviceId}:${role}`, nodeId); },
    async removeOwner(deviceId, role, nodeId) {
      const ownerKey = `${deviceId}:${role}`;
      if (owners.get(ownerKey) === nodeId) owners.delete(ownerKey);
    },
    async touch() {},
    async claimPending(deviceId, id, value) {
      const pendingKey = `${deviceId}:${id}`;
      if (pending.has(pendingKey) || completed.has(pendingKey)) return false;
      pending.set(pendingKey, value);
      return true;
    },
    async takePending(deviceId, id) {
      const pendingKey = `${deviceId}:${id}`;
      const value = pending.get(pendingKey) || null;
      pending.delete(pendingKey);
      return value;
    },
    async markCompleted(deviceId, id) {
      const pendingKey = `${deviceId}:${id}`;
      if (completed.has(pendingKey)) return false;
      completed.add(pendingKey);
      return true;
    },
    async pushInbox(nodeId, message) {
      const inbox = inboxes.get(nodeId) || [];
      inbox.push(message);
      inboxes.set(nodeId, inbox);
    },
    async popInbox(nodeId) {
      const inbox = inboxes.get(nodeId) || [];
      const message = inbox.shift() || null;
      inboxes.set(nodeId, inbox);
      return message;
    },
  };
}

test('durable relay forwards across two relay instances sharing state', async () => {
  const store = fakeStore();
  const relayA = createDeviceRelayServer({ store, requireDurable: true });
  const relayB = createDeviceRelayServer({ store, requireDurable: true });
  const portA = await listen(relayA.server);
  const portB = await listen(relayB.server);
  const phone = await open(`ws://127.0.0.1:${portA}/api/device-relay`);
  const client = await open(`ws://127.0.0.1:${portB}/api/device-relay`);
  const token = 'durable-test-token-0123456789';
  const deviceId = 'fold6-durable-test';

  try {
    phone.send(JSON.stringify({ type: 'hello', role: 'phone', deviceId, token }));
    assert.deepEqual(await nextMessage(phone), {
      type: 'hello-ack',
      role: 'phone',
      deliveryMode: 'VERCEL_FUNCTION_WEBSOCKET_REDIS_POLL_V1',
      volatileRoomState: false,
      authority: 'TRANSPORT_ONLY',
      deviceId,
    });

    client.send(JSON.stringify({ type: 'hello', role: 'client', deviceId, token }));
    assert.deepEqual(await nextMessage(client), {
      type: 'hello-ack',
      role: 'client',
      deliveryMode: 'VERCEL_FUNCTION_WEBSOCKET_REDIS_POLL_V1',
      volatileRoomState: false,
      authority: 'TRANSPORT_ONLY',
      deviceId,
    });

    const command = { type: 'command', id: 'durable-cmd-1', capability: 'device.health', arguments: {} };
    client.send(JSON.stringify(command));
    assert.deepEqual(await nextMessage(phone), command);
    phone.send(JSON.stringify({
      type: 'result',
      id: command.id,
      capability: command.capability,
      ok: true,
      result: { ok: true, running: true },
    }));
    assert.deepEqual(await nextMessage(client), {
      type: 'result',
      id: command.id,
      capability: command.capability,
      ok: true,
      result: { ok: true, running: true },
    });
  } finally {
    phone.close();
    client.close();
    await closeRelay(relayA);
    await closeRelay(relayB);
  }
});

test('production mode fails closed without a durable store', async () => {
  const relay = createDeviceRelayServer({ store: null, requireDurable: true });
  const port = await listen(relay.server);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/device-relay`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      ok: false,
      service: 'leeway-device-bridge-relay',
      error: 'DURABLE_RELAY_STORE_REQUIRED',
      deliveryMode: 'VERCEL_FUNCTION_WEBSOCKET_REDIS_POLL_V1',
      volatileRoomState: true,
      supportsWebSocket: true,
      truthBoundary: 'RUNTIME_OBSERVED_ONLY',
    });
  } finally {
    await closeRelay(relay);
  }
});

