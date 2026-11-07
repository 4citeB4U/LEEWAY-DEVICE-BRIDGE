import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { AppleCameraTransport, PhysicalAppleAdapter } from '../operator/physical-adapters.mjs';

const token = '0123456789abcdef0123456789abcdef';

test('Apple camera transport performs an explicit token-authenticated request', async () => {
  const server = net.createServer(socket => {
    let input = '';
    socket.on('data', chunk => {
      input += chunk.toString('utf8');
      if (!input.includes('\n')) return;
      const request = JSON.parse(input.trim());
      assert.equal(request.version, 1);
      assert.equal(request.operation, 'vision.sources.list');
      assert.equal(request.token, token);
      socket.end(JSON.stringify({ ok: true, result: { sources: ['rear'] } }) + '\n');
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const port = server.address().port;
    const transport = new AppleCameraTransport({ endpoint: `tcp://127.0.0.1:${port}`, token, timeoutMs: 2000 });
    assert.deepEqual(await transport.request('vision.sources.list', { clientId: 'test-client' }), {
      ok: true, result: { sources: ['rear'] }
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('Apple camera transport rejects unbound endpoints and weak tokens', () => {
  assert.throws(() => new AppleCameraTransport({ endpoint: 'https://example.invalid', token }), /APPLE_CAMERA_ENDPOINT_INVALID/);
  assert.throws(() => new AppleCameraTransport({ endpoint: 'tcp://127.0.0.1:5323', token: 'short' }), /APPLE_CAMERA_TOKEN_REQUIRED/);
  assert.throws(() => new PhysicalAppleAdapter({ deviceId: '000000000000000000000000', cameraEndpoint: 'tcp://127.0.0.1:5323' }), /APPLE_CAMERA_PAIRING_REQUIRED/);
  const adapter = new PhysicalAppleAdapter({ deviceId: '000000000000000000000000', cameraEndpoint: 'tcp://127.0.0.1:5323', cameraToken: token });
  return adapter.discover().then(capabilities => {
    assert.ok(capabilities.includes('vision.sources.list'));
    assert.ok(capabilities.includes('vision.frames.observe'));
  });
});
