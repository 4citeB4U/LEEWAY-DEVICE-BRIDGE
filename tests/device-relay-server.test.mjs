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

async function close(server, wss) {
  for (const client of wss.clients) client.terminate();
  await new Promise(resolve => wss.close(() => resolve()));
  if (server.listening) await new Promise(resolve => server.close(() => resolve()));
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
  const token = 'test-owner-pairing-token-0123456789';
  const deviceId = 'fold6-test-device';
  const relay = createDeviceRelayServer({
    meshToken: token,
    deviceRegistry: new Map([[deviceId, {
      deviceId, platform: 'android', identityVerified: true,
      registrationState: 'TRUSTED_REGISTRY_READ',
      registrationAuthority: 'TRUSTED_RUNTIME_DEVICE_REGISTRY',
    }]]),
  });
  const port = await listen(relay.server);
  const base = 'ws://127.0.0.1:' + port + '/api/device-relay';
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
      admissionAuthority: 'TRUSTED_RUNTIME_DEVICE_REGISTRY',
      deviceId,
    });

    client.send(JSON.stringify({ type: 'hello', role: 'client', deviceId, token }));
    assert.deepEqual(await nextMessage(client), {
      type: 'hello-ack',
      role: 'client',
      deliveryMode: 'VERCEL_FUNCTION_WEBSOCKET_V1',
      volatileRoomState: true,
      authority: 'TRANSPORT_ONLY',
      admissionAuthority: 'TRUSTED_RUNTIME_DEVICE_REGISTRY',
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
  const relay = createDeviceRelayServer({ meshToken: 'right-owner-token-0123456789', deviceRegistry: new Map() });
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
    assert.deepEqual(await nextMessage(client), { type: 'error', error: 'DEVICE_ENROLLMENT_REQUIRED' });
  } finally {
    client.close();
    await close(relay.server, relay.wss);
  }
});

test('registry admission is device-agnostic across current and future hardware classes', async () => {
  const token='universal-owner-token-0123456789';
  const deviceIds=['windows-workstation-7','galaxy-fold6','iphone-metal-16','agent-virtual-tablet','future-hardware-2040'];
  const deviceRegistry=new Map(deviceIds.map((deviceId,index)=>[deviceId,{
    deviceId,platform:['windows','android','ios','virtual','future'][index],identityVerified:true,
    registrationState:'TRUSTED_REGISTRY_READ',registrationAuthority:'TRUSTED_RUNTIME_DEVICE_REGISTRY',
  }]));
  const relay=createDeviceRelayServer({meshToken:token,deviceRegistry});
  const port=await listen(relay.server);
  const base='ws://127.0.0.1:'+port+'/api/device-relay';
  try{
    for(const deviceId of deviceIds){
      const client=await open(base);
      client.send(JSON.stringify({type:'hello',role:'client',deviceId,token}));
      const ack=await nextMessage(client);
      assert.equal(ack.deviceId,deviceId);
      assert.equal(ack.admissionAuthority,'TRUSTED_RUNTIME_DEVICE_REGISTRY');
      client.close();
    }
  }finally{await close(relay.server,relay.wss);}
});

test('OIDC owner plus mesh token dynamically admits an unlisted device without a source-coded ID', async () => {
  const token='dynamic-owner-mesh-token-0123456789';
  const ownerToken='signed-owner-access-token-fixture';
  const relay=createDeviceRelayServer({
    meshToken:token,deviceRegistry:new Map(),
    verifyOwnerToken:async req=>req.headers.authorization===`Bearer ${ownerToken}`,
    volatileRoomState:false,
  });
  const port=await listen(relay.server);
  const base='ws://127.0.0.1:'+port+'/api/device-relay';
  const client=await open(base);
  const target=await open(base);
  try{
    client.send(JSON.stringify({type:'hello',role:'client',deviceId:'new-linux-edge-node',token,ownerToken}));
    assert.deepEqual(await nextMessage(client),{
      type:'hello-ack',role:'client',deliveryMode:'PROCESS_PERSISTENT_WEBSOCKET_V1',volatileRoomState:false,
      authority:'TRANSPORT_ONLY',admissionAuthority:'OIDC_OWNER_AND_MESH_TOKEN',deviceId:'new-linux-edge-node',
    });
    target.send(JSON.stringify({type:'hello',role:'phone',deviceId:'new-linux-edge-node',token}));
    assert.equal((await nextMessage(target)).deviceId,'new-linux-edge-node');
  }finally{client.close();target.close();await close(relay.server,relay.wss);}
});
