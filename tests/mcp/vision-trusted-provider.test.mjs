/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.C3
TAG: LEEWAY.C3.TRUSTED_VISION_PROVIDER_COMPOSITION_TEST
5WH:
  WHAT = Qualify trusted per-device Vision composition into the existing Bridge
  WHY = The canonical DesktopAdapter previously left Vision null on every configured startup
  WHO = LeeWay Industries production qualification
  WHERE = tests/mcp/vision-trusted-provider.test.mjs
  WHEN = 2026-11-07
  HOW = Temporary source-level fixtures test discovery, admission, dispatch and denial without cameras
LICENSE: Internal LeeWay governance.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createConfiguredBridge } from '../../apps/desktop/mcp-server.mjs';
import { requireTrustedRuntimeComposition } from '../../apps/desktop/runtime-composition.mjs';
import { VisionSensoryProvider } from '../../providers/vision/index.mjs';

const VISION = [
  'vision.sources.list', 'vision.session.start', 'vision.frames.observe',
  'vision.scene.describe', 'vision.objects.detect', 'vision.session.stop'
];

function fakeConnector() {
  return {
    listSources: () => [{ deviceId: 'pc-primary', physicalSensorId: 'fixture-camera' }],
    getCapabilities: () => [],
    startSession: (clientId, { deviceId, physicalSensorId }) => ({
      sessionId: 'fixture-session', clientId, deviceId, physicalSensorId, status: 'ACTIVE'
    }),
    observeFrame: () => ({ frameNumber: 2, source: 'TEST_FIXTURE_NOT_PHYSICAL_EVIDENCE' }),
    stopSession: (_clientId, sessionId) => ({ sessionId, stopped: true })
  };
}

async function withConfiguration(run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'leeway-c3-vision-'));
  try {
    await fs.mkdir(path.join(root, 'work'));
    const configPath = path.join(root, 'bridge.json');
    await fs.writeFile(configPath, JSON.stringify({
      devices: [{ id: 'pc-primary', type: 'desktop', workspace: 'work', grants: VISION }]
    }));
    return await run(configPath);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test('trusted Runtime composes bound Vision without bypassing Bridge admission or receipts', async () => {
  await withConfiguration(async config => {
    const entries = [];
    const provider = new VisionSensoryProvider({
      bridgeSessionId: 'test-session', ownerId: 'creator', connector: fakeConnector()
    });
    const runtime = {
      admission: async (_request) => true, // isolated unit fixture, never a production admission claim
      receiptSink: async receipt => { entries.push(receipt); },
      visionProviders: new Map([['pc-primary', provider]])
    };
    const bridge = await createConfiguredBridge(config, runtime);
    const discovery = await bridge.discover('pc-primary');
    const names = discovery.capabilities.map(c => c.name);
    for (const name of ['vision.sources.list', 'vision.session.start', 'vision.frames.observe', 'vision.session.stop']) {
      assert.ok(names.includes(name), name);
    }
    for (const name of ['vision.scene.describe', 'vision.objects.detect']) {
      assert.equal(names.includes(name), false, name);
    }
    const observation = await bridge.call('pc-primary', 'vision.sources.list', { clientId: 'model-a' });
    assert.equal(observation.ok, true);
    assert.equal(observation.result.sources.length, 1);
    assert.equal(observation.receipt.authority, 'CONTROLLER_OBSERVATION');
    assert.equal(observation.receipt.outcome, 'PASS');
    assert.equal(entries.length, 2);
  });
});

test('unbound Vision stays invisible when runtime has no trusted provider', async () => {
  await withConfiguration(async config => {
    const bridge = await createConfiguredBridge(config, {
      admission: async () => true,
      receiptSink: async () => {}
    });
    const names = (await bridge.discover('pc-primary')).capabilities.map(c => c.name);
    assert.equal(names.some(name => name.startsWith('vision.')), false);
  });
});

test('trusted provider cannot be assigned to a different or relay device', async () => {
  await withConfiguration(async config => {
    const provider = new VisionSensoryProvider({
      bridgeSessionId: 'test-session', ownerId: 'creator', connector: fakeConnector()
    });
    const base = { admission: async () => true, receiptSink: async () => {} };
    await assert.rejects(createConfiguredBridge(config, {
      ...base, visionProviders: new Map([['unregistered-device', provider]])
    }), /TRUSTED_VISION_PROVIDER_DEVICE_NOT_CONFIGURED/);
    assert.throws(() => requireTrustedRuntimeComposition({
      ...base, visionProviders: { 'pc-primary': provider }
    }), /TRUSTED_VISION_PROVIDER_CONFIGURATION_INVALID/);
    assert.throws(() => requireTrustedRuntimeComposition({
      ...base, visionProviders: new Map([['pc-primary', {}]])
    }), /TRUSTED_VISION_PROVIDER_CONFIGURATION_INVALID/);
  });
});
