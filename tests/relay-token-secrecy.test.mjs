import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createDeviceRelayServer } from '../api/device-relay.mjs';

const { server } = createDeviceRelayServer();
server.listen(0, '127.0.0.1');
await once(server, 'listening');
try {
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/device-relay`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(JSON.stringify(body).includes('token'), false);
} finally {
  server.close();
  await once(server, 'close');
}

console.log('PASS relay health never discloses pairing tokens');
