import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
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

function deviceIdentity() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  return {
    privateKey,
    publicKey: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  };
}

function trustedRecord(deviceId, platform, identity, token) {
  return {
    deviceId, platform, identityVerified: true,
    registrationState: 'TRUSTED_REGISTRY_READ',
    registrationAuthority: 'TRUSTED_RUNTIME_DEVICE_REGISTRY',
    publicKey: identity.publicKey,
    meshTokenSha256: createHash('sha256').update(token).digest('hex'),
  };
}

async function authenticateDevice(socket, { deviceId, token, identity, ownerToken }) {
  socket.send(JSON.stringify({ type: 'hello', role: 'phone', deviceId, token, publicKey: identity.publicKey, ...(ownerToken ? { ownerToken } : {}) }));
  const challenge = await nextMessage(socket);
  assert.equal(challenge.type, 'hello-challenge');
  const payload = Buffer.from(`leeway-device-relay-proof-v1\n${deviceId}\n${challenge.nonce}`);
  socket.send(JSON.stringify({ type: 'hello-proof', signature: sign(null, payload, identity.privateKey).toString('base64url') }));
  return nextMessage(socket);
}

test('relay health and authenticated phone/client command round trip', async () => {
  const token = 'test-owner-pairing-token-0123456789';
  const deviceId = 'fold6-test-device';
  const ownerToken = 'owner-execute-token-fixture';
  const identity = deviceIdentity();
  const relay = createDeviceRelayServer({
    meshToken: token,
    deviceRegistry: new Map([[deviceId, trustedRecord(deviceId, 'android', identity, token)]]),
    verifyOwnerToken: async request => request.headers.authorization === `Bearer ${ownerToken}`,
  });
  const port = await listen(relay.server);
  const base = 'ws://127.0.0.1:' + port + '/api/device-relay';
  const phone = await open(base);
  const client = await open(base);

  try {
    assert.deepEqual(await authenticateDevice(phone, { deviceId, token, identity }), {
      type: 'hello-ack',
      role: 'phone',
      deliveryMode: 'VERCEL_FUNCTION_WEBSOCKET_V1',
      volatileRoomState: true,
      authority: 'TRANSPORT_ONLY',
      admissionAuthority: 'TRUSTED_RUNTIME_DEVICE_REGISTRY',
      deviceId,
    });

    client.send(JSON.stringify({ type: 'hello', role: 'client', deviceId, token, ownerToken }));
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
    assert.deepEqual(await nextMessage(client), { type: 'error', error: 'PAIRING_REQUIRED' });
  } finally {
    client.close();
    await close(relay.server, relay.wss);
  }
});

test('concurrent owner clients retain independent pending commands without replacing each other', async () => {
  const token='parallel-owner-token-0123456789';
  const ownerToken='parallel-owner-execute-token';
  const deviceId='parallel-field-node';
  const identity=deviceIdentity();
  const relay=createDeviceRelayServer({
    meshToken:token,
    deviceRegistry:new Map([[deviceId,trustedRecord(deviceId,'future',identity,token)]]),
    verifyOwnerToken:async request=>request.headers.authorization===`Bearer ${ownerToken}`,
  });
  const port=await listen(relay.server);
  const base='ws://127.0.0.1:'+port+'/api/device-relay';
  const phone=await open(base),first=await open(base),second=await open(base);
  try{
    await authenticateDevice(phone,{deviceId,token,identity});
    for(const client of [first,second]){
      client.send(JSON.stringify({type:'hello',role:'client',deviceId,token,ownerToken}));
      assert.equal((await nextMessage(client)).type,'hello-ack');
    }
    first.send(JSON.stringify({type:'command',id:'parallel-1',capability:'device.health',arguments:{}}));
    const firstCommand=await nextMessage(phone);
    second.send(JSON.stringify({type:'command',id:'parallel-2',capability:'device.info',arguments:{}}));
    const commands=[firstCommand,await nextMessage(phone)];
    assert.deepEqual(new Set(commands.map(value=>value.id)),new Set(['parallel-1','parallel-2']));
    phone.send(JSON.stringify({type:'result',id:'parallel-1',capability:'device.health',ok:true,result:{one:true}}));
    phone.send(JSON.stringify({type:'result',id:'parallel-2',capability:'device.info',ok:true,result:{two:true}}));
    assert.equal((await nextMessage(first)).id,'parallel-1');
    assert.equal((await nextMessage(second)).id,'parallel-2');
  }finally{phone.terminate();first.terminate();second.terminate();await close(relay.server,relay.wss);}
});

test('registry admission is device-agnostic across current and future hardware classes', async () => {
  const token='universal-owner-token-0123456789';
  const ownerToken='universal-owner-execute-token';
  const deviceIds=['windows-workstation-7','galaxy-fold6','iphone-metal-16','agent-virtual-tablet','future-hardware-2040'];
  const identities=new Map(deviceIds.map(deviceId=>[deviceId,deviceIdentity()]));
  const deviceRegistry=new Map(deviceIds.map((deviceId,index)=>[deviceId,
    trustedRecord(deviceId,['windows','android','ios','virtual','future'][index],identities.get(deviceId),token)]));
  const relay=createDeviceRelayServer({meshToken:token,deviceRegistry,verifyOwnerToken:async request=>request.headers.authorization===`Bearer ${ownerToken}`});
  const port=await listen(relay.server);
  const base='ws://127.0.0.1:'+port+'/api/device-relay';
  try{
    for(const deviceId of deviceIds){
      const target=await open(base);
      assert.equal((await authenticateDevice(target,{deviceId,token,identity:identities.get(deviceId)})).deviceId,deviceId);
      const client=await open(base);
      client.send(JSON.stringify({type:'hello',role:'client',deviceId,token,ownerToken}));
      const ack=await nextMessage(client);
      assert.equal(ack.deviceId,deviceId);
      assert.equal(ack.admissionAuthority,'TRUSTED_RUNTIME_DEVICE_REGISTRY');
      client.close();
      target.close();
    }
  }finally{await close(relay.server,relay.wss);}
});

test('OIDC owner plus mesh token dynamically admits an unlisted device without a source-coded ID', async () => {
  const token='dynamic-owner-mesh-token-0123456789';
  const ownerToken='signed-owner-access-token-fixture';
  const relay=createDeviceRelayServer({
    meshToken:token,deviceRegistry:new Map(),
    verifyOwnerToken:async req=>req.headers.authorization===`Bearer ${ownerToken}`,
    enrollDevice:async ({deviceId,publicKey,meshToken})=>({
      deviceId,platform:'dynamic',identityVerified:true,registrationState:'TRUSTED_REGISTRY_READ',
      registrationAuthority:'TRUSTED_RUNTIME_DEVICE_REGISTRY',publicKey,
      meshTokenSha256:createHash('sha256').update(meshToken).digest('hex'),
    }),
    volatileRoomState:false,
  });
  const port=await listen(relay.server);
  const base='ws://127.0.0.1:'+port+'/api/device-relay';
  const client=await open(base);
  const target=await open(base);
  const identity=deviceIdentity();
  try{
    assert.deepEqual(await authenticateDevice(target,{deviceId:'new-linux-edge-node',token,ownerToken,identity}),{
      type:'hello-ack',role:'phone',deliveryMode:'PROCESS_PERSISTENT_WEBSOCKET_V1',volatileRoomState:false,
      authority:'TRANSPORT_ONLY',admissionAuthority:'OIDC_OWNER_AND_DEVICE_CREDENTIAL',deviceId:'new-linux-edge-node',
    });
    client.send(JSON.stringify({type:'hello',role:'client',deviceId:'new-linux-edge-node',token,ownerToken}));
    assert.equal((await nextMessage(client)).deviceId,'new-linux-edge-node');
  }finally{client.close();target.close();await close(relay.server,relay.wss);}
});

test('passport-only registry record cannot substitute a caller supplied device key',async()=>{
  const deviceId='passport-only-node',token='passport-token-0123456789',identity=deviceIdentity();
  const relay=createDeviceRelayServer({deviceRegistry:new Map([[deviceId,{deviceId,passportSha256:'a'.repeat(64),identityVerified:true,
    registrationState:'TRUSTED_REGISTRY_READ',registrationAuthority:'TRUSTED_RUNTIME_DEVICE_REGISTRY'}]])});
  const port=await listen(relay.server),socket=await open(`ws://127.0.0.1:${port}/api/device-relay`);
  try{
    socket.send(JSON.stringify({type:'hello',role:'phone',deviceId,token,publicKey:identity.publicKey}));
    assert.deepEqual(await nextMessage(socket),{type:'error',error:'DEVICE_ENROLLMENT_REQUIRED'});
  }finally{socket.terminate();await close(relay.server,relay.wss);}
});

test('Continuum transfer requires a registry-bound source signature and routes through both identities',async()=>{
  const targetId='continuum-target',sourceId='continuum-source',token='continuum-target-token-0123456789';
  const ownerToken='continuum-owner-token',targetIdentity=deviceIdentity(),sourceIdentity=deviceIdentity();
  const registry=new Map([
    [targetId,trustedRecord(targetId,'future',targetIdentity,token)],
    [sourceId,trustedRecord(sourceId,'future',sourceIdentity,'source-token-0123456789')],
  ]);
  let authorized;
  const relay=createDeviceRelayServer({deviceRegistry:registry,verifyOwnerToken:async request=>request.headers.authorization===`Bearer ${ownerToken}`,
    authorizeCommand:async input=>{authorized=input;return true;}});
  const port=await listen(relay.server),url=`ws://127.0.0.1:${port}/api/device-relay`;
  const target=await open(url),client=await open(url);
  try{
    await authenticateDevice(target,{deviceId:targetId,token,identity:targetIdentity});
    client.send(JSON.stringify({type:'hello',role:'client',deviceId:targetId,ownerToken}));
    assert.equal((await nextMessage(client)).type,'hello-ack');
    const capsuleSha256='b'.repeat(64),nonce='proof-nonce-1';
    const payload=Buffer.from(`leeway-continuum-transfer-v1\n${sourceId}\n${targetId}\n${capsuleSha256}\n${nonce}`);
    const argumentsValue={sourceNodeId:sourceId,targetNodeId:targetId,sourceProof:{capsuleSha256,nonce,
      signature:sign(null,payload,sourceIdentity.privateKey).toString('base64url')}};
    client.send(JSON.stringify({type:'command',id:'transfer-1',capability:'continuum.transfer.stage',arguments:argumentsValue}));
    assert.equal((await nextMessage(target)).id,'transfer-1');
    assert.equal(authorized.deviceId,targetId);
    assert.equal(authorized.arguments.sourceNodeId,sourceId);
  }finally{target.terminate();client.terminate();await close(relay.server,relay.wss);}
});

test('Continuum source proof replay remains denied after relay restart',async t=>{
  const custodyRoot=await fs.mkdtemp(path.join(os.tmpdir(),'leeway-relay-replay-'));
  t.after(()=>fs.rm(custodyRoot,{recursive:true,force:true}));
  const replayStorePath=path.join(custodyRoot,'consumed-proofs.log');
  const targetId='durable-target',sourceId='durable-source',token='durable-target-token-0123456789';
  const ownerToken='durable-owner-token',targetIdentity=deviceIdentity(),sourceIdentity=deviceIdentity();
  const registry=new Map([
    [targetId,trustedRecord(targetId,'future',targetIdentity,token)],
    [sourceId,trustedRecord(sourceId,'future',sourceIdentity,'durable-source-token-0123456789')],
  ]);
  const capsuleSha256='c'.repeat(64),nonce='restart-proof-nonce';
  const payload=Buffer.from(`leeway-continuum-transfer-v1\n${sourceId}\n${targetId}\n${capsuleSha256}\n${nonce}`);
  const args={sourceNodeId:sourceId,targetNodeId:targetId,sourceProof:{capsuleSha256,nonce,
    signature:sign(null,payload,sourceIdentity.privateKey).toString('base64url')}};

  async function start(){
    const relay=createDeviceRelayServer({deviceRegistry:registry,replayStorePath,
      verifyOwnerToken:async request=>request.headers.authorization===`Bearer ${ownerToken}`});
    const port=await listen(relay.server),url=`ws://127.0.0.1:${port}/api/device-relay`;
    const target=await open(url),client=await open(url);
    await authenticateDevice(target,{deviceId:targetId,token,identity:targetIdentity});
    client.send(JSON.stringify({type:'hello',role:'client',deviceId:targetId,ownerToken}));
    assert.equal((await nextMessage(client)).type,'hello-ack');
    return {relay,target,client};
  }

  const first=await start();
  first.client.send(JSON.stringify({type:'command',id:'first',capability:'continuum.transfer.stage',arguments:args}));
  assert.equal((await nextMessage(first.target)).id,'first');
  first.target.terminate(); first.client.terminate(); await close(first.relay.server,first.relay.wss);

  const second=await start();
  try{
    second.client.send(JSON.stringify({type:'command',id:'replay',capability:'continuum.transfer.stage',arguments:args}));
    assert.deepEqual(await nextMessage(second.client),{type:'error',error:'CONTINUUM_DEVICE_IDENTITY_REJECTED'});
  }finally{second.target.terminate();second.client.terminate();await close(second.relay.server,second.relay.wss);}
});
