/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.PUBLIC.RELAY
TAG: LEEWAY.VERCEL.DEVICE.RELAY.WEBSOCKET.V1
WHO: 4citeB4U/LEEWAY-DEVICE-BRIDGE
WHAT: Transport-only WebSocket relay for the existing phone/client protocol
WHY: Restore the canonical Device Bridge route after the retired Agent Lee X transport was removed
HOW: Pair the already enrolled phone and client by device ID plus owner pairing token; route bounded messages only
AUTHORITY: Transport only. The phone remains the execution and Formula boundary.
*/
import { createServer } from 'node:http';
import { createHash, timingSafeEqual, randomUUID, createPublicKey, verify as verifySignature } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'node:fs';
import path from 'node:path';
import { createOidcAccessAuthenticator } from '../operator/identity/pocket-id-access.mjs';
import { loadTrustedDeviceRegistry, isTrustedDeviceRecord, trustedDeviceTokenMatches } from '../operator/identity/trusted-device-registry.mjs';

const MAX_PAYLOAD_BYTES = 64 * 1024;
const HELLO_TIMEOUT_MS = 10_000;
const MAX_ID_LENGTH = 128;
const MAX_CAPABILITY_LENGTH = 128;
const MAX_DEVICE_ID_LENGTH = 128;
const MAX_TOKEN_LENGTH = 512;
const MAX_OWNER_TOKEN_LENGTH = 16_384;
const DELIVERY_MODE = 'VERCEL_FUNCTION_WEBSOCKET_V1';
const SOVEREIGN_MESH_TOKEN = process.env.LEEWAY_MESH_TOKEN || null;

function json(res, status, value) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(value));
}

function text(value, max) {
  return typeof value === 'string' && value.length > 0 && value.length <= max ? value : null;
}

function tokenDigest(token) {
  return createHash('sha256').update(token, 'utf8').digest();
}

function digestsMatch(left, right) {
  return Buffer.isBuffer(left) && Buffer.isBuffer(right)
    && left.length === right.length && timingSafeEqual(left, right);
}

function devicePublicKey(value) {
  if (typeof value !== 'string' || value.length > 16_384) return null;
  try {
    if (/^ed25519:[a-f0-9]{64}$/i.test(value)) {
      const raw = Buffer.from(value.slice(8), 'hex');
      return createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), raw]), format: 'der', type: 'spki' });
    }
    if (value.includes('BEGIN PUBLIC KEY')) return createPublicKey(value);
    if (/^[A-Za-z0-9+/]{40,512}={0,2}$/.test(value)) {
      return createPublicKey({ key: Buffer.from(value, 'base64'), format: 'der', type: 'spki' });
    }
  } catch {}
  return null;
}

function publicKeyValue(record) {
  return record?.publicKey ?? record?.publicKeySpki ?? record?.publicKeyDerBase64 ?? null;
}

function proofPayload(deviceId, nonce) {
  return Buffer.from(`leeway-device-relay-proof-v1\n${deviceId}\n${nonce}`, 'utf8');
}

function continuumProofPayload({ sourceNodeId, targetNodeId, capsuleSha256, nonce }) {
  return Buffer.from(`leeway-continuum-transfer-v1\n${sourceNodeId}\n${targetNodeId}\n${capsuleSha256}\n${nonce}`, 'utf8');
}

function validArguments(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function protocolError(ws, error) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'error', error }));
  ws.close(1008, error);
}

function helloAck(ws, role, room, volatileRoomState) {
  ws.send(JSON.stringify({
    type: 'hello-ack',
    role,
    deliveryMode: volatileRoomState ? DELIVERY_MODE : 'PROCESS_PERSISTENT_WEBSOCKET_V1',
    volatileRoomState,
    authority: 'TRANSPORT_ONLY',
    admissionAuthority: room.admissionAuthority,
    deviceId: room.deviceId,
  }));
}

function makeRoom(deviceId, token, admissionAuthority, publicKey) {
  return {
    deviceId,
    tokenHash: tokenDigest(token),
    deviceCredential: token,
    phone: null,
    clients: new Map(),
    pending: new Map(),
    completed: new Set(),
    admissionAuthority,
    publicKey,
  };
}

function roomHasSocket(room) {
  return room.phone?.ws?.readyState === WebSocket.OPEN
    || [...room.clients.values()].some(connection => connection.ws.readyState === WebSocket.OPEN);
}

function defaultOwnerTokenVerifier(env = process.env) {
  const issuer = String(env.LEEWAY_MCP_AUTH_ISSUER || '').trim();
  const resource = String(env.LEEWAY_MCP_AUDIENCE || '').trim();
  const ownerSubject = String(env.LEEWAY_MCP_OWNER_SUB || '').trim();
  if (!issuer || !resource || !ownerSubject) return null;
  try {
    return createOidcAccessAuthenticator({
      issuer, resource, ownerSubject, permission: 'device.bridge.execute',
      tokenAudiences: String(env.LEEWAY_MCP_TOKEN_AUDIENCES || '').split(/[\n,]/).map(value => value.trim()).filter(Boolean),
    });
  } catch {
    return null;
  }
}

function createRelayServer({
  rooms = new Map(),
  deviceRegistry = loadTrustedDeviceRegistry(),
  meshToken = SOVEREIGN_MESH_TOKEN,
  verifyOwnerToken = defaultOwnerTokenVerifier(),
  volatileRoomState = true,
  authorizeCommand = async () => true,
  enrollDevice = null,
  verifiedOwnerSubject = process.env.LEEWAY_MCP_OWNER_SUB || null,
  replayStorePath = process.env.LEEWAY_RELAY_REPLAY_STORE_PATH || null,
} = {}) {
  const consumedProofs = new Set();
  const replayCustodyDir = replayStorePath ? `${replayStorePath}.proofs` : null;
  if (replayStorePath) {
    try { for (const line of fs.readFileSync(replayStorePath, 'utf8').split(/\r?\n/)) if (/^[a-f0-9]{64}$/.test(line)) consumedProofs.add(line); } catch {}
    try { for (const entry of fs.readdirSync(replayCustodyDir)) if (/^[a-f0-9]{64}\.json$/.test(entry)) consumedProofs.add(entry.slice(0, 64)); } catch {}
  }
  const trustedRecord = deviceId => deviceRegistry instanceof Map
    ? deviceRegistry.get(deviceId)
    : Array.isArray(deviceRegistry)
      ? deviceRegistry.find(record => (record?.deviceId ?? record?.id) === deviceId)
      : null;
  const roomAdmission = async ({ deviceId, token, ownerToken, suppliedPublicKey }) => {
    const record = trustedRecord(deviceId);
    if (isTrustedDeviceRecord(record) && trustedDeviceTokenMatches(record, token) && devicePublicKey(publicKeyValue(record))) {
      return { authority: 'TRUSTED_RUNTIME_DEVICE_REGISTRY', publicKeyValue: publicKeyValue(record), enrollment: null };
    }
    if (typeof ownerToken !== 'string' || ownerToken.length < 8 || ownerToken.length > MAX_OWNER_TOKEN_LENGTH ||
      typeof verifyOwnerToken !== 'function' || typeof enrollDevice !== 'function' || !devicePublicKey(suppliedPublicKey) || token.length < 16) return null;
    const verified = await verifyOwnerToken({ headers: { authorization: `Bearer ${ownerToken}` } });
    return verified === true || (verified && typeof verified === 'object') ? {
      authority: 'OIDC_OWNER_AND_DEVICE_CREDENTIAL',
      publicKeyValue: suppliedPublicKey,
      enrollment: { deviceId, publicKey: suppliedPublicKey, meshToken: token,
        ownerSubject: (typeof verified?.subject === 'string' ? verified.subject : verifiedOwnerSubject) || 'OIDC_OWNER_VERIFIED' },
    } : null;
  };
  const server = createServer((req, res) => {
    if (req.method === 'GET' && (req.url === '/api/device-relay' || req.url === '/api/device-relay/')) {
      return json(res, 200, {
        ok: true,
        service: 'leeway-device-bridge-relay',
        protocol: 'LEEWAY_DEVICE_RELAY_TOKEN_ROOM_WEBSOCKET_V1',
        deliveryMode: volatileRoomState ? DELIVERY_MODE : 'PROCESS_PERSISTENT_WEBSOCKET_V1',
        authority: 'TRANSPORT_ONLY',
        volatileRoomState,
        supportsWebSocket: true,
        activeRooms: rooms.size,
        truthBoundary: 'RUNTIME_OBSERVED_ONLY',
      });
    }
    return json(res, 404, { ok: false, error: 'NOT_FOUND' });
  });

  const wss = new WebSocketServer({ server, maxPayload: MAX_PAYLOAD_BYTES });

  function removeConnection(connection) {
    const room = rooms.get(connection.deviceId);
    if (!room) return;
    if (room.phone === connection) room.phone = null;
    room.clients.delete(connection.id);
    for (const [id, pending] of room.pending) {
      if (pending.connection === connection) room.pending.delete(id);
    }
    if (!roomHasSocket(room)) rooms.delete(connection.deviceId);
  }

  async function routeCommand(connection, message, room) {
    if (connection.role !== 'client' && connection.role !== 'workstation') {
      return protocolError(connection.ws, 'ROLE_CANNOT_COMMAND');
    }
    const id = text(message.id, MAX_ID_LENGTH);
    const capability = text(message.capability, MAX_CAPABILITY_LENGTH);
    if (!id || !capability || !validArguments(message.arguments)) {
      return protocolError(connection.ws, 'COMMAND_INVALID');
    }
    if (capability === 'continuum.transfer.stage') {
      const sourceNodeId = text(message.arguments.sourceNodeId, MAX_DEVICE_ID_LENGTH);
      const targetNodeId = text(message.arguments.targetNodeId, MAX_DEVICE_ID_LENGTH);
      const proof = message.arguments.sourceProof;
      const capsuleSha256 = text(proof?.capsuleSha256, 64);
      const nonce = text(proof?.nonce, 128);
      const signature = text(proof?.signature, 16_384);
      const sourceRecord = trustedRecord(sourceNodeId);
      const sourceKey = devicePublicKey(publicKeyValue(sourceRecord));
      let sourceProofValid = false;
      try {
        sourceProofValid = Boolean(sourceKey && signature && /^[a-f0-9]{64}$/i.test(capsuleSha256 || '') && nonce) && verifySignature(
          sourceKey.asymmetricKeyType === 'ed25519' ? null : 'sha256',
          continuumProofPayload({ sourceNodeId, targetNodeId, capsuleSha256, nonce }),
          sourceKey,
          Buffer.from(signature, 'base64url'),
        );
      } catch { sourceProofValid = false; }
      const proofId = createHash('sha256').update(`${sourceNodeId}\n${targetNodeId}\n${capsuleSha256}\n${nonce}`).digest('hex');
      if (!sourceNodeId || targetNodeId !== room.deviceId || !isTrustedDeviceRecord(sourceRecord) || !sourceProofValid || consumedProofs.has(proofId)) {
        return protocolError(connection.ws, 'CONTINUUM_DEVICE_IDENTITY_REJECTED');
      }
      if (replayStorePath) {
        try {
          fs.mkdirSync(path.dirname(replayStorePath), { recursive: true });
          fs.mkdirSync(replayCustodyDir, { recursive: true, mode: 0o700 });
          const custodyPath = path.join(replayCustodyDir, `${proofId}.json`);
          const descriptor = fs.openSync(custodyPath, 'wx', 0o600);
          try {
            fs.writeFileSync(descriptor, JSON.stringify({
              proofId, sourceNodeId, targetNodeId, capsuleSha256, nonce,
              consumedUtc: new Date().toISOString(),
            }));
            fs.fsyncSync(descriptor);
          } finally { fs.closeSync(descriptor); }
          fs.appendFileSync(replayStorePath, `${proofId}\n`, { encoding: 'utf8', mode: 0o600 });
        }
        catch { return protocolError(connection.ws, 'CONTINUUM_REPLAY_CUSTODY_UNAVAILABLE'); }
      }
      consumedProofs.add(proofId);
    }
    let commandAdmitted = false;
    try {
      commandAdmitted = await authorizeCommand({
        deviceId: room.deviceId,
        capability,
        arguments: message.arguments,
        meshToken: room.deviceCredential,
      });
    } catch {
      commandAdmitted = false;
    }
    if (commandAdmitted !== true) return protocolError(connection.ws, 'RUST_ROUTER_ADMISSION_REJECTED');
    if (room.completed.has(id) || room.pending.has(id)) {
      return protocolError(connection.ws, 'DUPLICATE_COMMAND_ID');
    }
    if (!room.phone || room.phone.ws.readyState !== WebSocket.OPEN) {
      return protocolError(connection.ws, 'PHONE_NOT_CONNECTED');
    }
    room.pending.set(id, { connection, capability });
    room.phone.ws.send(JSON.stringify({
      type: 'command',
      id,
      capability,
      arguments: message.arguments,
    }));
  }

  function routeResult(connection, message, room) {
    if (connection.role !== 'phone') return protocolError(connection.ws, 'ROLE_CANNOT_RESULT');
    const id = text(message.id, MAX_ID_LENGTH);
    const capability = text(message.capability, MAX_CAPABILITY_LENGTH);
    if (!id || !capability || !Object.hasOwn(message, 'ok')) {
      return protocolError(connection.ws, 'RESULT_INVALID');
    }
    const pending = room.pending.get(id);
    if (!pending || pending.capability !== capability) {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify({ type: 'error', error: 'UNKNOWN_COMMAND_ID' }));
      }
      return;
    }
    room.pending.delete(id);
    room.completed.add(id);
    if (room.completed.size > 256) room.completed.delete(room.completed.values().next().value);
    if (pending.connection.ws.readyState !== WebSocket.OPEN) return;
    pending.connection.ws.send(JSON.stringify({
      type: 'result',
      id,
      capability,
      ok: message.ok === true,
      ...(message.ok === true && Object.hasOwn(message, 'result') ? { result: message.result } : {}),
      ...(message.ok !== true ? { error: text(message.error, 256) || 'REMOTE_COMMAND_FAILED' } : {}),
    }));
  }

  wss.on('connection', (ws) => {
    const connection = { ws, id: randomUUID(), role: null, deviceId: null, authenticated: false, meshToken: null };
    const helloTimer = setTimeout(() => protocolError(ws, 'HELLO_TIMEOUT'), HELLO_TIMEOUT_MS);

    ws.on('message', async (raw) => {
      let message;
      try {
        message = JSON.parse(raw.toString('utf8'));
      } catch {
        return protocolError(ws, 'JSON_INVALID');
      }
      if (!message || typeof message !== 'object' || Array.isArray(message)) {
        return protocolError(ws, 'MESSAGE_INVALID');
      }

      if (!connection.authenticated) {
        if (message.type === 'hello-proof' && connection.challenge) {
          const signature = text(message.signature, 16_384);
          const challenge = connection.challenge;
          let valid = false;
          try {
            valid = Boolean(signature) && verifySignature(
              challenge.key.asymmetricKeyType === 'ed25519' ? null : 'sha256',
              proofPayload(challenge.deviceId, challenge.nonce),
              challenge.key,
              Buffer.from(signature, 'base64url'),
            );
          } catch {
            valid = false;
          }
          if (!valid) return protocolError(ws, 'DEVICE_KEY_PROOF_REJECTED');
          if (challenge.enrollment) {
            let persisted;
            try { persisted = await enrollDevice(challenge.enrollment); } catch { persisted = null; }
            if (!isTrustedDeviceRecord(persisted) || publicKeyValue(persisted) !== challenge.publicKeyValue ||
              !trustedDeviceTokenMatches(persisted, challenge.token)) return protocolError(ws, 'DEVICE_ENROLLMENT_PERSISTENCE_FAILED');
            if (deviceRegistry instanceof Map) deviceRegistry.set(challenge.deviceId, persisted);
          }
          let room = rooms.get(challenge.deviceId);
          if (!room) {
            room = makeRoom(challenge.deviceId, challenge.token, challenge.admissionAuthority, challenge.publicKeyValue);
            rooms.set(challenge.deviceId, room);
          }
          if (!digestsMatch(tokenDigest(challenge.token), room.tokenHash) || room.publicKey !== challenge.publicKeyValue) {
            return protocolError(ws, 'DEVICE_KEY_BINDING_REJECTED');
          }
          if (room.phone?.ws?.readyState === WebSocket.OPEN) room.phone.ws.close(4001, 'REPLACED_BY_RECONNECT');
          connection.role = 'phone';
          connection.deviceId = challenge.deviceId;
          connection.authenticated = true;
          connection.meshToken = challenge.token;
          connection.challenge = null;
          room.phone = connection;
          clearTimeout(helloTimer);
          helloAck(ws, 'phone', room, volatileRoomState);
          return;
        }
        if (message.type !== 'hello') return protocolError(ws, 'HELLO_REQUIRED');
        const role = text(message.role, 32);
        const deviceId = text(message.deviceId, MAX_DEVICE_ID_LENGTH);
        const token = text(message.token, MAX_TOKEN_LENGTH);
        const ownerToken = text(message.ownerToken, MAX_OWNER_TOKEN_LENGTH);
        if (!['phone', 'client', 'workstation'].includes(role) || !deviceId || (role === 'phone' && !token)) {
          return protocolError(ws, 'HELLO_INVALID');
        }

        let room = rooms.get(deviceId);
        if (role === 'phone') {
          const record = trustedRecord(deviceId);
          const suppliedPublicKey = text(message.publicKey, 16_384);
          const admission = room ? { authority: room.admissionAuthority, publicKeyValue: room.publicKey, enrollment: null }
            : await roomAdmission({ deviceId, token, ownerToken, suppliedPublicKey });
          const candidatePublicKey = admission?.publicKeyValue;
          const key = devicePublicKey(candidatePublicKey);
          if (!admission?.authority || !key) return protocolError(ws, 'DEVICE_ENROLLMENT_REQUIRED');
          if (room && (!digestsMatch(tokenDigest(token), room.tokenHash) || room.publicKey !== candidatePublicKey)) {
            return protocolError(ws, 'PAIRING_TOKEN_REJECTED');
          }
          const nonce = randomUUID();
          connection.challenge = { deviceId, token, admissionAuthority: admission.authority, publicKeyValue: candidatePublicKey, enrollment: admission.enrollment, key, nonce };
          ws.send(JSON.stringify({ type: 'hello-challenge', deviceId, nonce, algorithm: key.asymmetricKeyType }));
          return;
        } else {
          let ownerVerified = false;
          try {
            ownerVerified = typeof verifyOwnerToken === 'function' &&
              await verifyOwnerToken({ headers: { authorization: `Bearer ${ownerToken || ''}` } }) === true;
          } catch {
            ownerVerified = false;
          }
          if (!ownerVerified || !room) {
            return protocolError(ws, 'PAIRING_REQUIRED');
          }
          connection.role = role;
          connection.deviceId = deviceId;
          connection.authenticated = true;
          connection.meshToken = null;
          room.clients.set(connection.id, connection);
        }
        clearTimeout(helloTimer);
        helloAck(ws, role, room, volatileRoomState);
        return;
      }

      const room = rooms.get(connection.deviceId);
      if (!room) return protocolError(ws, 'ROOM_NOT_FOUND');
      if (message.type === 'command') return await routeCommand(connection, message, room);
      if (message.type === 'result') return routeResult(connection, message, room);
      if (message.type === 'ping') {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }
      protocolError(ws, 'MESSAGE_TYPE_UNSUPPORTED');
    });

    ws.on('close', () => {
      clearTimeout(helloTimer);
      removeConnection(connection);
    });
    ws.on('error', () => {
      clearTimeout(helloTimer);
      removeConnection(connection);
    });
  });

  return { server, wss, rooms };
}

const defaultRelay = createRelayServer();
export const relayRooms = defaultRelay.rooms;
export const createDeviceRelayServer = createRelayServer;
export default defaultRelay.server;
