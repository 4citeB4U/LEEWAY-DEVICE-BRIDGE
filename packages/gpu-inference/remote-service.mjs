import http from 'node:http';
import {createHmac, timingSafeEqual} from 'node:crypto';
import {openInference, sealInference} from './index.mjs';

const MAX_BODY = 64 * 1024;
const WINDOW_MS = 60_000;
const REPLAY_LIMIT = 10_000;
const PRIVATE_IPV4 = /^(?:10\.(?:\d{1,3}\.){2}\d{1,3}|192\.168\.(?:\d{1,3}\.)\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.(?:\d{1,3}\.)\d{1,3})$/;

function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}

function mac(key, data) {
  return createHmac('sha256', Buffer.from(key, 'hex')).update(data).digest('base64url');
}
function signedData(kind, id, issuedAt, envelope) {
  return `${kind}\n${id}\n${issuedAt}\n${canonical(envelope)}`;
}
function sameMac(expected, actual) {
  if (typeof actual !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(actual)) return false;
  const a = Buffer.from(expected, 'base64url');
  const b = Buffer.from(actual, 'base64url');
  return a.length === b.length && timingSafeEqual(a, b);
}
function validateResponse(value, requestId) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || value.requestId !== requestId
    || typeof value.model !== 'string' || value.model.length > 128
    || typeof value.response !== 'string' || value.response.trim().length < 1 || value.response.length > 16_384
    || value.backend !== 'Ollama CUDA preview'
    || value.authority !== 'UNADMITTED_PREVIEW'
    || typeof value.device !== 'string' || value.device.length > 128
    || !Number.isSafeInteger(value.vramBytes) || value.vramBytes < 1
    || !Number.isSafeInteger(value.elapsedMs) || value.elapsedMs < 0 || value.elapsedMs > 600_000) {
    throw Error('GPU_REMOTE_RESPONSE_INVALID');
  }
  return value;
}
async function readJson(req) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > MAX_BODY) throw Error('GPU_REMOTE_REQUEST_TOO_LARGE');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Error('GPU_REMOTE_REQUEST_INVALID'); }
}
const reply = (res, status, value) => {
  res.writeHead(status, {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff'});
  res.end(JSON.stringify(value));
};

export function createRemoteGpuClient({host, port = 4178, token, models = ['qwen3.5:4b'], fetchImpl = fetch, timeoutMs = 180_000, allowLoopbackTest = false} = {}) {
  if (typeof host !== 'string' || !(PRIVATE_IPV4.test(host) || (allowLoopbackTest && ['127.0.0.1', '::1'].includes(host))) || !Number.isInteger(port) || port < 1 || port > 65535) throw Error('GPU_REMOTE_TARGET_INVALID');
  if (typeof token !== 'string' || !/^[0-9a-f]{64}$/i.test(token)) throw Error('GPU_PAIRING_KEY_REQUIRED');
  const identity = {token, deviceId: 'leeway-gpu-paired-workstation'};
  return {
    mode: 'REMOTE_GPU_PREVIEW',
    async status() { return {available: models, availableOk: models.length > 0, mode: 'REMOTE_GPU_PREVIEW', target: `${host}:${port}`, backend: 'paired LeeWay GPU workstation'}; },
    async infer(request) {
      const issuedAt = Date.now();
      const envelope = sealInference(request, identity, {direction: 'request'});
      const signature = mac(token, signedData('request', request.requestId, issuedAt, envelope));
      const response = await fetchImpl(`http://${host}:${port}/v1/workstation/inference`, {
        method: 'POST',
        headers: {'content-type': 'application/json', 'x-leeway-gpu-pair': signature},
        body: JSON.stringify({version: 1, requestId: request.requestId, issuedAt, envelope}),
        signal: AbortSignal.timeout(timeoutMs),
      });
      let body;
      try { body = await response.json(); } catch { throw Error('GPU_REMOTE_RESPONSE_INVALID'); }
      if (!response.ok || body?.version !== 1 || body?.requestId !== request.requestId || body?.issuedAt !== issuedAt
        || !sameMac(mac(token, signedData('response', request.requestId, issuedAt, body.envelope)), body.mac)) {
        throw Error('GPU_REMOTE_REQUEST_FAILED');
      }
      return validateResponse(openInference(body.envelope, identity, {direction: 'response', id: request.requestId}), request.requestId);
    },
  };
}

export function createWorkstationGpuServer({host, port = 4178, token, adapter, now = () => Date.now(), allowLoopbackTest = false} = {}) {
  if (typeof host !== 'string' || !(PRIVATE_IPV4.test(host) || (allowLoopbackTest && ['127.0.0.1', '::1'].includes(host))) || !Number.isInteger(port) || port < (allowLoopbackTest ? 0 : 1) || port > 65535) throw Error('GPU_WORKSTATION_BIND_INVALID');
  if (typeof token !== 'string' || !/^[0-9a-f]{64}$/i.test(token)) throw Error('GPU_PAIRING_KEY_REQUIRED');
  if (!adapter || typeof adapter.infer !== 'function') throw Error('GPU_WORKSTATION_ADAPTER_REQUIRED');
  const identity = {token, deviceId: 'leeway-gpu-paired-workstation'};
  const seen = new Map();
  return http.createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/v1/workstation/inference') return reply(res, 404, {code: 'GPU_WORKSTATION_ROUTE_NOT_FOUND'});
    try {
      const body = await readJson(req);
      const issuedAt = Number(body?.issuedAt);
      const id = String(body?.requestId || '');
      if (body?.version !== 1 || !Number.isSafeInteger(issuedAt) || Math.abs(now() - issuedAt) > WINDOW_MS) throw Error('GPU_REMOTE_REQUEST_EXPIRED');
      if (seen.has(id)) throw Error('GPU_REMOTE_REPLAY_REJECTED');
      if (typeof req.headers['x-leeway-gpu-pair'] !== 'string'
        || !sameMac(mac(token, signedData('request', id, issuedAt, body.envelope)), req.headers['x-leeway-gpu-pair'])) throw Error('GPU_REMOTE_AUTHENTICATION_FAILED');
      const request = openInference(body.envelope, identity, {direction: 'request', id});
      if (request.requestId !== id) throw Error('GPU_REMOTE_REQUEST_INVALID');
      seen.set(id, now());
      for (const [key, at] of seen) if (now() - at > WINDOW_MS) seen.delete(key);
      if (seen.size > REPLAY_LIMIT) seen.delete(seen.keys().next().value);
      const result = validateResponse(await adapter.infer(request), id);
      const envelope = sealInference(result, identity, {direction: 'response', id});
      reply(res, 200, {version: 1, requestId: id, issuedAt, envelope, mac: mac(token, signedData('response', id, issuedAt, envelope))});
    } catch (error) {
      const code = /^[A-Z0-9_]+$/.test(error?.message || '') ? error.message : 'GPU_REMOTE_EXECUTION_FAILED';
      const status = code.includes('AUTHENTICATION') ? 401 : code.includes('EXPIRED') || code.includes('REPLAY') ? 409 : 400;
      reply(res, status, {code});
    }
  });
}
