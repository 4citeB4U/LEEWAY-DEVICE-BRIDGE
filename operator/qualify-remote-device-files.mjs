import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const deviceId = process.env.LEEWAY_DEVICE_ID;
const token = process.env.LEEWAY_PAIRING_TOKEN;
const relay = process.env.LEEWAY_RELAY_WS || 'ws://127.0.0.1:8008/api/device-relay';
if (!deviceId || !token) throw new Error('OWNER_DEVICE_AND_PAIRING_TOKEN_REQUIRED');

const command = (capability, args, timeoutMs = 12000) => new Promise((resolve, reject) => {
  const ws = new WebSocket(relay);
  const id = `cmd-${crypto.randomBytes(8).toString('hex')}`;
  const timer = setTimeout(() => { try { ws.close(); } catch {}; reject(new Error('REMOTE_RESULT_TIMEOUT')); }, timeoutMs);
  const finish = value => { clearTimeout(timer); try { ws.close(); } catch {}; resolve(value); };
  ws.onopen = () => ws.send(JSON.stringify({ type: 'hello', role: 'client', deviceId, token }));
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.type === 'hello-ack') ws.send(JSON.stringify({ type: 'command', id, capability, arguments: args }));
    else if (message.type === 'result' && message.id === id) finish(message);
    else if (message.type === 'error') finish({ ok: false, error: message.error });
  };
  ws.onerror = reject;
});

const runId = crypto.randomUUID();
const remotePath = `qualification/${runId}.json`;
const first = JSON.stringify({ protocol: 'LEEWAY_REMOTE_FILE_QUALIFICATION_V1', sequence: 1, runId });
const second = JSON.stringify({ protocol: 'LEEWAY_REMOTE_FILE_QUALIFICATION_V1', sequence: 2, runId });
const write1 = await command('device.files.write', { path: remotePath, text: first });
const read1 = await command('device.files.read', { path: remotePath });
const write2 = await command('device.files.write', { path: remotePath, text: second });
const read2 = await command('device.files.read', { path: remotePath });
const verified = write1.ok === true && read1.ok === true && write2.ok === true && read2.ok === true &&
  read1.result?.text === first && read2.result?.text === second &&
  write1.result?.sha256 !== write2.result?.sha256 && read2.result?.sha256 === write2.result?.sha256;
const evidence = {
  schema: 'LEEWAY_REMOTE_ANDROID_FILE_QUALIFICATION_V1', runId, deviceId, remotePath,
  write1: { ok: write1.ok, result: write1.result, error: write1.error || null },
  read1: { ok: read1.ok, result: read1.result, error: read1.error || null },
  write2: { ok: write2.ok, result: write2.result, error: write2.error || null },
  read2: { ok: read2.ok, result: read2.result, error: read2.error || null },
  verified,
  authority: 'REMOTE_ANDROID_APP_CONTAINER_OBSERVATION',
  veritas: 'INDEPENDENT_DECISION_NOT_ISSUED', receipt: 'CANONICAL_RECEIPT_NOT_CREATED', production: 'HOLD'
};
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'evidence', 'qualification');
await fs.mkdir(root, { recursive: true });
const file = path.join(root, `remote-file-${runId}.json`);
await fs.writeFile(file, JSON.stringify(evidence, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ verified, evidencePath: file, evidenceSha256: crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex') }));
if (!verified) process.exitCode = 1;
