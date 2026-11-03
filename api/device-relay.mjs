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
import { createHash, timingSafeEqual, randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { createRedisRelayStore } from './relay-store.mjs';

const MAX_PAYLOAD_BYTES = 64 * 1024;
const HELLO_TIMEOUT_MS = 10_000;
const MAX_ID_LENGTH = 128;
const MAX_CAPABILITY_LENGTH = 128;
const MAX_DEVICE_ID_LENGTH = 128;
const MAX_TOKEN_LENGTH = 512;
const DELIVERY_MODE = 'VERCEL_FUNCTION_WEBSOCKET_V1';
const DURABLE_DELIVERY_MODE = 'VERCEL_FUNCTION_WEBSOCKET_REDIS_POLL_V1';
const INBOX_BATCH_SIZE = 32;
const INBOX_POLL_MS = 250;
const DURABLE_REQUIRED_IN_PRODUCTION = process.env.VERCEL_ENV === 'production';

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

function validArguments(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function protocolError(ws, error) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'error', error }));
  ws.close(1008, error);
}

function helloAck(ws, role, room, durable) {
  ws.send(JSON.stringify({
    type: 'hello-ack',
    role,
    deliveryMode: durable ? DURABLE_DELIVERY_MODE : DELIVERY_MODE,
    volatileRoomState: !durable,
    authority: 'TRANSPORT_ONLY',
    deviceId: room.deviceId,
  }));
}

function makeRoom(deviceId, token) {
  return {
    deviceId,
    tokenHash: tokenDigest(token),
    phone: null,
    client: null,
    pending: new Map(),
    completed: new Set(),
  };
}

function roomHasSocket(room) {
  return room.phone?.ws?.readyState === WebSocket.OPEN || room.client?.ws?.readyState === WebSocket.OPEN;
}

function closeReplaced(connection) {
  if (connection?.ws?.readyState === WebSocket.OPEN) {
    connection.ws.close(4001, 'REPLACED_BY_RECONNECT');
  }
}

function createMemoryRelayServer({ rooms = new Map() } = {}) {
  const server = createServer((req, res) => {
    if (req.method === 'GET' && (req.url === '/api/device-relay' || req.url === '/api/device-relay/')) {
      return json(res, 200, {
        ok: true,
        service: 'leeway-device-bridge-relay',
        protocol: 'LEEWAY_DEVICE_RELAY_TOKEN_ROOM_WEBSOCKET_V1',
        deliveryMode: DELIVERY_MODE,
        authority: 'TRANSPORT_ONLY',
        volatileRoomState: true,
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
    if (room.client === connection) room.client = null;
    for (const [id, pending] of room.pending) {
      if (pending === connection) room.pending.delete(id);
    }
    if (!roomHasSocket(room)) rooms.delete(connection.deviceId);
  }

  function routeCommand(connection, message, room) {
    if (connection.role !== 'client' && connection.role !== 'workstation') {
      return protocolError(connection.ws, 'ROLE_CANNOT_COMMAND');
    }
    const id = text(message.id, MAX_ID_LENGTH);
    const capability = text(message.capability, MAX_CAPABILITY_LENGTH);
    if (!id || !capability || !validArguments(message.arguments)) {
      return protocolError(connection.ws, 'COMMAND_INVALID');
    }
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
      return protocolError(connection.ws, 'UNKNOWN_COMMAND_ID');
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
    const connection = { ws, id: randomUUID(), role: null, deviceId: null, authenticated: false };
    const helloTimer = setTimeout(() => protocolError(ws, 'HELLO_TIMEOUT'), HELLO_TIMEOUT_MS);

    ws.on('message', (raw) => {
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
        if (message.type !== 'hello') return protocolError(ws, 'HELLO_REQUIRED');
        const role = text(message.role, 32);
        const deviceId = text(message.deviceId, MAX_DEVICE_ID_LENGTH);
        const token = text(message.token, MAX_TOKEN_LENGTH);
        if (!['phone', 'client', 'workstation'].includes(role) || !deviceId || !token) {
          return protocolError(ws, 'HELLO_INVALID');
        }

        let room = rooms.get(deviceId);
        if (role === 'phone') {
          if (room && !digestsMatch(tokenDigest(token), room.tokenHash)) {
            return protocolError(ws, 'PAIRING_TOKEN_REJECTED');
          }
          if (!room) {
            room = makeRoom(deviceId, token);
            rooms.set(deviceId, room);
          }
          closeReplaced(room.phone);
          connection.role = role;
          connection.deviceId = deviceId;
          connection.authenticated = true;
          room.phone = connection;
        } else {
          if (!room || !room.phone || room.phone.ws.readyState !== WebSocket.OPEN
            || !digestsMatch(tokenDigest(token), room.tokenHash)) {
            return protocolError(ws, 'PAIRING_REQUIRED');
          }
          closeReplaced(room.client);
          connection.role = role;
          connection.deviceId = deviceId;
          connection.authenticated = true;
          room.client = connection;
        }
        clearTimeout(helloTimer);
        helloAck(ws, role, room);
        return;
      }

      const room = rooms.get(connection.deviceId);
      if (!room) return protocolError(ws, 'ROOM_NOT_FOUND');
      if (message.type === 'command') return routeCommand(connection, message, room);
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

function createDurableRelayServer({ store, requireDurable }) {
  const nodeId = randomUUID();
  const localConnections = new Map();
  let pollTimer = null;
  let polling = false;

  const server = createServer((req, res) => {
    if (req.method === 'GET' && (req.url === '/api/device-relay' || req.url === '/api/device-relay/')) {
      if (!store && requireDurable) {
        return json(res, 503, {
          ok: false,
          service: 'leeway-device-bridge-relay',
          error: 'DURABLE_RELAY_STORE_REQUIRED',
          deliveryMode: DURABLE_DELIVERY_MODE,
          volatileRoomState: true,
          supportsWebSocket: true,
          truthBoundary: 'RUNTIME_OBSERVED_ONLY',
        });
      }
      return json(res, 200, {
        ok: true,
        service: 'leeway-device-bridge-relay',
        protocol: 'LEEWAY_DEVICE_RELAY_TOKEN_ROOM_WEBSOCKET_V1',
        deliveryMode: DURABLE_DELIVERY_MODE,
        volatileRoomState: false,
        durableRoomState: true,
        storage: store?.kind || 'UNAVAILABLE',
        supportsWebSocket: true,
        nodeId,
        truthBoundary: 'RUNTIME_OBSERVED_ONLY',
      });
    }
    return json(res, 404, { ok: false, error: 'NOT_FOUND' });
  });

  const wss = new WebSocketServer({ server, maxPayload: MAX_PAYLOAD_BYTES });

  function ownerRole(role) {
    return role === 'phone' ? 'phone' : 'client';
  }

  function localKey(deviceId, role) {
    return `${deviceId}:${ownerRole(role)}`;
  }

  function localSocket(deviceId, role) {
    const connection = localConnections.get(localKey(deviceId, role));
    return connection?.ws?.readyState === WebSocket.OPEN ? connection : null;
  }

  async function forwardToNode(targetNodeId, message) {
    if (!store || !targetNodeId) return;
    await store.pushInbox(targetNodeId, {
      ...message,
      expiresAt: message.expiresAt || Date.now() + 30_000,
    });
  }

  async function deliverInbox(message) {
    if (!message || typeof message !== 'object') return;
    if (message.expiresAt && message.expiresAt < Date.now()) return;
    if (message.kind === 'close') {
      const connection = localSocket(message.deviceId, message.role);
      if (connection) connection.ws.close(4001, message.reason || 'REPLACED_BY_RECONNECT');
      return;
    }
    if (message.kind !== 'forward') return;
    const connection = localSocket(message.deviceId, message.role);
    if (connection) {
      connection.ws.send(JSON.stringify(message.payload));
      return;
    }
    if (message.attempts >= 3) return;
    await forwardToNode(nodeId, { ...message, attempts: (message.attempts || 0) + 1 });
  }

  async function pollInbox() {
    if (polling || !store) return;
    polling = true;
    try {
      for (let index = 0; index < INBOX_BATCH_SIZE; index += 1) {
        const message = await store.popInbox(nodeId);
        if (!message) break;
        await deliverInbox(message);
      }
    } catch {
      // The next poll retries after a transient provider failure. No secrets are logged.
    } finally {
      polling = false;
      pollTimer = setTimeout(pollInbox, INBOX_POLL_MS);
      pollTimer.unref?.();
    }
  }

  async function closePreviousOwner(deviceId, role, previousOwner) {
    if (!previousOwner || previousOwner === nodeId) {
      closeReplaced(localConnections.get(localKey(deviceId, role)));
      return;
    }
    await forwardToNode(previousOwner, {
      kind: 'close',
      deviceId,
      role,
      reason: 'REPLACED_BY_RECONNECT',
    });
  }

  async function removeConnection(connection) {
    if (!connection.authenticated || !store) return;
    const role = ownerRole(connection.role);
    await store.removeOwner(connection.deviceId, role, nodeId);
    const key = localKey(connection.deviceId, role);
    if (localConnections.get(key) === connection) localConnections.delete(key);
  }

  async function touchConnection(connection) {
    if (connection.authenticated && store) {
      await store.touch(connection.deviceId, ownerRole(connection.role));
    }
  }

  async function authenticateHello(connection, message) {
    const role = text(message.role, 32);
    const deviceId = text(message.deviceId, MAX_DEVICE_ID_LENGTH);
    const token = text(message.token, MAX_TOKEN_LENGTH);
    if (!['phone', 'client', 'workstation'].includes(role) || !deviceId || !token) {
      return protocolError(connection.ws, 'HELLO_INVALID');
    }

    const digest = tokenDigest(token).toString('hex');
    const owner = ownerRole(role);
    if (role === 'phone') {
      if (!await store.claimToken(deviceId, digest)) {
        return protocolError(connection.ws, 'PAIRING_TOKEN_REJECTED');
      }
    } else if (!await store.tokenMatches(deviceId, digest) || !await store.getOwner(deviceId, 'phone')) {
      return protocolError(connection.ws, 'PAIRING_REQUIRED');
    }

    const previousOwner = await store.getOwner(deviceId, owner);
    await closePreviousOwner(deviceId, owner, previousOwner);
    await store.setOwner(deviceId, owner, nodeId);
    connection.role = role;
    connection.deviceId = deviceId;
    connection.authenticated = true;
    localConnections.set(localKey(deviceId, role), connection);
    clearTimeout(connection.helloTimer);
    helloAck(connection.ws, role, { deviceId }, true);
  }

  async function routeCommand(connection, message) {
    if (connection.role !== 'client' && connection.role !== 'workstation') {
      return protocolError(connection.ws, 'ROLE_CANNOT_COMMAND');
    }
    const id = text(message.id, MAX_ID_LENGTH);
    const capability = text(message.capability, MAX_CAPABILITY_LENGTH);
    if (!id || !capability || !validArguments(message.arguments)) {
      return protocolError(connection.ws, 'COMMAND_INVALID');
    }
    const phoneOwner = await store.getOwner(connection.deviceId, 'phone');
    if (!phoneOwner) return protocolError(connection.ws, 'PHONE_NOT_CONNECTED');

    const payload = {
      type: 'command',
      id,
      capability,
      arguments: message.arguments,
    };
    const claimed = await store.claimPending(connection.deviceId, id, {
      capability,
      clientNodeId: nodeId,
      message: payload,
      issuedAt: Date.now(),
    });
    if (!claimed) return protocolError(connection.ws, 'DUPLICATE_COMMAND_ID');

    const phone = localSocket(connection.deviceId, 'phone');
    if (phoneOwner === nodeId && phone) {
      phone.ws.send(JSON.stringify(payload));
      return;
    }
    await forwardToNode(phoneOwner, {
      kind: 'forward',
      role: 'phone',
      deviceId: connection.deviceId,
      payload,
      attempts: 0,
    });
  }

  async function routeResult(connection, message) {
    if (connection.role !== 'phone') return protocolError(connection.ws, 'ROLE_CANNOT_RESULT');
    const id = text(message.id, MAX_ID_LENGTH);
    const capability = text(message.capability, MAX_CAPABILITY_LENGTH);
    if (!id || !capability || !Object.hasOwn(message, 'ok')) {
      return protocolError(connection.ws, 'RESULT_INVALID');
    }
    const pending = await store.takePending(connection.deviceId, id);
    if (!pending || pending.capability !== capability) {
      return protocolError(connection.ws, 'UNKNOWN_COMMAND_ID');
    }
    await store.markCompleted(connection.deviceId, id);
    const result = {
      type: 'result',
      id,
      capability,
      ok: message.ok === true,
      ...(message.ok === true && Object.hasOwn(message, 'result') ? { result: message.result } : {}),
      ...(message.ok !== true ? { error: text(message.error, 256) || 'REMOTE_COMMAND_FAILED' } : {}),
    };
    const client = localSocket(connection.deviceId, 'client');
    if (pending.clientNodeId === nodeId && client) {
      client.ws.send(JSON.stringify(result));
      return;
    }
    await forwardToNode(pending.clientNodeId, {
      kind: 'forward',
      role: 'client',
      deviceId: connection.deviceId,
      payload: result,
      attempts: 0,
    });
  }

  async function handleMessage(connection, raw) {
    let message;
    try {
      message = JSON.parse(raw.toString('utf8'));
    } catch {
      return protocolError(connection.ws, 'JSON_INVALID');
    }
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      return protocolError(connection.ws, 'MESSAGE_INVALID');
    }

    if (!connection.authenticated) {
      if (message.type !== 'hello') return protocolError(connection.ws, 'HELLO_REQUIRED');
      return authenticateHello(connection, message);
    }

    await touchConnection(connection);
    if (message.type === 'command') return routeCommand(connection, message);
    if (message.type === 'result') return routeResult(connection, message);
    if (message.type === 'ping') {
      if (connection.ws.readyState === WebSocket.OPEN) connection.ws.send(JSON.stringify({ type: 'pong' }));
      return;
    }
    protocolError(connection.ws, 'MESSAGE_TYPE_UNSUPPORTED');
  }

  wss.on('connection', (ws) => {
    const connection = { ws, role: null, deviceId: null, authenticated: false, helloTimer: null, touchTimer: null };
    if (!store && requireDurable) {
      protocolError(ws, 'DURABLE_RELAY_STORE_REQUIRED');
      return;
    }
    connection.helloTimer = setTimeout(() => protocolError(ws, 'HELLO_TIMEOUT'), HELLO_TIMEOUT_MS);
    connection.touchTimer = setInterval(() => { void touchConnection(connection); }, 20_000);
    connection.touchTimer.unref?.();

    ws.on('message', (raw) => {
      void handleMessage(connection, raw).catch(() => protocolError(ws, 'RELAY_PROVIDER_ERROR'));
    });
    ws.on('close', () => {
      clearTimeout(connection.helloTimer);
      clearInterval(connection.touchTimer);
      void removeConnection(connection);
    });
    ws.on('error', () => {
      clearTimeout(connection.helloTimer);
      clearInterval(connection.touchTimer);
      void removeConnection(connection);
    });
  });

  if (store) void pollInbox();
  return { server, wss, store, nodeId, localConnections };
}

function createRelayServer(options = {}) {
  const store = options.store === undefined ? createRedisRelayStore() : options.store;
  const requireDurable = options.requireDurable ?? DURABLE_REQUIRED_IN_PRODUCTION;
  if (store || requireDurable) return createDurableRelayServer({ store, requireDurable });
  return createMemoryRelayServer(options);
}

const defaultRelay = createRelayServer();
export const relayRooms = defaultRelay.rooms;
export const createDeviceRelayServer = createRelayServer;
export const createDeviceRelayStore = createRedisRelayStore;
export default defaultRelay.server;
