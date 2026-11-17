import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrowserLocalGateway } from '../operator/browser-local-gateway.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const executable = path.join(root, 'target', 'debug', process.platform === 'win32'
  ? 'leeway-browser-native-host.exe'
  : 'leeway-browser-native-host');
const extensionId = 'abcdefghijklmnopabcdefghijklmnop';
const secret = 'browser-native-host-test-secret-0123456789';

function frame(value) {
  const payload = Buffer.from(JSON.stringify(value), 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(payload.length);
  return Buffer.concat([header, payload]);
}

async function readFrame(stream) {
  let buffer = Buffer.alloc(0);
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
    if (buffer.length < 4) continue;
    const length = buffer.readUInt32LE(0);
    if (buffer.length >= length + 4) return JSON.parse(buffer.subarray(4, length + 4).toString('utf8'));
  }
  throw new Error('NATIVE_HOST_RESPONSE_MISSING');
}

test('compiled Rust native host obtains a one-use session from the real loopback gateway', async t => {
  const gateway = createBrowserLocalGateway({
    port: 4280,
    nativeHostSecret: secret,
    allowedExtensionIds: [extensionId],
  });
  await gateway.listen();
  t.after(() => gateway.close());

  const child = spawn(executable, [], {
    cwd: root,
    env: { ...process.env, LEEWAY_BROWSER_GATEWAY_SECRET: secret },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  t.after(() => { if (!child.killed) child.kill(); });
  child.stdin.end(frame({ type: 'LEEWAY_BROWSER_SESSION_REQUEST', extensionId }));
  const response = await readFrame(child.stdout);
  assert.equal(response.type, 'LEEWAY_BROWSER_SESSION', JSON.stringify(response));
  assert.equal(response.wsUrl, 'ws://127.0.0.1:4280/mesh');
  assert.ok(response.sessionToken.length >= 32);
  assert.ok(Date.parse(response.expiresUtc) > Date.now());
  await once(child, 'exit');
});

test('loopback gateway emits bounded content-length JSON for the native host', async t => {
  const gateway = createBrowserLocalGateway({
    port: 0,
    nativeHostSecret: secret,
    allowedExtensionIds: [extensionId],
  });
  const address = await gateway.listen();
  t.after(() => gateway.close());

  const response = await fetch(`http://127.0.0.1:${address.port}/native/session`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ extensionId }),
  });
  const raw = await response.text();
  assert.equal(Number(response.headers.get('content-length')), Buffer.byteLength(raw));
  assert.equal(response.headers.get('transfer-encoding'), null);
  assert.equal(JSON.parse(raw).type, 'LEEWAY_BROWSER_SESSION');
});
