import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';

const empty = z.object({}).strict();
const coordinate = z.number().finite().min(0).max(32768);
export const schemas = Object.freeze({
  'device.health': empty,
  'device.info': empty,
  'device.files.read': z.object({ path: z.string().min(1).max(1024) }).strict(),
  'device.files.write': z.object({ path: z.string().min(1).max(1024), text: z.string().max(65536) }).strict(),
  'device.process.execute': z.object({
    executable: z.enum(['node', 'npm', 'git', 'powershell']),
    arguments: z.array(z.string().max(2048)).max(64).default([]),
    cwd: z.string().min(1).max(1024).default('.'),
    timeoutMs: z.number().int().min(100).max(120000).default(30000),
  }).strict(),
  'device.screen.capture': empty,
  'device.ui.snapshot': empty,
  'device.ui.back': empty,
  'device.ui.home': empty,
  'device.ui.recents': empty,
  'device.ui.tap': z.object({ x: coordinate, y: coordinate }).strict(),
  'device.ui.swipe': z.object({ x1: coordinate, y1: coordinate, x2: coordinate, y2: coordinate, durationMs: z.number().int().min(100).max(2000).optional() }).strict(),
  'device.ui.text': z.object({ text: z.string().min(1).max(4096) }).strict(),
  'device.apps.list': empty,
  'device.apps.launch': z.object({ packageName: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z0-9_]+)+$/).max(255) }).strict(),
  'model.status': empty,
  'model.inference': z.object({ prompt: z.string().min(1).max(8192) }).strict(),
  'voice.status': empty,
  'voice.speak': z.object({ text: z.string().min(1).max(4096) }).strict(),
});

export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
export const digest = value => createHash('sha256').update(canonical(value)).digest('hex');

// Hashes bind evidence, but are not device signatures or Formula attestations.
export function receipt({ deviceId, capability, args, outcome, result, error, previousHash = null }) {
  const body = {
    version: 1, id: randomUUID(), time: new Date().toISOString(), deviceId, capability,
    outcome, argumentsHash: digest(args), resultHash: result === undefined ? null : digest(result),
    error: error || null, previousHash, authority: 'CONTROLLER_OBSERVATION', formula: 'NOT_EVALUATED',
  };
  return { ...body, sha256: digest(body) };
}

export class Bridge {
  constructor(devices, { admission, receiptSink = async () => { throw new Error('RECEIPT_SINK_REQUIRED'); } } = {}) {
    this.devices = new Map(devices.map(d => [d.id, d]));
    if (this.devices.size !== devices.length) throw new Error('DUPLICATE_DEVICE');
    this.admission = admission;
    this.receiptSink = receiptSink;
  }
  async discover(id) {
    const d = this.devices.get(id);
    if (!d) throw new Error('UNKNOWN_DEVICE');
    const supported = await d.adapter.discover();
    return { deviceId: id, capabilities: Object.keys(schemas).filter(c => supported.includes(c)).map(name => ({
      name, supported: true, granted: d.grants.includes(name), verified: false,
    })) };
  }
  async call(deviceId, capability, args = {}) {
    let value, error, outcome = 'BLOCKED';
    try {
      const d = this.devices.get(deviceId);
      if (!d) throw new Error('UNKNOWN_DEVICE');
      if (!Object.hasOwn(schemas, capability)) throw new Error('UNKNOWN_CAPABILITY');
      args = schemas[capability].parse(args);
      if (!d.grants.includes(capability)) throw new Error('CAPABILITY_NOT_GRANTED');
      if (!this.admission || await this.admission({ deviceId, capability, args }) !== true) throw new Error('ADMISSION_DENIED');
      if (!(await d.adapter.discover()).includes(capability)) throw new Error('CAPABILITY_UNAVAILABLE');
      // Durable pre-execution evidence failure prevents execution.
      const pre = receipt({ deviceId, capability, args, outcome: 'ADMITTED' });
      await this.receiptSink(pre);
      outcome = 'FAILED';
      value = await d.adapter.execute(capability, args);
      const post = receipt({ deviceId, capability, args, outcome: 'PASS', result: value, previousHash: pre.sha256 });
      await this.receiptSink(post);
      return { ok: true, result: value, receipt: post };
    } catch (e) {
      // Do not include arbitrary upstream error text, prompts or filesystem paths in audit records.
      error = /^[A-Z_]+$/.test(e.message) ? e.message : 'ADAPTER_OR_VALIDATION_FAILURE';
      const evidence = receipt({ deviceId, capability, args, outcome, error });
      try { await this.receiptSink(evidence); } catch { return { ok: false, error: 'RECEIPT_WRITE_FAILED', operationMayHaveExecuted: outcome === 'FAILED', receipt: evidence }; }
      return { ok: false, error, operationMayHaveExecuted: outcome === 'FAILED', receipt: evidence };
    }
  }
}
