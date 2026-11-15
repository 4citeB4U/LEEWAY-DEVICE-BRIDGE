import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { WorkstationRelayAgent } from '../../operator/workstation-relay-agent.mjs';
import { createConfiguredBridge } from '../../apps/desktop/mcp-server.mjs';

test('enrolled workstation reports measured remote capabilities from its own workspace', async t => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'leeway-remote-workstation-'));
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  const agent = new WorkstationRelayAgent({
    url: 'ws://127.0.0.1:8008/api/device-relay',
    deviceId: 'portable-windows-node',
    token: 'owner-bound-test-token-0123456789',
    workspace,
  });

  const response = await agent.executeCapability('device.capabilities');
  assert.equal(response.ok, true);
  assert.equal(response.deviceId, 'portable-windows-node');
  assert.equal(response.platform, 'windows');
  assert.equal(response.authority, 'LOCAL_ADAPTER_MEASUREMENT');
  assert.ok(response.remoteQualified.includes('device.health'));
  assert.ok(response.remoteQualified.includes('device.files.read'));
});

test('workstation relay has no source-defined public fallback and validates optional fallback transport', async () => {
  const source = await fs.readFile(new URL('../../operator/workstation-relay-agent.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /leeway-device-bridge\.vercel\.app/);
  assert.throws(() => new WorkstationRelayAgent({
    url: 'ws://127.0.0.1:8008/api/device-relay',
    fallbackUrl: 'ws://remote.example.test/api/device-relay',
    deviceId: 'portable-windows-node',
    token: 'owner-bound-test-token-0123456789',
  }), /LEEWAY_FALLBACK_RELAY_TLS_REQUIRED/);
});

test('configured bridge distinguishes a remote relay binding from a local desktop workspace', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'leeway-remote-config-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const invalid = path.join(root, 'invalid.json');
  const valid = path.join(root, 'valid.json');
  await fs.writeFile(invalid, JSON.stringify({
    devices: [{ id: 'remote-node', type: 'relay', grants: ['device.health'], workspace: 'not-local' }],
    receipts: 'receipts.jsonl',
  }));
  await assert.rejects(createConfiguredBridge(invalid), /REMOTE_RELAY_BINDING_REQUIRED/);

  process.env.LEEWAY_REMOTE_TEST_TOKEN = 'owner-bound-test-token-0123456789';
  t.after(() => { delete process.env.LEEWAY_REMOTE_TEST_TOKEN; });
  await fs.writeFile(valid, JSON.stringify({
    devices: [{
      id: 'remote-node', type: 'relay', grants: ['device.health'],
      url: 'wss://relay.example.test/api/device-relay', tokenEnv: 'LEEWAY_REMOTE_TEST_TOKEN',
    }],
    receipts: 'receipts.jsonl',
  }));
  const bridge = await createConfiguredBridge(valid);
  assert.ok(bridge);
});
