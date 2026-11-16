import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = path.resolve(process.env.LEEWAY_CONTINUUM_ROOT || '');
const endpoint = process.env.LEEWAY_CONTINUUM_REPLICATION_URL || '';
const deviceId = process.env.LEEWAY_DEVICE_ID || '';
const retryMs = Math.max(1_000, Math.min(60_000, Number(process.env.LEEWAY_REPLICATION_RETRY_MS || 5_000)));
if (!root || !deviceId) throw new Error('LEEWAY_REPLICATION_IDENTITY_REQUIRED');
let url = null;
if (endpoint) {
  url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw new Error('LEEWAY_REPLICATION_HTTPS_REQUIRED');
}
const outbox = path.join(root, 'mesh-outbox');
const acknowledged = path.join(root, 'mesh-acknowledged');
const conflicts = path.join(root, 'mesh-conflicts');
const states = path.join(root, 'mesh-state');
await Promise.all([outbox, acknowledged, conflicts, states].map(value => fs.mkdir(value, { recursive: true })));

async function state(name, value) {
  const target = path.join(states, name);
  const temporary = `${target}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify({ ...value, observedUtc: new Date().toISOString() }));
  await fs.rename(temporary, target);
}

async function cycle() {
  if (!url) return;
  for (const name of (await fs.readdir(outbox)).filter(value => value.endsWith('.json')).slice(0, 32)) {
    const source = path.join(outbox, name);
    const bytes = await fs.readFile(source);
    const digest = createHash('sha256').update(bytes).digest('hex');
    let response;
    try {
      response = await fetch(url, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15_000),
        headers: { 'content-type': 'application/json', 'x-leeway-device-id': deviceId, 'idempotency-key': digest },
        body: bytes,
      });
    } catch { await state(name,{syncState:'RETRY_PENDING',digest}); continue; }
    if (response.ok) { await state(name,{syncState:'ACKNOWLEDGED',digest,status:response.status}); await fs.rename(source, path.join(acknowledged, name)); }
    else if (response.status === 409) { await state(name,{syncState:'CONFLICT',digest,status:409}); await fs.rename(source, path.join(conflicts, name)); }
    else await state(name,{syncState:'RETRY_PENDING',digest,status:response.status});
  }
}

for (;;) {
  await cycle();
  await new Promise(resolve => setTimeout(resolve, retryMs));
}
