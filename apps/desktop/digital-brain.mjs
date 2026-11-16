/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.TWO_PC
TAG: LEEWAY.DIGITAL_BRAIN_CONTINUUM_TRANSFER_V1
WHO: LeeWay Industries; WHAT: per-PC Continuum staging and Digital Brain index.
WHEN: 2026-11-15; WHERE: apps/desktop/digital-brain.mjs.
WHY: Keep stage-one file transfers out of a receiving Windows workspace.
HOW: hash-bound Continuum blobs, an atomically persisted index, and explicit materialization.
AUTHORITY: Local adapter implementation only; not Formula, Veritas, Receipt, or Ledger authority.
LICENSE: MIT
*/
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const indexFile = 'digital-brain-index.json';

function requireNodeId(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value)) throw new Error('DEVICE_ID_REQUIRED');
  return value;
}

function safeRelativePath(value) {
  if (typeof value !== 'string' || !value || path.isAbsolute(value)) throw new Error('MATERIALIZATION_PATH_INVALID');
  const normalized = path.normalize(value);
  if (normalized === '..' || normalized.startsWith(`..${path.sep}`) || normalized.includes('\0')) throw new Error('MATERIALIZATION_PATH_INVALID');
  return normalized;
}

function decodeBase64(value) {
  if (typeof value !== 'string' || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw new Error('CONTINUUM_PAYLOAD_INVALID');
  const bytes = Buffer.from(value, 'base64');
  if (!bytes.length || bytes.toString('base64') !== value) throw new Error('CONTINUUM_PAYLOAD_INVALID');
  return bytes;
}

export class DigitalBrainEngine {
  constructor({ nodeId, continuumRoot, workspaceRoot, diagnostics = null } = {}) {
    this.nodeId = requireNodeId(nodeId);
    if (!continuumRoot || !workspaceRoot) throw new Error('DEVICE_STORAGE_ROOT_REQUIRED');
    this.continuumRoot = path.resolve(continuumRoot);
    this.workspaceRoot = path.resolve(workspaceRoot);
    this.diagnostics = diagnostics;
  }

  async initialize() {
    await fs.mkdir(this.continuumRoot, { recursive: true, mode: 0o700 });
    await fs.mkdir(this.workspaceRoot, { recursive: true, mode: 0o700 });
    try { await fs.access(this.indexPath()); }
    catch { await this.writeIndex({ version: 1, nodeId: this.nodeId, records: {} }); }
  }

  indexPath() { return path.join(this.continuumRoot, indexFile); }
  blobPath(transferId) { return path.join(this.continuumRoot, `${transferId}.blob`); }

  async readIndex() {
    await this.initialize();
    let value;
    try { value = JSON.parse(await fs.readFile(this.indexPath(), 'utf8')); }
    catch { throw new Error('DIGITAL_BRAIN_INDEX_INVALID'); }
    if (value?.version !== 1 || value.nodeId !== this.nodeId || !value.records || Array.isArray(value.records)) throw new Error('DIGITAL_BRAIN_INDEX_INVALID');
    return value;
  }

  async writeIndex(value) {
    const temporary = `${this.indexPath()}.${randomUUID()}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(value, null, 2), { encoding: 'utf8', mode: 0o600 });
    await fs.rename(temporary, this.indexPath());
  }

  async stage({ transferId, sourceNodeId, targetNodeId, filename, base64, expectedSha256, transport, sourceProof }) {
    await this.initialize();
    requireNodeId(sourceNodeId);
    if (targetNodeId !== this.nodeId) throw new Error('CONTINUUM_TARGET_NODE_MISMATCH');
    if (sourceNodeId === targetNodeId || typeof transferId !== 'string' || !/^[0-9a-f-]{36}$/i.test(transferId)) throw new Error('CONTINUUM_TRANSFER_INVALID');
    if (typeof filename !== 'string' || !/^[^\\/:*?"<>|\x00-\x1f]{1,240}$/.test(filename)) throw new Error('CONTINUUM_FILENAME_INVALID');
    if (!['relay', 'sub-link'].includes(transport)) throw new Error('CONTINUUM_TRANSPORT_INVALID');
    if (transport === 'relay' && (
      !sourceProof || sourceProof.capsuleSha256 !== expectedSha256 ||
      typeof sourceProof.nonce !== 'string' || sourceProof.nonce.length < 1 || sourceProof.nonce.length > 128 ||
      typeof sourceProof.signature !== 'string' || sourceProof.signature.length < 32 || sourceProof.signature.length > 16_384
    )) throw new Error('CONTINUUM_SOURCE_PROOF_REQUIRED');
    const bytes = decodeBase64(base64);
    if (hash(bytes) !== expectedSha256) throw new Error('CONTINUUM_DIGEST_MISMATCH');
    const index = await this.readIndex();
    if (index.records[transferId]) throw new Error('CONTINUUM_TRANSFER_EXISTS');
    const temporary = `${this.blobPath(transferId)}.${randomUUID()}.tmp`;
    await fs.writeFile(temporary, bytes, { mode: 0o600 });
    await fs.rename(temporary, this.blobPath(transferId));
    const record = {
      transferId, sourceNodeId, targetNodeId, filename, sha256: expectedSha256, byteLength: bytes.length,
      transport, sourceProof: sourceProof ? {
        capsuleSha256: sourceProof.capsuleSha256,
        nonce: sourceProof.nonce,
        signature: sourceProof.signature,
      } : null,
      inContinuum: true, materializedToWindowsOs: false, stagedAt: new Date().toISOString(), materializedAt: null,
    };
    index.records[transferId] = record;
    await this.writeIndex(index);
    return { ...record };
  }

  async read({ transferId, offset = 0, length = 65536 }) {
    const index = await this.readIndex();
    const record = index.records[transferId];
    if (!record || record.inContinuum !== true) throw new Error('CONTINUUM_TRANSFER_NOT_FOUND');
    const bytes = await fs.readFile(this.blobPath(transferId));
    if (hash(bytes) !== record.sha256) throw new Error('CONTINUUM_BLOB_INTEGRITY_FAILED');
    const start = Math.min(offset, bytes.length);
    const end = Math.min(start + length, bytes.length);
    return { record: { ...record }, offset: start, eof: end === bytes.length, base64: bytes.subarray(start, end).toString('base64') };
  }

  async materialize({ transferId, destinationPath, explicitUserRequest }) {
    if (explicitUserRequest !== true) throw new Error('EXPLICIT_USER_REQUEST_REQUIRED');
    const relative = safeRelativePath(destinationPath);
    const index = await this.readIndex();
    const record = index.records[transferId];
    if (!record || record.inContinuum !== true) throw new Error('CONTINUUM_TRANSFER_NOT_FOUND');
    const bytes = await fs.readFile(this.blobPath(transferId));
    if (hash(bytes) !== record.sha256) throw new Error('CONTINUUM_BLOB_INTEGRITY_FAILED');
    const destination = path.resolve(this.workspaceRoot, relative);
    if (destination !== this.workspaceRoot && !destination.startsWith(`${this.workspaceRoot}${path.sep}`)) throw new Error('MATERIALIZATION_PATH_INVALID');
    await fs.mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
    const temporary = `${destination}.${randomUUID()}.tmp`;
    await fs.writeFile(temporary, bytes, { mode: 0o600 });
    const onDisk = await fs.readFile(temporary);
    if (hash(onDisk) !== record.sha256) { await fs.rm(temporary, { force: true }); throw new Error('MATERIALIZATION_DIGEST_MISMATCH'); }
    await fs.rename(temporary, destination);
    record.materializedToWindowsOs = true;
    record.materializedAt = new Date().toISOString();
    record.materializedSha256 = record.sha256;
    index.records[transferId] = record;
    await this.writeIndex(index);
    return { transferId, sha256: record.sha256, byteLength: record.byteLength, materializedToWindowsOs: true };
  }

  async readback() {
    const index = await this.readIndex();
    return { nodeId: this.nodeId, index: Object.values(index.records).map(record => ({ ...record })) };
  }

  async diagnosticsReadback() {
    const brain = await this.readback();
    const host = typeof this.diagnostics === 'function' ? await this.diagnostics() : {};
    return { nodeId: this.nodeId, diagnostics: host, digitalBrainRecords: brain.index.length, continuumRecords: brain.index.filter(record => record.inContinuum).length };
  }
}

