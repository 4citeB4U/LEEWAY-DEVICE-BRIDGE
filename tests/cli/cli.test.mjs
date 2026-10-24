/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE
TAG: LEEWAY.DEVICE.BRIDGE.CLI_ACCEPTANCE
5WH:
WHAT = Validate CLI commands and actual SDK ingress.
WHY = Distinguish package presence from execution and authorization.
WHO = LeeWay Device Bridge maintainers.
WHERE = tests/cli/cli.test.mjs
WHEN = 2026-10-23
HOW = Native Node test runner, isolated config and SDK stdio tool calls.
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const root = path.resolve(import.meta.dirname, '../..');
const cli = path.join(root, 'operator/device-bridge-cli.mjs');
function run(args, env = process.env) {
  return spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8', env: { ...env, LEEWAY_DEVICE_ID: '', LEEWAY_PAIRING_TOKEN: '' }, timeout: 5000
  });
}
test('CLI launches help and reports source rather than inventing connection', () => {
  const help = run(['help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /mcp --config/);
  const doctor = run(['doctor']);
  assert.equal(doctor.status, 0);
  const value = JSON.parse(doctor.stdout);
  assert.equal(value.mcpSourcePresent, true);
  assert.equal(value.productionAdmission, 'NOT_VERIFIED');
  assert.equal(value.connected, 'NOT_TESTED');
});
test('CLI catalog reads existing publication evidence without claiming install', () => {
  const result = run(['catalog']);
  assert.equal(result.status, 0);
  const doc = JSON.parse(result.stdout);
  assert.ok(doc.packages.some(p => p.platform === 'android'));
  assert.ok(doc.packages.some(p => p.platform === 'ios' && p.manifestHasDownloadAndSha256 === false));
  assert.ok(doc.packages.every(p => p.installationVerified === false));
});
test('CLI reveals configured device IDs but never secrets or claims connected', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'leeway-cli-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'config.json');
  await fs.writeFile(file, JSON.stringify({ devices: [{ id: 'device-A', type: 'relay', tokenEnv: 'SECRET_TOKEN', url: 'wss://example.org' }], receipts: 'records.jsonl' }));
  const result = run(['devices', '--config', file]);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).connected, 'NOT_TESTED');
  assert.ok(result.stdout.includes('device-A'));
  assert.ok(!result.stdout.includes('SECRET_TOKEN'));
});
test('CLI rejects unpaired RPC and refuses to start unconfigured MCP', () => {
  const call = run(['call', 'device.health', '{}']);
  assert.equal(call.status, 2);
  assert.match(call.stderr, /PAIRING_CREDENTIALS_REQUIRED/);
  assert.equal(run(['mcp']).status, 2);
  assert.equal(run(['call', 'device.files.write', '{"path":"a"}']).status, 2);
});
test('catalog verification hashes bytes and refuses stale manifest claims', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'leeway-artifact-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  await fs.writeFile(path.join(dir, 'app.apk'), 'verified-fixture');
  const sha = createHash('sha256').update('verified-fixture').digest('hex');
  const manifest = path.join(dir, 'manifest.json');
  const write = hash => fs.writeFile(manifest, JSON.stringify({
    packages: [{ id: 'test.apk', platform: 'android', status: 'DEVELOPMENT',
      downloadUrl: './app.apk', sha256: hash, sizeBytes: 16 }]
  }));
  await write(sha);
  const pass = run(['verify-catalog', '--manifest', manifest]);
  assert.equal(pass.status, 0, pass.stderr);
  assert.equal(JSON.parse(pass.stdout).packages[0].state, 'LOCAL_FILE_MATCHES_MANIFEST');
  await write('a'.repeat(64));
  const fail = run(['verify-catalog', '--manifest', manifest]);
  assert.equal(fail.status, 1);
  assert.equal(JSON.parse(fail.stdout).packages[0].state, 'ARTIFACT_MISMATCH');
});
test('CLI probe opens a real local stdio session without claiming remote connection', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'leeway-cli-probe-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  await fs.mkdir(path.join(dir, 'workspace'));
  const file = path.join(dir, 'config.json');
  await fs.writeFile(file, JSON.stringify({ devices: [{ id: 'probe-host', type: 'desktop', workspace: 'workspace', grants: ['device.health'] }], receipts: 'receipts.jsonl' }));
  const result = run(['probe', '--config', file]);
  assert.equal(result.status, 0, result.stderr);
  const value = JSON.parse(result.stdout);
  assert.equal(value.transport, 'LOCAL_STDIO_MCP_CONNECTED');
  assert.deepEqual(value.devicesConfigured, ['probe-host']);
  assert.ok(value.toolsEnumerated > 5);
  assert.equal(value.chatgptConnectorRegistered, 'NOT_TESTED');
});
test('CLI entrypoint serves real MCP tools and command remains fail-closed', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'leeway-cli-mcp-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  await fs.mkdir(path.join(dir, 'workspace'));
  const file = path.join(dir, 'config.json');
  await fs.writeFile(file, JSON.stringify({ devices: [{ id: 'cli-host', type: 'desktop', workspace: 'workspace', grants: ['device.health', 'device.files.write'] }], receipts: 'receipts.jsonl' }));
  const client = new Client({ name: 'leeway-cli-acceptance', version: '1.0.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args: [cli, 'mcp', '--config', file], stderr: 'pipe' });
  t.after(() => client.close());
  await client.connect(transport);
  const listed = await client.listTools();
  assert.ok(listed.tools.some(t => t.name === 'bridge_devices'));
  assert.ok(listed.tools.some(t => t.name === 'device_process_execute'));
  const deviceList = await client.callTool({ name: 'bridge_devices', arguments: {} });
  assert.deepEqual(JSON.parse(deviceList.content[0].text).devices, ['cli-host']);
  const response = await client.callTool({ name: 'device_files_write', arguments: { deviceId: 'cli-host', arguments: { path: 'unapproved.txt', text: 'no' } } });
  assert.equal(JSON.parse(response.content[0].text).error, 'ADMISSION_DENIED');
  await assert.rejects(fs.access(path.join(dir, 'workspace/unapproved.txt')));
});
