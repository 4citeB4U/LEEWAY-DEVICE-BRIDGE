/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE
TAG: LEEWAY.DEVICE.BRIDGE.DESKTOP_PARITY_BATCH2
5WH:
WHAT = Acceptance tests for bounded file metadata and multiple-file reads.
WHY = Advance Desktop Commander parity without bypassing production admission.
WHO = Leeway Industries / authorized maintainers.
WHERE = tests/mcp/desktop-parity-batch2.test.mjs
WHEN = 2026-10-23
HOW = Isolated fixtures, MCP registration checks and negative boundary tests.
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { DesktopAdapter } from '../../apps/desktop/adapter.mjs';
import { schemas, Bridge } from '../../packages/protocol/index.mjs';
import { createServer } from '../../apps/desktop/mcp-server.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

test('metadata and multi-file read are bounded by the same workspace', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'leeway-parity2-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, 'alpha.txt'), 'alpha');
  await fs.writeFile(path.join(root, 'beta.txt'), 'beta');
  const adapter = new DesktopAdapter(root);
  const supported = await adapter.discover();
  assert.ok(supported.includes('device.files.info'));
  assert.ok(supported.includes('device.files.read_multiple'));
  const meta = await adapter.execute('device.files.info', { path: 'alpha.txt' });
  assert.equal(meta.type, 'file');
  assert.equal(meta.sizeBytes, 5);
  assert.match(meta.modifiedUtc, /^20\d\d-/);
  const batch = await adapter.execute('device.files.read_multiple', { paths: ['alpha.txt', 'beta.txt'] });
  assert.deepEqual(batch.files, [{ path: 'alpha.txt', text: 'alpha' }, { path: 'beta.txt', text: 'beta' }]);
  assert.equal(batch.totalBytes, 9);
  await assert.rejects(adapter.execute('device.files.info', { path: '../secret.txt' }), /INVALID_PATH|PATH_OUTSIDE_WORKSPACE/);
  await assert.rejects(adapter.execute('device.files.read_multiple', { paths: ['alpha.txt', '../secret.txt'] }), /INVALID_PATH|PATH_OUTSIDE_WORKSPACE/);
  await assert.rejects(adapter.execute('device.files.read_multiple', { paths: [] }), /INVALID_BATCH_SIZE/);
  await assert.rejects(adapter.execute('device.files.read_multiple', { paths: Array(9).fill('alpha.txt') }), /INVALID_BATCH_SIZE/);
  assert.equal(schemas['device.files.read_multiple'].safeParse({ paths: Array(9).fill('alpha.txt') }).success, false);
  const outsider = await fs.mkdtemp(path.join(os.tmpdir(), 'leeway-parity2-out-'));
  t.after(() => fs.rm(outsider, { recursive: true, force: true }));
  await fs.writeFile(path.join(outsider, 'private.txt'), 'secret');
  try {
    await fs.symlink(path.join(outsider, 'private.txt'), path.join(root, 'linked.txt'), 'file');
    await assert.rejects(adapter.execute('device.files.info', { path: 'linked.txt' }), /LINK_NOT_ALLOWED/);
    await assert.rejects(adapter.execute('device.files.read_multiple', { paths: ['linked.txt'] }), /LINK_NOT_ALLOWED/);
  } catch (error) {
    if (error.code !== 'EPERM' && error.code !== 'EACCES') throw error;
  }
});

test('content search is bounded, ignores links, and reports lines', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'leeway-parity-content-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'nested'));
  await fs.writeFile(path.join(root, 'nested', 'alpha.txt'), 'first line\nFormula active\nthird line');
  await fs.writeFile(path.join(root, 'nested', 'beta.txt'), 'no match');
  const adapter = new DesktopAdapter(root);
  const args = schemas['device.search.content'].parse({ path: '.', query: 'formula', limit: 10 });
  const output = await adapter.execute('device.search.content', args);
  assert.equal(output.matches.length, 1);
  assert.equal(output.matches[0].line, 2);
  assert.match(output.matches[0].path, /alpha\.txt$/);
  assert.match(output.matches[0].excerpt, /Formula active/);
  assert.equal(schemas['device.search.content'].safeParse({ query: 'x', limit: 200 }).success, false);
  await assert.rejects(adapter.execute('device.search.content', { path: '..', query: 'formula', limit: 20 }), /INVALID_PATH|PATH_OUTSIDE_WORKSPACE/);
  const limit = await adapter.execute('device.search.content', { path: '.', query: 'line', limit: 1 });
  assert.equal(limit.matches.length, 1);
  try {
    await fs.symlink(path.join(root, 'nested'), path.join(root, 'linked'), 'dir');
    const linked = await adapter.execute('device.search.content', args);
    assert.equal(linked.matches.length, 1);
  } catch (error) {
    if (error.code !== 'EPERM' && error.code !== 'EACCES') throw error;
  }
});
test('new MCP tools register but protected calls remain denied in production default', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'leeway-parity2-mcp-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, 'read.txt'), 'not-executed');
  const device = { id: 'parity-host', grants: ['device.files.info', 'device.files.read_multiple'], adapter: new DesktopAdapter(root) };
  const server = createServer(new Bridge([device], { receiptSink: async () => {} }));
  const client = new Client({ name: 'parity2-test', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  t.after(() => Promise.all([client.close(), server.close()]));
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  const listing = await client.listTools();
  assert.ok(listing.tools.some(x => x.name === 'device_files_info'));
  assert.ok(listing.tools.some(x => x.name === 'device_files_read_multiple'));
  assert.ok(listing.tools.some(x => x.name === 'device_search_content'));
  const res = await client.callTool({ name: 'device_files_read_multiple', arguments: { deviceId: 'parity-host', arguments: { paths: ['read.txt'] } } });
  assert.equal(JSON.parse(res.content[0].text).error, 'ADMISSION_DENIED');
});

