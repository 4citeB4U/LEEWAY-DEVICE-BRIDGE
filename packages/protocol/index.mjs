/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.PROTOCOL
TAG: LEEWAY.BRIDGE_PARITY_SCHEMA_V1
WHO: LeeWay Industries; WHAT: cross-platform capability schemas and receipts.
WHEN: 2026-10-24; WHERE: packages/protocol/index.mjs.
WHY: Reject invalid arguments before adapter execution; retain C3 fail-closed admission.
HOW: Bounded strict Zod arguments and existing immutable receipt structure.
AUTHORITY: Contract only; not an owner grant or Veritas approval.
LICENSE: MIT
*/
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';

const empty = z.object({}).strict();
const coordinate = z.number().finite().min(0).max(32768);
export const schemas = Object.freeze({
  'device.health': empty,
  'device.info': empty,
  'device.documents.write_pdf': z.object({path:z.string().min(5).max(1024),title:z.string().max(200).default(''),text:z.string().min(1).max(32768)}).strict(),
  'device.audit.recent': z.object({offset:z.number().int().safe().min(0).default(0),limit:z.number().int().min(1).max(50).default(20)}).strict(),
  'device.audit.usage': z.object({}).strict(),
  'skills.list': z.object({query:z.string().max(128).default(''),offset:z.number().int().safe().min(0).default(0),limit:z.number().int().min(1).max(100).default(25)}).strict(),
  'skills.read': z.object({skillId:z.string().min(1).max(240),expectedSha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict(),
  'skills.invoke': z.object({requestId:z.string().regex(/^[A-Za-z0-9._-]{8,128}$/),developerId:z.string().regex(/^[A-Za-z0-9._-]{8,128}$/),skillIds:z.array(z.string().regex(/^[a-z0-9-]{2,100}$/)).min(1).max(8),planSha256:z.string().regex(/^[a-f0-9]{64}$/),nonce:z.string().regex(/^[a-f0-9]{64}$/)}).strict(),
  'device.files.read': z.object({ path: z.string().min(1).max(1024) }).strict(),
  'device.files.info': z.object({ path: z.string().min(1).max(1024) }).strict(),
  'device.files.read_multiple': z.object({ paths: z.array(z.string().min(1).max(1024)).min(1).max(8) }).strict(),
  'device.files.write': z.object({ path: z.string().min(1).max(1024), text: z.string().max(65536) }).strict(),
  'device.files.hash': z.object({ path: z.string().min(1).max(1024) }).strict(),
  'device.files.read_binary': z.object({ path: z.string().min(1).max(1024), offset: z.number().int().min(0).safe().default(0), length: z.number().int().min(1).max(262144).default(65536) }).strict(),
  'device.files.write_binary': z.object({ path: z.string().min(1).max(1024), base64: z.string().max(349528), expectedSha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
  'device.files.append_binary': z.object({path:z.string().min(1).max(1024),base64:z.string().max(349528),expectedOffset:z.number().int().safe().min(0),expectedSha256:z.string().regex(/^[a-f0-9]{64}$/),expectedChunkSha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict(),
  'device.files.move': z.object({ from: z.string().min(1).max(1024), to: z.string().min(1).max(1024), expectedSha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
  'device.files.edit': z.object({ path: z.string().min(1).max(1024), oldText: z.string().min(1).max(65536), newText: z.string().max(65536), expectedReplacements: z.number().int().min(1).max(1000), expectedSha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
  'device.directories.list': z.object({ path: z.string().min(1).max(1024).default('.'), limit: z.number().int().min(1).max(500).default(200) }).strict(),
  'device.directories.page': z.object({path:z.string().min(1).max(1024).default('.'),offset:z.number().int().safe().min(0).default(0),limit:z.number().int().min(1).max(500).default(100),expectedSnapshotSha256:z.string().regex(/^[a-f0-9]{64}$/).optional()}).strict(),
  'device.directories.create': z.object({ path: z.string().min(1).max(1024) }).strict(),
  'device.search.files': z.object({ path: z.string().min(1).max(1024).default('.'), query: z.string().min(1).max(128), limit: z.number().int().min(1).max(200).default(50) }).strict(),
  'device.search.content': z.object({ path: z.string().min(1).max(1024).default('.'), query: z.string().min(1).max(128), limit: z.number().int().min(1).max(50).default(20) }).strict(),
  'device.search.start': z.object({ path: z.string().min(1).max(1024).default('.'), query: z.string().min(1).max(128), mode: z.enum(['name','content']).default('name') }).strict(),
  'device.search.next': z.object({ searchId: z.string().uuid(), offset: z.number().int().safe().min(0).default(0), limit: z.number().int().min(1).max(50).default(20) }).strict(),
  'device.search.stop': z.object({ searchId: z.string().uuid() }).strict(),
  'device.search.list': z.object({ limit: z.number().int().min(1).max(20).default(10) }).strict(),
  'device.process.list': z.object({ limit: z.number().int().min(1).max(500).default(200) }).strict(),
  'device.process.terminate': z.object({ pid: z.number().int().min(1), expectedCommand: z.string().min(1).max(260) }).strict(),
  'device.job.start': z.object({
    executable: z.enum(['node', 'npm', 'git', 'powershell']),
    arguments: z.array(z.string().max(2048)).max(64).default([]),
    cwd: z.string().min(1).max(1024).default('.'),
    timeoutMs: z.number().int().min(1000).max(86400000).default(3600000),
  }).strict(),
  'device.job.status': z.object({ jobId: z.string().uuid() }).strict(),
  'device.job.stop': z.object({ jobId: z.string().uuid() }).strict(),
  'device.process.execute': z.object({
    executable: z.enum(['node', 'npm', 'git', 'powershell']),
    arguments: z.array(z.string().max(2048)).max(64).default([]),
    cwd: z.string().min(1).max(1024).default('.'),
    timeoutMs: z.number().int().min(100).max(120000).default(30000),
  }).strict(),
  'device.session.start': z.object({
    executable: z.enum(['node', 'npm', 'git', 'powershell']),
    arguments: z.array(z.string().max(2048)).max(64).default([]),
    cwd: z.string().min(1).max(1024).default('.'),
    timeoutMs: z.number().int().min(1000).max(1800000).default(300000),
  }).strict(),
  'device.session.read': z.object({
    sessionId: z.string().uuid(),
    stdoutOffset: z.number().int().safe().min(0).default(0),
    stderrOffset: z.number().int().safe().min(0).default(0),
    maxBytes: z.number().int().min(1).max(65536).default(16384),
  }).strict(),
  'device.session.input': z.object({
    sessionId: z.string().uuid(), text: z.string().max(32768),
    appendNewline: z.boolean().default(false), closeInput: z.boolean().default(false),
  }).strict(),
  'device.session.stop': z.object({sessionId: z.string().uuid()}).strict(),
  'device.session.list': z.object({limit: z.number().int().min(1).max(20).default(10)}).strict(),
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
  // GPU inference preview traffic uses an authenticated relay room plus an
  // application-level AES-GCM envelope. The relay must never receive prompts.
  'gpu.inference.preview.sealed': z.object({
    version: z.literal(1),
    nonce: z.string().regex(/^[A-Za-z0-9_-]{16}$/),
    ciphertext: z.string().min(1).max(48 * 1024),
    tag: z.string().regex(/^[A-Za-z0-9_-]{22}$/),
  }).strict(),
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
