/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.TWO_PC.TEST
TAG: LEEWAY.TWO_PC_CONTINUUM_FIRST_TEST_V1
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { DigitalBrainEngine } from '../../apps/desktop/digital-brain.mjs';
import { WorkstationRelayAgent } from '../../operator/workstation-relay-agent.mjs';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'leeway-two-pc-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return {
    root,
    primary: { workspace: path.join(root, 'primary-workspace'), continuum: path.join(root, 'primary-continuum') },
    hp: { workspace: path.join(root, 'hp-workspace'), continuum: path.join(root, 'hp-continuum') },
  };
}

test('stage one remains in the receiving Continuum and Digital Brain until explicit materialization', async t => {
  const f = await fixture(t);
  const hp = new DigitalBrainEngine({ nodeId: 'pc-hp-secondary', continuumRoot: f.hp.continuum, workspaceRoot: f.hp.workspace });
  const bytes = Buffer.from('Continuum first; Windows disk only by explicit user request.', 'utf8');
  const transferId = randomUUID();
  const staged = await hp.stage({
    transferId, sourceNodeId: 'pc-primary', targetNodeId: 'pc-hp-secondary', filename: 'proof.txt',
    base64: bytes.toString('base64'), expectedSha256: sha256(bytes), transport: 'relay',
  });
  assert.equal(staged.inContinuum, true);
  assert.equal(staged.materializedToWindowsOs, false);
  await assert.rejects(fs.stat(path.join(f.hp.workspace, 'proof.txt')), { code: 'ENOENT' });
  const read = await hp.read({ transferId });
  assert.equal(Buffer.from(read.base64, 'base64').toString('utf8'), bytes.toString('utf8'));
  assert.equal(read.record.materializedToWindowsOs, false);
  await assert.rejects(hp.materialize({ transferId, destinationPath: 'proof.txt', explicitUserRequest: false }), /EXPLICIT_USER_REQUEST_REQUIRED/);
  const materialized = await hp.materialize({ transferId, destinationPath: 'received/proof.txt', explicitUserRequest: true });
  assert.equal(materialized.materializedToWindowsOs, true);
  assert.equal(sha256(await fs.readFile(path.join(f.hp.workspace, 'received', 'proof.txt'))), sha256(bytes));
  const brain = await hp.readback();
  assert.equal(brain.index[0].materializedToWindowsOs, true);
  assert.equal(brain.index[0].materializedSha256, sha256(bytes));
});

test('sub-link stages directly between PCs when cloud consciousness is unavailable', async t => {
  const f = await fixture(t);
  const common = { relayUrl: 'wss://relay.example.test/api/device-relay', token: 'owner-bound-test-token-0123456789' };
  const hp = new WorkstationRelayAgent({ nodeId: 'pc-hp-secondary', workspace: f.hp.workspace, continuumRoot: f.hp.continuum, ...common });
  const primary = new WorkstationRelayAgent({
    nodeId: 'pc-primary', workspace: f.primary.workspace, continuumRoot: f.primary.continuum,
    subLinkUrl: 'wss://owner-sublink.example.test/two-pc', ...common,
    subLinkClient: { request: async request => ({ ok: true, result: await hp.executeCapability(request.type, request.arguments) }) },
  });
  const bytes = Buffer.from('creator-authorized direct two-PC staging', 'utf8');
  const transferId = randomUUID();
  const staged = await primary.stageToPeer({
    transferId, sourceNodeId: 'pc-primary', targetNodeId: 'pc-hp-secondary', filename: 'sub-link.txt',
    base64: bytes.toString('base64'), expectedSha256: sha256(bytes), transport: 'relay',
  }, { cloudConsciousnessConnected: false });
  assert.equal(staged.transport, 'sub-link');
  assert.equal(staged.materializedToWindowsOs, false);
  await assert.rejects(fs.stat(path.join(f.hp.workspace, 'sub-link.txt')), { code: 'ENOENT' });
  const diagnostics = await Promise.all([
    primary.executeCapability('pc.diagnostics.read'),
    hp.executeCapability('pc.diagnostics.read'),
  ]);
  assert.equal(diagnostics[0].nodeId, 'pc-primary');
  assert.equal(diagnostics[1].nodeId, 'pc-hp-secondary');
  assert.equal((await hp.executeCapability('continuum.transfer.read', { transferId })).record.inContinuum, true);
});

test('MCP configuration preserves the strict remote-relay boundary', async () => {
  const source = await fs.readFile(new URL('../../apps/desktop/mcp-server.mjs', import.meta.url), 'utf8');
  assert.match(source, /REMOTE_RELAY_BINDING_REQUIRED/);
  assert.match(source, /LOCAL_DESKTOP_WORKSPACE_REQUIRED/);
  assert.doesNotMatch(source, /\['pc-primary', 'pc-hp-secondary'\]/);
});

test('Continuum and workstation adapters accept portable enrolled-style device identifiers', async t => {
  const f=await fixture(t);
  const nodeId='future-linux-edge-2040';
  const peerId='agent-virtual-tablet';
  const engine=new DigitalBrainEngine({nodeId,continuumRoot:f.primary.continuum,workspaceRoot:f.primary.workspace});
  const bytes=Buffer.from('portable Continuum payload','utf8');
  const staged=await engine.stage({transferId:randomUUID(),sourceNodeId:peerId,targetNodeId:nodeId,filename:'portable.txt',base64:bytes.toString('base64'),expectedSha256:sha256(bytes),transport:'relay'});
  assert.equal(staged.targetNodeId,nodeId);
  const agent=new WorkstationRelayAgent({nodeId,workspace:f.primary.workspace,continuumRoot:f.primary.continuum,relayUrl:'wss://relay.example.test/api/device-relay',token:'owner-bound-test-token-0123456789'});
  assert.equal(agent.nodeId,nodeId);
});

test('workstation daemon uses the relay execution role and is directly launchable', async () => {
  const source = await fs.readFile(new URL('../../operator/workstation-relay-agent.mjs', import.meta.url), 'utf8');
  assert.match(source, /role: 'phone'/);
  assert.match(source, /LEEWAY_CLI_AUTOSTART|Starting relay endpoint/);
  assert.match(source, /pathToFileURL/);
  assert.doesNotMatch(source, /role: 'agent'/);
});

