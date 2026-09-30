import WebSocket from 'ws';
import { randomUUID } from 'node:crypto';
import { schemas } from '../protocol/index.mjs';

// Android JSONObject.put(List) in older builds emitted Java's list string.
// Parse only its bounded name grammar; never evaluate or infer missing entries.
export function parseRemoteQualified(raw) {
  let names;
  if (Array.isArray(raw)) names = raw;
  else if (typeof raw === 'string' && raw.length <= 16384 && /^\[[^\[\]\r\n]*\]$/.test(raw)) {
    const body = raw.slice(1, -1).trim();
    names = body === '' ? [] : body.split(',').map(name => name.trim());
  } else throw new Error('INVALID_CAPABILITY_RESPONSE');
  if (names.length > 256 || names.some(name => typeof name !== 'string' || name.length > 128 || !/^[a-z][a-z0-9]*(?:[.-][a-z][a-z0-9]*)+$/.test(name))) throw new Error('INVALID_CAPABILITY_RESPONSE');
  return [...new Set(names)].filter(name => Object.hasOwn(schemas, name));
}

// Client adapter for the existing owner-token relay. No new relay/server authority.
export class RelayAdapter {
  constructor({ deviceId, token, url = 'wss://agent-lee-x.vercel.app/api/device-relay', timeoutMs = 30000, allowLoopbackTest = false }) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'wss:' && !(allowLoopbackTest && parsed.protocol === 'ws:' && ['127.0.0.1', '[::1]'].includes(parsed.hostname))) throw new Error('TLS_REQUIRED');
    if (!deviceId || !token) throw new Error('MISSING_RELAY_IDENTITY');
    Object.assign(this, { deviceId, token, url, timeoutMs });
  }
  async discover() {
    const value = await this.execute('device.capabilities', {});
    return parseRemoteQualified(value?.remoteQualified);
  }
  execute(capability, args) {
    return new Promise((resolve, reject) => {
      const id = randomUUID();
      const socket = new WebSocket(this.url, { maxPayload: 8 * 1024 * 1024, handshakeTimeout: this.timeoutMs, followRedirects: false });
      let finished = false, authenticated = false;
      const done = (error, result) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        socket.terminate();
        error ? reject(new Error(error)) : resolve(result);
      };
      const timer = setTimeout(() => done('RELAY_TIMEOUT'), this.timeoutMs);
      socket.on('open', () => socket.send(JSON.stringify({ type: 'hello', role: 'client', deviceId: this.deviceId, token: this.token })));
      socket.on('message', raw => {
        let msg;
        try { msg = JSON.parse(raw.toString()); } catch { return done('INVALID_RELAY_RESPONSE'); }
        if (msg.type === 'hello-ack' && !authenticated) {
          authenticated = true;
          socket.send(JSON.stringify({ type: 'command', id, capability, arguments: args }));
        } else if (msg.type === 'result' && msg.id === id) {
          if (!authenticated || msg.capability !== capability || msg.ok !== true || msg.result?.ok === false) return done('REMOTE_EXECUTION_DENIED');
          if (!Object.hasOwn(msg, 'result')) return done('INVALID_RELAY_RESPONSE');
          done(null, msg.result);
        } else if (msg.type === 'error') done('RELAY_REJECTED');
      });
      socket.on('error', () => done('RELAY_CONNECTION_FAILED'));
      socket.on('close', () => done('RELAY_CLOSED'));
    });
  }
}
