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
import { spawn, spawnSync } from 'node:child_process';
import { generateKeyPairSync, sign, createHash } from 'node:crypto';
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
    let stderr='';
    const timer = setTimeout(() => reject(new Error('PERSISTENT_RELAY_START_TIMEOUT')), 10_000);
    child.once('error', reject);
    child.stderr.on('data', raw => { stderr+=raw.toString('utf8'); });
    child.once('exit', code => reject(new Error(`PERSISTENT_RELAY_EXIT_${code}:${stderr.slice(0,1000)}`)));
    child.stdout.on('data', raw => {
      if (raw.toString('utf8').includes('[LEEWAY-PERSISTENT-RELAY] listening')) {
        clearTimeout(timer);
        resolve();
      }
    });
  });
}

test('deployable persistent relay binds the Rust registry and authenticates an arbitrary enrolled node key', async t => {
  const root = path.resolve(import.meta.dirname, '..');
  let binary = path.join(root, 'target', 'release', process.platform === 'win32' ? 'leeway-core.exe' : 'leeway-core');
  let preflight = spawnSync(binary, ['registry-list', '--registry', path.join(root, 'registry', 'trusted-device-registry.json')], {
    encoding: 'utf8', windowsHide: true,
  });
  if (process.platform === 'win32' && preflight.error?.code === 'UNKNOWN') {
    t.diagnostic('HOST_APPLICATION_CONTROL_BLOCKED_UNSIGNED_RELEASE_BINARY; exercising the locally executable debug build');
    binary = path.join(root, 'target', 'debug', 'leeway-core.exe');
    preflight = spawnSync(binary, ['registry-list', '--registry', path.join(root, 'registry', 'trusted-device-registry.json')], {
      encoding: 'utf8', windowsHide: true,
    });
  }
  assert.equal(preflight.status, 0, preflight.stderr || preflight.error?.message);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'leeway-persistent-relay-'));
  const registryPath = path.join(temp, 'trusted-device-registry.json');
  const deviceId = 'future-field-node-4096';
  const token = 'persistent-mesh-token-0123456789';
  const port = await reservePort();
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  fs.writeFileSync(registryPath, JSON.stringify({ devices: [{
    deviceId,
    platform: 'future',
    publicKey: publicKeyPem,
    meshTokenSha256: createHash('sha256').update(token).digest('hex'),
    identityVerified: true,
    registrationState: 'TRUSTED_REGISTRY_READ',
    registrationAuthority: 'TRUSTED_RUNTIME_DEVICE_REGISTRY',
  }] }));

  const child = spawn(process.execPath, [path.join(root, 'operator', 'persistent-relay-server.mjs')], {
    cwd: root,
    env: {
      ...process.env,
      LEEWAY_RELAY_HOST: '127.0.0.1',
      LEEWAY_RELAY_PORT: String(port),
      LEEWAY_MESH_TOKEN: token,
      LEEWAY_TRUSTED_DEVICE_REGISTRY_PATH: registryPath,
      LEEWAY_CORE_BIN: binary,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  let phone;
  try {
    await waitForListening(child);
    const health = await fetch(`http://127.0.0.1:${port}/api/device-relay`).then(response => response.json());
    assert.equal(health.volatileRoomState, false);

    const url = `ws://127.0.0.1:${port}/api/device-relay`;
    phone = await open(url);
    phone.send(JSON.stringify({ type: 'hello', role: 'phone', deviceId, token, publicKey: publicKeyPem }));
    const challenge = await nextMessage(phone);
    const payload = Buffer.from(`leeway-device-relay-proof-v1\n${deviceId}\n${challenge.nonce}`);
    phone.send(JSON.stringify({ type: 'hello-proof', signature: sign(null, payload, privateKey).toString('base64url') }));
    assert.equal((await nextMessage(phone)).deliveryMode, 'PROCESS_PERSISTENT_WEBSOCKET_V1');
  } finally {
    phone?.terminate();
    child.kill();
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
