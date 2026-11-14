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

function close(server, wss) {
  for (const client of wss.clients) client.close();
  return new Promise(resolve => server.close(() => resolve()));
}

function nextMessage(socket) {
  return new Promise((resolve, reject) => {
    const onMessage = value => {
      cleanup();
      resolve(JSON.parse(value.toString('utf8')));
    };
    const onError = error => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      socket.off('message', onMessage);
      socket.off('error', onError);
    };
    socket.on('message', onMessage);
    socket.on('error', onError);
  });
}

function open(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.once('open', () => resolve(socket));
    socket.once('error', reject);
  });
}

test('relay health and authenticated phone/client command round trip', async () => {
  const relay = createDeviceRelayServer();
  const port = await listen(relay.server);
  const base = 'ws://127.0.0.1:' + port + '/api/device-relay';
  const token = 'test-owner-pairing-token-0123456789';
  const deviceId = 'fold6-test-device';
  const phone = await open(base);
  const client = await open(base);

  try {
    phone.send(JSON.stringify({ type: 'hello', role: 'phone', deviceId, token }));
    assert.deepEqual(await nextMessage(phone), {
      type: 'hello-ack',
      role: 'phone',
      deliveryMode: 'VERCEL_FUNCTION_WEBSOCKET_V1',
      volatileRoomState: true,
      authority: 'TRANSPORT_ONLY',
      deviceId,
    });

    client.send(JSON.stringify({ type: 'hello', role: 'client', deviceId, token }));
    assert.deepEqual(await nextMessage(client), {
      type: 'hello-ack',
      role: 'client',
      deliveryMode: 'VERCEL_FUNCTION_WEBSOCKET_V1',
      volatileRoomState: true,
      authority: 'TRANSPORT_ONLY',
      deviceId,
    });

    const command = { type: 'command', id: 'cmd-1', capability: 'device.health', arguments: {} };
    client.send(JSON.stringify(command));
    assert.deepEqual(await nextMessage(phone), command);
    phone.send(JSON.stringify({
      type: 'result',
      id: 'cmd-1',
      capability: 'device.health',
      ok: true,
      result: { ok: true, running: true },
    }));
    assert.deepEqual(await nextMessage(client), {
      type: 'result',
      id: 'cmd-1',
      capability: 'device.health',
      ok: true,
      result: { ok: true, running: true },
    });

    client.send(JSON.stringify(command));
    assert.deepEqual(await nextMessage(client), { type: 'error', error: 'DUPLICATE_COMMAND_ID' });
  } finally {
    phone.close();
    client.close();
    await close(relay.server, relay.wss);
  }
});

test('wrong token and client-before-phone fail closed', async () => {
  const relay = createDeviceRelayServer();
  const port = await listen(relay.server);
  const base = 'ws://127.0.0.1:' + port + '/api/device-relay';
  const client = await open(base);
  try {
    client.send(JSON.stringify({
      type: 'hello',
      role: 'client',
      deviceId: 'unknown',
      token: 'wrong-token-0123456789',
    }));
    assert.deepEqual(await nextMessage(client), { type: 'error', error: 'PAIRING_REQUIRED' });
  } finally {
    client.close();
    await close(relay.server, relay.wss);
  }
});

test('trusted-enrollment mode rejects an unregistered relay identity before a room exists', async () => {
  const deviceId = 'portable-windows-node';
  const relay = createDeviceRelayServer({
    requireTrustedEnrollment: true,
    deviceRegistry: new Map([[deviceId, {
      identityVerified: true,
      registrationState: 'TRUSTED_REGISTRY_READ',
      registrationAuthority: 'TRUSTED_RUNTIME_DEVICE_REGISTRY',
      platform: 'windows',
    }]]),
  });
  const port = await listen(relay.server);
  const base = 'ws://127.0.0.1:' + port + '/api/device-relay';
  const unknown = await open(base);
  const trusted = await open(base);

  try {
    unknown.send(JSON.stringify({
      type: 'hello', role: 'workstation', deviceId: 'self-asserted-node', token: 'pairing-token-0123456789',
    }));
    assert.deepEqual(await nextMessage(unknown), { type: 'error', error: 'DEVICE_ENROLLMENT_REQUIRED' });
    assert.equal(relay.rooms.has('self-asserted-node'), false);

    trusted.send(JSON.stringify({
      type: 'hello', role: 'phone', deviceId, token: 'pairing-token-0123456789',
    }));
    assert.deepEqual(await nextMessage(trusted), {
      type: 'hello-ack', role: 'phone', deliveryMode: 'VERCEL_FUNCTION_WEBSOCKET_V1',
      volatileRoomState: true, authority: 'TRANSPORT_ONLY', deviceId,
    });
  } finally {
    unknown.close();
    trusted.close();
    await close(relay.server, relay.wss);
  }
});
