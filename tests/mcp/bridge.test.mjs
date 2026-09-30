import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { WebSocketServer } from 'ws';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Bridge, digest } from '../../packages/protocol/index.mjs';
import { RelayAdapter, parseRemoteQualified } from '../../packages/agent-relay/index.mjs';
import { DesktopAdapter } from '../../apps/desktop/adapter.mjs';
import { createServer } from '../../apps/desktop/mcp-server.mjs';

test('real SDK stdio tools/list and tools/call create/read plus fail-closed checks and receipts', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'leeway-mcp-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'workspace'));
  await fs.writeFile(path.join(root, 'config.json'), JSON.stringify({ devices: [{ id: 'test-host', type: 'desktop', workspace: 'workspace', grants: ['device.health', 'device.files.read', 'device.files.write', 'device.ui.tap'] }], receipts: 'receipts.jsonl' }));
  const client = new Client({ name: 'acceptance-test', version: '1.0.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args: [path.resolve('apps/desktop/mcp-server.mjs'), path.join(root, 'config.json')], stderr: 'pipe' });
  t.after(() => client.close());
  await client.connect(transport);
  const listing = await client.listTools();
  assert.ok(listing.tools.some(x => x.name === 'device_files_write' && x.inputSchema.properties.deviceId));
  const invoke = async (name, args) => {
    const r = await client.callTool({ name, arguments: args });
    return { ...JSON.parse(r.content[0].text), isError: r.isError };
  };
  const scope = { deviceId: 'test-host' };
  const caps = await invoke('bridge_capabilities', scope);
  assert.equal(caps.capabilities.find(x => x.name === 'device.files.write').granted, true);
  assert.ok(!caps.capabilities.some(x => x.name === 'device.ui.tap'));
  const written = await invoke('device_files_write', { ...scope, arguments: { path: 'proof.txt', text: 'device bridge proof' } });
  assert.equal(written.ok, true);
  const read = await invoke('device_files_read', { ...scope, arguments: { path: 'proof.txt' } });
  assert.equal(read.result.text, 'device bridge proof');
  const { sha256, ...body } = read.receipt;
  assert.equal(sha256, digest(body));
  assert.equal(read.receipt.formula, 'NOT_EVALUATED');
  assert.equal((await invoke('device_files_write', { ...scope, arguments: { path: 'proof.txt', text: 'overwrite' } })).ok, false);
  assert.equal((await invoke('device_files_read', { ...scope, arguments: { path: '../config.json' } })).ok, false);
  assert.equal((await invoke('device_ui_tap', { ...scope, arguments: { x: 1, y: 1 } })).error, 'CAPABILITY_UNAVAILABLE');
  assert.equal((await invoke('device_info', { ...scope, arguments: {} })).error, 'CAPABILITY_NOT_GRANTED');
  assert.equal((await invoke('device_health', { deviceId: 'unknown', arguments: {} })).error, 'UNKNOWN_DEVICE');
  const invalid = await client.callTool({ name: 'device_ui_tap', arguments: { ...scope, arguments: { x: -1, y: 1 } } });
  assert.equal(invalid.isError, true);
  const records = (await fs.readFile(path.join(root, 'receipts.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.ok(records.some(r => r.outcome === 'BLOCKED'));
  assert.ok(records.filter(r => r.outcome === 'PASS').every(r => records.some(p => p.sha256 === r.previousHash && p.outcome === 'ADMITTED')));
  assert.ok(!JSON.stringify(records).includes('device bridge proof'));
});

test('admission denies by default, capability withdrawal and receipt failures do not execute', async () => {
  let count = 0;
  let supported = ['device.health'];
  const device = { id: 'host', grants: ['device.health'], adapter: { discover: async () => supported, execute: async () => { count++; return { ok: true }; } } };
  assert.equal((await new Bridge([device], { receiptSink: async () => {} }).call('host', 'device.health', {})).error, 'ADMISSION_DENIED');
  const bridge = new Bridge([device], { admission: async () => true, receiptSink: async () => {} });
  assert.equal((await bridge.call('host', 'device.health', {})).ok, true);
  supported = [];
  assert.equal((await bridge.call('host', 'device.health', {})).error, 'CAPABILITY_UNAVAILABLE');
  supported = ['device.health'];
  const brokenReceipt = new Bridge([device], { admission: async () => true, receiptSink: async () => { throw Error('disk full'); } });
  assert.equal((await brokenReceipt.call('host', 'device.health', {})).error, 'RECEIPT_WRITE_FAILED');
  assert.equal(count, 1);
  assert.equal((await bridge.call('host', '__proto__', {})).error, 'UNKNOWN_CAPABILITY');
});

test('relay timeout and malformed envelope reject without hanging', async t => {
  const server = new WebSocketServer({ host: '127.0.0.1', port: 0 });
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  let mode = 'timeout';
  server.on('connection', socket => {
    socket.on('message', () => { if (mode === 'malformed') socket.send('not-json'); });
  });
  const relay = new RelayAdapter({ deviceId: 'test', token: 'test', url: `ws://127.0.0.1:${server.address().port}`, allowLoopbackTest: true, timeoutMs: 100 });
  await assert.rejects(relay.discover(), /RELAY_TIMEOUT/);
  mode = 'malformed';
  await assert.rejects(relay.discover(), /INVALID_RELAY_RESPONSE/);
});

test('existing relay wire contract, authentication failure, capability discovery and nested denial', async t => {
  const server = new WebSocketServer({ host: '127.0.0.1', port: 0 });
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  let commands = 0;
  server.on('connection', socket => {
    let authenticated = false;
    socket.on('message', raw => {
      const message = JSON.parse(raw.toString());
      if (message.type === 'hello') {
        assert.equal(message.role, 'client');
        assert.equal(message.deviceId, 'fold-test');
        authenticated = message.token === 'test-owner-token';
        socket.send(JSON.stringify({ type: authenticated ? 'hello-ack' : 'error' }));
      } else if (message.type === 'command') {
        assert.equal(authenticated, true);
        assert.ok(message.id);
        commands++;
        const result = message.capability === 'device.capabilities' ? { remoteQualified: ['device.health', 'voice.speak'] }
          : message.capability === 'voice.speak' ? { ok: false, error: 'VOICE_UNAVAILABLE' } : { ok: true, source: 'mock-phone' };
        socket.send(JSON.stringify({ type: 'result', id: message.id, capability: message.capability, ok: true, result }));
      }
    });
  });
  const options = { deviceId: 'fold-test', token: 'test-owner-token', url: `ws://127.0.0.1:${server.address().port}`, allowLoopbackTest: true, timeoutMs: 500 };
  const relay = new RelayAdapter(options);
  assert.deepEqual(await relay.discover(), ['device.health', 'voice.speak']);
  assert.equal((await relay.execute('device.health', {})).source, 'mock-phone');
  await assert.rejects(relay.execute('voice.speak', { text: 'test' }), /REMOTE_EXECUTION_DENIED/);
  await assert.rejects(new RelayAdapter({ ...options, token: 'wrong' }).discover(), /RELAY_REJECTED/);
  assert.equal(commands, 3);
  assert.throws(() => new RelayAdapter({ ...options, allowLoopbackTest: false }), /TLS_REQUIRED/);
});

test('bounded legacy Android capability list accepts only declared names and rejects malformed input', () => {
  const actualLegacy = '[device.health, device.info, device.capabilities, device.bluetooth.list-bonded, device.network.discover, device.receipts, model.status, model.inference, voice.status, voice.speak, agent.chat]';
  assert.deepEqual(parseRemoteQualified(actualLegacy), ['device.health', 'device.info', 'model.status', 'model.inference', 'voice.status', 'voice.speak']);
  assert.deepEqual(parseRemoteQualified(['device.health', 'device.health', 'device.unsupported']), ['device.health']);
  assert.deepEqual(parseRemoteQualified('[]'), []);
  assert.deepEqual(parseRemoteQualified('[ device.health ]'), ['device.health']);
  for (const malformed of [null, {}, true, 'device.health', '[device.health,]', '[,device.health]', '["device.health"]', '[device.health; process.exit()]', '[device.health\n]', '[[device.health]]', '[device.health,,model.status]', '[device.health]suffix', ['device.health', 42], ['device.health', ''], Array(257).fill('device.health'), '[' + 'a'.repeat(16384) + ']']) {
    assert.throws(() => parseRemoteQualified(malformed), /INVALID_CAPABILITY_RESPONSE/);
  }
});

test('legacy serialized discovery supports governed bridge invocation over mock relay', async t => {
  const server = new WebSocketServer({ host: '127.0.0.1', port: 0 });
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  server.on('connection', socket => socket.on('message', raw => {
    const message = JSON.parse(raw.toString());
    if (message.type === 'hello') socket.send(JSON.stringify({ type: 'hello-ack' }));
    else if (message.type === 'command') socket.send(JSON.stringify({ type: 'result', id: message.id, capability: message.capability, ok: true,
      result: message.capability === 'device.capabilities' ? { remoteQualified: '[device.health, model.status]', capabilities: [] } : { remote: {}, model: {}, voice: {} } }));
  }));
  const adapter = new RelayAdapter({ deviceId: 'legacy-fold', token: 'test', url: `ws://127.0.0.1:${server.address().port}`, allowLoopbackTest: true });
  const bridge = new Bridge([{ id: 'legacy-fold', grants: ['device.health', 'device.ui.tap'], adapter }], { admission: async () => true, receiptSink: async () => {} });
  assert.equal((await bridge.call('legacy-fold', 'device.health', {})).ok, true);
  assert.equal((await bridge.call('legacy-fold', 'device.ui.tap', { x: 1, y: 1 })).error, 'CAPABILITY_UNAVAILABLE');
});

test('desktop adapter rejects links and bounds file reads', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'leeway-files-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const adapter = new DesktopAdapter(root);
  await fs.writeFile(path.join(root, 'large.txt'), 'x'.repeat(65537));
  await assert.rejects(adapter.execute('device.files.read', { path: 'large.txt' }), /FILE_TOO_LARGE/);
  await fs.writeFile(path.join(root, 'original.txt'), 'x');
  await fs.link(path.join(root, 'original.txt'), path.join(root, 'hardlink.txt'));
  await assert.rejects(adapter.execute('device.files.read', { path: 'hardlink.txt' }), /LINK_NOT_ALLOWED/);
  await assert.rejects(adapter.execute('device.files.read', { path: 'NUL' }), /INVALID_PATH/);
});

test('MCP screenshot uses native image content once, preserves full result hash, rejects invalid media', async t => {
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jp1sAAAAASUVORK5CYII=';
  let capture = { ok: true, mimeType: 'image/png', width: 1, height: 1, base64: png };
  const bridge = new Bridge([{ id: 'screen-device', grants: ['device.screen.capture', 'device.health'], adapter: {
    discover: async () => ['device.screen.capture', 'device.health'], execute: async () => capture,
  } }], { admission: async () => true, receiptSink: async () => {} });
  const server = createServer(bridge);
  const client = new Client({ name: 'screen-test', version: '1' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  t.after(async () => { await client.close(); await server.close(); });
  const call = name => client.callTool({ name, arguments: { deviceId: 'screen-device', arguments: {} } });
  const result = await call('device_screen_capture');
  assert.equal(result.isError, undefined);
  assert.equal(result.content.length, 2);
  assert.deepEqual(result.content[1], { type: 'image', mimeType: 'image/png', data: png });
  assert.ok(!result.content[0].text.includes(png));
  const metadata = JSON.parse(result.content[0].text);
  assert.equal(metadata.receipt.resultHash, digest(capture));
  assert.equal(metadata.result.width, 1);
  assert.ok(!('base64' in metadata.result));
  assert.ok(!(await call('device_health')).content.some(c => c.type === 'image'));
  for (const changes of [
    { mimeType: 'image/svg+xml' }, { base64: 'not valid base64' }, { base64: '' },
    { base64: 'SGVsbG8=' }, { base64: png + '=' }, { width: 0 }, { height: 32769 },
    { base64: 'A'.repeat(8 * 1024 * 1024 + 4) }, { mimeType: 'image/jpeg' },
  ]) {
    capture = { ok: true, mimeType: 'image/png', width: 1, height: 1, base64: png, ...changes };
    const bad = await call('device_screen_capture');
    assert.equal(bad.isError, true);
    assert.ok(bad.content.every(c => c.type === 'text'));
    const failure = JSON.parse(bad.content[0].text);
    assert.equal(failure.error, 'INVALID_SCREEN_IMAGE');
    assert.equal(failure.receipt.resultHash, digest(capture));
    assert.ok(!Object.hasOwn(failure, 'result'));
  }
});
