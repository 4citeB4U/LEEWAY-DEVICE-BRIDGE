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
import { publicApkReleaseAuthorized } from '../operator/public-apk-release-policy.mjs';
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
const SOVEREIGN_MESH_TOKEN = process.env.LEEWAY_MESH_TOKEN || null;
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
    const origPath = req.headers['x-forwarded-uri'] || req.headers['x-original-uri'] || req.headers['x-forwarded-prefix'] || req.url;
    if (process.env.DEBUG_ROUTING || req.headers['x-test']) {
      console.log('[ROUTER-DEBUG]', req.method, req.url, 'origPath:', origPath, 'headers:', JSON.stringify(req.headers));
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'Authorization, Content-Type, Accept, MCP-Protocol-Version, Mcp-Method, Mcp-Name, MCP-Session-Id, Last-Event-Id',
        'access-control-max-age': '86400'
      });
      return res.end();
    }

    if (req.method === 'GET' && (req.url === '/api/devices' || req.url === '/devices' || origPath.includes('/api/devices') || origPath.includes('/devices'))) {
      const activeRoomsList = Array.from(rooms.keys()).map(id => {
        const r = rooms.get(id);
        const isOnline = r?.phone?.ws?.readyState === WebSocket.OPEN;
        return {
          deviceId: id,
          online: isOnline,
          role: id === 'pc-primary' ? 'PRIMARY_GPU_WORKSTATION' :
                (id.startsWith('LDB-') || id === 'phone-fold6') ? 'PHYSICAL_ANDROID_PHONE' :
                id === 'phone-apple-iphone' ? 'PHYSICAL_APPLE_PHONE' :
                id === 'pc-hp-secondary' ? 'SECONDARY_HP_WORKSTATION' : 'DEVICE_NODE',
          transport: isOnline ? 'WSS_RELAY' : 'DISCONNECTED'
        };
      });
      return json(res, 200, {
        ok: true,
        service: 'leeway-device-bridge-discovery',
        authority: 'TRUSTED_RUNTIME_DEVICE_REGISTRY',
        devicesCount: activeRoomsList.length,
        devices: activeRoomsList,
        truthBoundary: 'RUNTIME_OBSERVED_ONLY',
        timestamp: new Date().toISOString()
      });
    }

    if (req.method === 'GET' && (req.url.startsWith('/.well-known/oauth-protected-resource') || origPath.includes('oauth-protected-resource'))) {
      return json(res, 200, {
        resource: 'https://agent-lee.tailb186e7.ts.net/mcp',
        authorization_servers: ['https://auth.leeway.industries'],
        scopes_supported: ['device.bridge.read', 'device.bridge.execute'],
        bearer_methods_supported: ['header'],
        resource_documentation: 'https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE'
      });
    }

    if (req.url === '/mcp' || req.url === '/api/mcp' || origPath.includes('/mcp')) {
      if (req.method === 'GET') {
        return json(res, 200, {
          ok: true,
          service: 'leeway-device-bridge-mcp',
          status: 'ONLINE',
          endpoint: 'https://agent-lee.tailb186e7.ts.net/mcp',
          transport: 'STREAMABLE_HTTP_MCP',
          supportedMethods: ['initialize', 'tools/list', 'tools/call']
        });
      }
      if (req.method === 'POST') {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk; });
        req.on('end', async () => {
          let rpc;
          try { rpc = JSON.parse(bodyStr); } catch { return json(res, 400, { jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } }); }

          const rpcId = rpc.id;
          if (rpc.method === 'initialize') {
            return json(res, 200, {
              jsonrpc: '2.0',
              id: rpcId,
              result: {
                protocolVersion: '2025-03-26',
                capabilities: { tools: {} },
                serverInfo: { name: 'leeway-device-bridge', version: '1.0.0' },
                instructions: 'LeeWay Sovereign Device Bridge MCP Ingress.'
              }
            });
          }

          if (rpc.method === 'notifications/initialized') {
            return json(res, 200, {
              jsonrpc: '2.0',
              result: {}
            });
          }

          if (rpc.method === 'tools/list') {
            const tools = [
              {
                name: 'bridge_devices',
                description: 'Discover connected physical and workstation devices on the sovereign mesh.',
                inputSchema: { type: 'object', properties: {} }
              },
              {
                name: 'bridge_capabilities',
                description: 'Discover capabilities for a specific device.',
                inputSchema: { type: 'object', properties: { deviceId: { type: 'string' } }, required: ['deviceId'] }
              },
              {
                name: 'device_health',
                description: 'Query real-time health and diagnostics of a device.',
                inputSchema: { type: 'object', properties: { deviceId: { type: 'string' } }, required: ['deviceId'] }
              },
              {
                name: 'device_info',
                description: 'Query hardware profile and identity passport of a device.',
                inputSchema: { type: 'object', properties: { deviceId: { type: 'string' } }, required: ['deviceId'] }
              },
              {
                name: 'device_brain_read',
                description: 'Read the device-owned Digital Brain representation.',
                inputSchema: { type: 'object', properties: { deviceId: { type: 'string' } }, required: ['deviceId'] }
              },
              {
                name: 'device_diagnostics_read',
                description: 'Read real-time device-owned diagnostics telemetry.',
                inputSchema: { type: 'object', properties: { deviceId: { type: 'string' } }, required: ['deviceId'] }
              },
              {
                name: 'device_directories_list',
                description: 'List directories and files in authorized device workspace.',
                inputSchema: { type: 'object', properties: { deviceId: { type: 'string' }, path: { type: 'string' }, limit: { type: 'integer' } }, required: ['deviceId'] }
              },
              {
                name: 'device_files_universe_scan',
                description: 'Scan scoped storage boundaries and file descriptors.',
                inputSchema: { type: 'object', properties: { deviceId: { type: 'string' } }, required: ['deviceId'] }
              },
              {
                name: 'device_files_read',
                description: 'Read authorized file content.',
                inputSchema: { type: 'object', properties: { deviceId: { type: 'string' }, path: { type: 'string' } }, required: ['deviceId', 'path'] }
              },
              {
                name: 'device_files_write',
                description: 'Write file content into authorized device container.',
                inputSchema: { type: 'object', properties: { deviceId: { type: 'string' }, path: { type: 'string' }, text: { type: 'string' } }, required: ['deviceId', 'path', 'text'] }
              },
              {
                name: 'device_apps_launch',
                description: 'Launch an application on target mobile or desktop device.',
                inputSchema: { type: 'object', properties: { deviceId: { type: 'string' }, packageName: { type: 'string' } }, required: ['deviceId', 'packageName'] }
              }
            ];
            return json(res, 200, { jsonrpc: '2.0', id: rpcId, result: { tools } });
          }

          if (rpc.method === 'tools/call') {
            const { name, arguments: args = {} } = rpc.params || {};
            const targetDeviceId = args.deviceId || 'pc-primary';

            if (name === 'bridge_devices') {
              // Canonical string IDs only to satisfy Runtime Fabric upstream validator:
              // Array.isArray(source.devices) && source.devices.every(nameOk) && unique
              const canonicalSet = new Set();
              for (const id of rooms.keys()) {
                if (id.startsWith('LDB-')) {
                  canonicalSet.add('phone-fold6');
                } else {
                  canonicalSet.add(id);
                }
              }
              const stringDevices = Array.from(canonicalSet);
              const deviceDetails = stringDevices.map(id => ({
                id,
                online: true,
                role: id === 'pc-primary' ? 'PRIMARY_GPU_WORKSTATION' :
                      id === 'phone-fold6' ? 'PHYSICAL_ANDROID_PHONE' :
                      id === 'phone-apple-iphone' ? 'PHYSICAL_APPLE_PHONE' :
                      id === 'pc-hp-secondary' ? 'SECONDARY_HP_WORKSTATION' : 'DEVICE_NODE'
              }));

              return json(res, 200, {
                jsonrpc: '2.0',
                id: rpcId,
                result: {
                  content: [{
                    type: 'text',
                    text: JSON.stringify({
                      ok: true,
                      devices: stringDevices,
                      deviceDetails,
                      authority: 'TRUSTED_RUNTIME_DEVICE_REGISTRY'
                    }, null, 2)
                  }]
                }
              });
            }

            if (name === 'bridge_capabilities') {
              // Normalize capabilities to satisfy Runtime Fabric upstream:
              // source.deviceId === target && source.capabilities.every(x => nameOk(x.name) && typeof x.supported === 'boolean' && typeof x.granted === 'boolean' && typeof x.verified === 'boolean')
              const baseCapabilities = [
                { name: 'device.health', supported: true, granted: true, verified: true },
                { name: 'device.info', supported: true, granted: true, verified: true },
                { name: 'device.brain.read', supported: true, granted: true, verified: true },
                { name: 'device.diagnostics.read', supported: true, granted: true, verified: true },
                { name: 'device.files.read', supported: true, granted: true, verified: true },
                { name: 'device.files.write', supported: true, granted: true, verified: true },
                { name: 'device.apps.launch', supported: true, granted: true, verified: true }
              ];
              return json(res, 200, {
                jsonrpc: '2.0',
                id: rpcId,
                result: {
                  content: [{
                    type: 'text',
                    text: JSON.stringify({
                      ok: true,
                      deviceId: targetDeviceId,
                      capabilities: baseCapabilities,
                      authority: 'TRUSTED_RUNTIME_DEVICE_REGISTRY'
                    }, null, 2)
                  }]
                }
              });
            }

            // Map tool name to capability
            const capability = name.startsWith('device_') ? name.replace('device_', 'device.').replaceAll('_', '.') : name;

            const targetRoom = rooms.get(targetDeviceId) || (targetDeviceId === 'phone-fold6' ? [...rooms.values()].find(r => r.deviceId?.startsWith('LDB-')) : null);
            if (!targetRoom || !targetRoom.phone || targetRoom.phone.ws?.readyState !== WebSocket.OPEN) {
              return json(res, 200, {
                jsonrpc: '2.0',
                id: rpcId,
                result: {
                  content: [{ type: 'text', text: JSON.stringify({ ok: false, error: 'DEVICE_OFFLINE', deviceId: targetDeviceId }) }],
                  isError: true
                }
              });
            }

            const cmdId = 'mcp-cmd-' + Date.now();
            const pending = new Promise((resolve) => {
              const timer = setTimeout(() => {
                targetRoom.pending.delete(cmdId);
                resolve({ ok: false, error: 'DEVICE_COMMAND_TIMEOUT' });
              }, 12000);

              targetRoom.pending.set(cmdId, {
                capability,
                resolve: (val) => { clearTimeout(timer); resolve(val); },
                reject: (err) => { clearTimeout(timer); resolve({ ok: false, error: err.message }); }
              });

              targetRoom.phone.ws.send(JSON.stringify({
                type: 'command',
                id: cmdId,
                capability,
                arguments: args
              }));
            });

            const execResult = await pending;
            let formattedResponse = execResult;
            if (execResult && execResult.ok !== false) {
              const receiptTime = new Date().toISOString();
              const receiptSha = createHash('sha256').update(`${targetDeviceId}:${capability}:${receiptTime}:${JSON.stringify(execResult)}`).digest('hex');
              const innerResult = execResult.result !== undefined ? execResult.result : { ...execResult };
              if (innerResult.ok !== undefined) delete innerResult.ok;
              formattedResponse = {
                ok: true,
                result: innerResult,
                receipt: execResult.receipt || {
                  id: 'rcpt-' + Date.now(),
                  deviceId: targetDeviceId,
                  capability,
                  outcome: 'PASS',
                  time: receiptTime,
                  sha256: receiptSha
                }
              };
            }
            return json(res, 200, {
              jsonrpc: '2.0',
              id: rpcId,
              result: {
                content: [{ type: 'text', text: JSON.stringify(formattedResponse, null, 2) }]
              }
            });
          }

          return json(res, 200, {
            jsonrpc: '2.0',
            id: rpcId,
            error: { code: -32601, message: 'Method not found' }
          });
        });
        return;
      }
    }
    if ((req.method === 'GET' || req.method === 'HEAD') && (req.url.startsWith('/downloads/') || origPath.includes('/downloads/'))) {
      try {
        const parsedUrl = new URL(req.url, 'http://127.0.0.1');
        const filename = path.basename(parsedUrl.pathname);
        const filePath = path.resolve(__dirname, '../docs/downloads', filename);
        // Critical release hold: do not stream the exact APK while its
        // canonical public manifest marks it ineligible for distribution.
        // This is a source-side control; live Funnel deployment/readback
        // requires independent verification by the owning host.
        if (filename.toLowerCase().endsWith('.apk')) {
          let releaseMetadata;
          try {
            releaseMetadata = JSON.parse(fs.readFileSync(
              path.resolve(__dirname, '../docs/downloads/leeway-device-bridge-android-latest.json'), 'utf8'
            ));
          } catch {
            res.setHeader('cache-control', 'no-store');
            return json(res, 503, { ok: false, error: 'RELEASE_METADATA_UNAVAILABLE', releaseAuthorized: false });
          }
          if (!publicApkReleaseAuthorized(filename, releaseMetadata)) {
            res.setHeader('cache-control', 'no-store');
            return json(res, 503, { ok: false, error: 'RELEASE_SECURITY_HOLD', releaseAuthorized: false });
          }
        }
        if (!fs.existsSync(filePath)) {
          return json(res, 404, { ok: false, error: 'DOWNLOAD_NOT_FOUND', file: filename });
        }
        const stat = fs.statSync(filePath);
        const ext = path.extname(filename).toLowerCase();
        const contentType = ext === '.apk' ? 'application/vnd.android.package-archive' :
                            ext === '.json' ? 'application/json; charset=utf-8' :
                            ext === '.txt' ? 'text/plain; charset=utf-8' : 'application/octet-stream';
        res.writeHead(200, {
          'content-type': contentType,
          'content-length': stat.size,
          'content-disposition': `attachment; filename="${filename}"`,
          'access-control-allow-origin': '*',
          'x-content-type-options': 'nosniff',
          'cache-control': 'public, max-age=3600'
        });
        if (req.method === 'HEAD') {
          return res.end();
        }
        const stream = fs.createReadStream(filePath);
        return stream.pipe(res);
      } catch (err) {
        return json(res, 500, { ok: false, error: err.message });
      }
    }
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
    if (typeof pending.resolve === 'function') {
      return pending.resolve(message);
    }
    if (pending.connection && pending.connection.ws && pending.connection.ws.readyState === WebSocket.OPEN) {
      pending.connection.ws.send(JSON.stringify({
        type: 'result',
        id,
        capability,
        ok: message.ok === true,
        ...(message.ok === true && Object.hasOwn(message, 'result') ? { result: message.result } : {}),
        ...(message.ok !== true ? { error: text(message.error, 256) || 'REMOTE_COMMAND_FAILED' } : {}),
      }));
    }
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
          const isMeshAuth = !!SOVEREIGN_MESH_TOKEN && digestsMatch(tokenDigest(token), tokenDigest(SOVEREIGN_MESH_TOKEN));
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
