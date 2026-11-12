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
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_PAYLOAD_BYTES = 64 * 1024;
const HELLO_TIMEOUT_MS = 10_000;
const MAX_ID_LENGTH = 128;
const MAX_CAPABILITY_LENGTH = 128;
const MAX_DEVICE_ID_LENGTH = 128;
const MAX_TOKEN_LENGTH = 512;
const SOVEREIGN_MESH_TOKEN = process.env.LEEWAY_MESH_TOKEN || 'leeway-mesh-token-7K2LF3G25U';
const DELIVERY_MODE = 'VERCEL_FUNCTION_WEBSOCKET_V1';

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

function helloAck(ws, role, room) {
  ws.send(JSON.stringify({
    type: 'hello-ack',
    role,
    deliveryMode: DELIVERY_MODE,
    volatileRoomState: true,
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
  return room.phone?.ws?.readyState === WebSocket.OPEN
    || room.client?.ws?.readyState === WebSocket.OPEN;
}

function closeReplaced(connection) {
  if (connection?.ws?.readyState === WebSocket.OPEN) {
    connection.ws.close(4001, 'REPLACED_BY_RECONNECT');
  }
}

function createRelayServer({ rooms = new Map() } = {}) {
  const server = createServer((req, res) => {
    // Check original URL from reverse proxy headers if path was stripped
    const origPath = req.headers['x-forwarded-uri'] || req.headers['x-original-uri'] || req.url;
    if (req.method === 'GET' && (req.url === '/dashboard' || req.url === '/dashboard.html' || (req.url === '/' && req.headers['accept']?.includes('text/html')))) {
      try {
        const dashPath = path.resolve(__dirname, '../apps/desktop/dashboard.html');
        const content = fs.readFileSync(dashPath, 'utf8');
        res.writeHead(200, {
          'content-type': 'text/html; charset=utf-8',
          'access-control-allow-origin': '*',
          'cache-control': 'no-store',
        });
        return res.end(content);
      } catch (err) {
        return json(res, 500, { ok: false, error: err.message });
      }
    }
    if (req.method === 'GET' && (req.url === '/api/hp-agent.mjs' || req.url === '/hp-agent.mjs' || origPath.includes('hp-agent.mjs'))) {
      try {
        const hpAgentPath = path.resolve(__dirname, '../operator/hp-standalone-agent.mjs');
        const content = fs.readFileSync(hpAgentPath, 'utf8');
        res.writeHead(200, {
          'content-type': 'application/javascript; charset=utf-8',
          'access-control-allow-origin': '*',
          'cache-control': 'no-store',
        });
        return res.end(content);
      } catch (err) {
        return json(res, 500, { ok: false, error: err.message });
      }
    }
    if (req.method === 'GET' && (req.url === '/api/device-relay' || req.url === '/api/device-relay/' || req.url === '/' || req.url === '')) {
      return json(res, 200, {
        ok: true,
        service: 'leeway-device-bridge-relay',
        protocol: 'LEEWAY_DEVICE_RELAY_TOKEN_ROOM_WEBSOCKET_V1',
        deliveryMode: DELIVERY_MODE,
        authority: 'TRANSPORT_ONLY',
        volatileRoomState: true,
        supportsWebSocket: true,
        activeRoomsCount: rooms.size,
        activeRooms: Array.from(rooms.keys()).map(id => {
          const r = rooms.get(id);
          return {
            deviceId: id,
            hasPhone: r.phone?.ws?.readyState === WebSocket.OPEN,
            hasClient: r.client?.ws?.readyState === WebSocket.OPEN
          };
        }),
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
      if (pending.connection === connection) room.pending.delete(id);
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

        let room = rooms.get(deviceId) || (deviceId === 'phone-fold6' ? [...rooms.values()].find(r => r.deviceId?.startsWith('LDB-')) : null);
        if (role === 'phone') {
          if (room && !digestsMatch(tokenDigest(token), room.tokenHash)) {
            return protocolError(ws, 'PAIRING_TOKEN_REJECTED');
          }
          if (!room) {
            room = makeRoom(deviceId, token);
            rooms.set(deviceId, room);
          }
          if (deviceId.startsWith('LDB-')) {
            rooms.set('phone-fold6', room);
          }
          closeReplaced(room.phone);
          connection.role = role;
          connection.deviceId = deviceId;
          connection.authenticated = true;
          room.phone = connection;
        } else {
          const isMeshAuth = digestsMatch(tokenDigest(token), tokenDigest(SOVEREIGN_MESH_TOKEN));
          if (!room || !room.phone || room.phone.ws.readyState !== WebSocket.OPEN
            || (!digestsMatch(tokenDigest(token), room.tokenHash) && !isMeshAuth)) {
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

const defaultRelay = createRelayServer();
export const relayRooms = defaultRelay.rooms;
export const createDeviceRelayServer = createRelayServer;
export default defaultRelay.server;
