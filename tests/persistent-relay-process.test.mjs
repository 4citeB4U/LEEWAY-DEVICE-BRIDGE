/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.RELAY.PERSISTENT.TEST
WHAT: Exercise the real persistent relay entrypoint, Rust registry adapter, and universal command round trip.
WHY: In-process relay tests alone do not prove the deployable process composition.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { WebSocket } from 'ws';

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

function open(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.once('open', () => resolve(socket));
    socket.once('error', reject);
  });
}

function nextMessage(socket) {
  return new Promise((resolve, reject) => {
    socket.once('message', raw => resolve(JSON.parse(raw.toString('utf8'))));
    socket.once('error', reject);
  });
}

function waitForListening(child) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('PERSISTENT_RELAY_START_TIMEOUT')), 10_000);
    child.once('error', reject);
    child.once('exit', code => reject(new Error(`PERSISTENT_RELAY_EXIT_${code}`)));
    child.stdout.on('data', raw => {
      if (raw.toString('utf8').includes('[LEEWAY-PERSISTENT-RELAY] listening')) {
        clearTimeout(timer);
        resolve();
      }
    });
  });
}

test('deployable persistent relay binds the Rust registry and routes an arbitrary enrolled node', async () => {
  const root = path.resolve(import.meta.dirname, '..');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'leeway-persistent-relay-'));
  const registryPath = path.join(temp, 'trusted-device-registry.json');
  const deviceId = 'future-field-node-4096';
  const token = 'persistent-mesh-token-0123456789';
  const port = await reservePort();
  fs.writeFileSync(registryPath, JSON.stringify({ devices: [{
    deviceId,
    platform: 'future',
    publicKey: `ed25519:${'a'.repeat(64)}`,
    admitted: true,
  }] }));

  const child = spawn(process.execPath, [path.join(root, 'operator', 'persistent-relay-server.mjs')], {
    cwd: root,
    env: {
      ...process.env,
      LEEWAY_RELAY_HOST: '127.0.0.1',
      LEEWAY_RELAY_PORT: String(port),
      LEEWAY_MESH_TOKEN: token,
      LEEWAY_TRUSTED_DEVICE_REGISTRY_PATH: registryPath,
      LEEWAY_CORE_BIN: path.join(root, 'target', 'release', process.platform === 'win32' ? 'leeway-core.exe' : 'leeway-core'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  let phone;
  let client;
  try {
    await waitForListening(child);
    const health = await fetch(`http://127.0.0.1:${port}/api/device-relay`).then(response => response.json());
    assert.equal(health.volatileRoomState, false);

    const url = `ws://127.0.0.1:${port}/api/device-relay`;
    phone = await open(url);
    client = await open(url);
    phone.send(JSON.stringify({ type: 'hello', role: 'phone', deviceId, token }));
    assert.equal((await nextMessage(phone)).deliveryMode, 'PROCESS_PERSISTENT_WEBSOCKET_V1');
    client.send(JSON.stringify({ type: 'hello', role: 'client', deviceId, token }));
    assert.equal((await nextMessage(client)).admissionAuthority, 'TRUSTED_RUNTIME_DEVICE_REGISTRY');

    client.send(JSON.stringify({ type: 'command', id: 'process-bound-command', capability: 'device.health', arguments: {} }));
    assert.equal((await nextMessage(phone)).id, 'process-bound-command');
    phone.send(JSON.stringify({ type: 'result', id: 'process-bound-command', capability: 'device.health', ok: true, result: { alive: true } }));
    assert.deepEqual(await nextMessage(client), {
      type: 'result', id: 'process-bound-command', capability: 'device.health', ok: true, result: { alive: true },
    });
  } finally {
    phone?.terminate();
    client?.terminate();
    child.kill();
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
