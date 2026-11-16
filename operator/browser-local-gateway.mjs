/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.BROWSER_GATEWAY
TAG: LEEWAY.BROWSER.LOCAL.GATEWAY.V1
WHO: LeeWay Industries; WHAT: authenticated loopback browser-mesh gateway.
WHEN: 2026-11-16; WHERE: operator/browser-local-gateway.mjs.
WHY: Bind browser packages to the enrolled local Device Bridge without a public command surface.
HOW: Native-host bearer admission, allowlisted extension IDs, expiring one-use sessions, bounded WebSocket messages.
AUTHORITY: Local transport adapter only; Runtime admission and capability policy remain upstream.
LICENSE: MIT
*/
import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';

const MAX_BYTES = 64 * 1024;
const SESSION_TTL_MS = 5 * 60 * 1000;
const PAGE_TYPES = new Set([
  'COURIER_SELECTION',
  'COURIER_PAGE_CONTEXT',
  'COURIER_COMPOSER_OBSERVE_RESULT',
  'COURIER_COMPOSER_INPUT_RESULT',
  'COURIER_COMPOSER_SUBMIT_RESULT',
  'COURIER_RESPONSE_READ_RESULT',
  'TABLET_ACTION'
]);
const HOST_TYPES = new Set([
  'COURIER_OBSERVE',
  'COURIER_COMPOSER_OBSERVE',
  'COURIER_COMPOSER_INPUT',
  'COURIER_COMPOSER_SUBMIT',
  'COURIER_RESPONSE_READ',
  'TABLET_STATUS',
  'TABLET_MESSAGE'
]);

function equalSecret(actual, expected) {
  const left = Buffer.from(actual || '', 'utf8'), right = Buffer.from(expected || '', 'utf8');
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

function sendJson(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(value));
}

async function readBody(req) {
  const chunks = []; let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > MAX_BYTES) throw new Error('BODY_TOO_LARGE');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function createBrowserLocalGateway({
  host = '127.0.0.1', port = 4280,
  nativeHostSecret = process.env.LEEWAY_BROWSER_GATEWAY_SECRET,
  allowedExtensionIds = (process.env.LEEWAY_BROWSER_EXTENSION_IDS || '').split(',').map(v => v.trim()).filter(Boolean),
  sessionTtlMs = SESSION_TTL_MS,
} = {}) {
  if (!['127.0.0.1', '::1'].includes(host)) throw new Error('BROWSER_GATEWAY_LOOPBACK_REQUIRED');
  if (typeof nativeHostSecret !== 'string' || nativeHostSecret.length < 32) throw new Error('BROWSER_GATEWAY_SECRET_REQUIRED');
  const allowed = new Set(allowedExtensionIds);
  if (!allowed.size) throw new Error('BROWSER_EXTENSION_ALLOWLIST_REQUIRED');
  const sessions = new Map(), browsers = new Map();

  const server = createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') return sendJson(res, 200, {
      ok: true, service: 'LEEWAY_BROWSER_LOCAL_GATEWAY', authority: 'LOCAL_TRANSPORT_ONLY', connectedBrowsers: browsers.size,
    });
    if (req.method !== 'POST' || req.url !== '/native/session') return sendJson(res, 404, { ok: false, error: 'ROUTE_NOT_FOUND' });
    const bearer = /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1];
    if (!equalSecret(bearer, nativeHostSecret)) return sendJson(res, 401, { ok: false, error: 'NATIVE_HOST_UNAUTHORIZED' });
    try {
      const body = await readBody(req);
      if (!allowed.has(body?.extensionId)) return sendJson(res, 403, { ok: false, error: 'EXTENSION_NOT_ENROLLED' });
      const sessionToken = randomBytes(32).toString('base64url');
      const expiresUtc = new Date(Date.now() + sessionTtlMs).toISOString();
      sessions.set(sessionToken, { extensionId: body.extensionId, expiresUtc });
      return sendJson(res, 201, { type: 'LEEWAY_BROWSER_SESSION', sessionToken, wsUrl: `ws://${host}:${server.address().port}/mesh`, expiresUtc });
    } catch (error) { return sendJson(res, 400, { ok: false, error: error.message === 'BODY_TOO_LARGE' ? error.message : 'SESSION_REQUEST_INVALID' }); }
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_BYTES });
  server.on('upgrade', (req, socket, head) => {
    if (req.url !== '/mesh' || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) return socket.destroy();
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws));
  });
  wss.on('connection', ws => {
    let extensionId = null;
    const timer = setTimeout(() => ws.close(1008, 'HELLO_REQUIRED'), 5000);
    ws.on('message', raw => {
      let message;
      try { message = JSON.parse(raw.toString('utf8')); } catch { return ws.close(1008, 'MESSAGE_INVALID'); }
      if (!extensionId) {
        const session = sessions.get(message?.sessionToken);
        if (message?.type !== 'BROWSER_NODE_HELLO' || !session || session.extensionId !== message.extensionId || Date.parse(session.expiresUtc) <= Date.now()) return ws.close(1008, 'SESSION_REJECTED');
        sessions.delete(message.sessionToken);
        extensionId = message.extensionId; clearTimeout(timer); browsers.set(extensionId, ws);
        return ws.send(JSON.stringify({ type: 'BROWSER_NODE_ACK', extensionId, authority: 'LOCAL_TRANSPORT_ONLY' }));
      }
      if (!PAGE_TYPES.has(message?.type)) return ws.send(JSON.stringify({ type: 'BROWSER_MESSAGE_REJECTED' }));
      server.emit('browser-message', { extensionId, message });
    });
    ws.on('close', () => { clearTimeout(timer); if (browsers.get(extensionId) === ws) browsers.delete(extensionId); });
  });

  return {
    server, wss,
    listen: () => new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, () => resolve(server.address())); }),
    close: async () => { for (const ws of wss.clients) ws.terminate(); await new Promise(resolve => wss.close(resolve)); if (server.listening) await new Promise(resolve => server.close(resolve)); },
    send(extensionId, message) {
      if (!HOST_TYPES.has(message?.type)) throw new Error('BROWSER_HOST_MESSAGE_REJECTED');
      const ws = browsers.get(extensionId); if (!ws || ws.readyState !== WebSocket.OPEN) throw new Error('BROWSER_NODE_OFFLINE');
      ws.send(JSON.stringify(message));
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const gateway = createBrowserLocalGateway();
  const address = await gateway.listen();
  console.log(`[LEEWAY-BROWSER-GATEWAY] listening on ${address.address}:${address.port}`);
}
