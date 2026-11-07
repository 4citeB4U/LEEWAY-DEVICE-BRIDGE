/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE
TAG: LEEWAY.DEVICE.BRIDGE.VISION_PROVIDER_TEST
5WH:
  WHAT = Qualification test for VisionSensoryProvider in Leeway Device Bridge
  WHY = Verify integration between Device Bridge capability routing and repaired VisionBridgeConnector
  WHO = Leeway Device Bridge contributors
  WHERE = tests/vision-sensory-provider-source.test.mjs
  WHEN = 2026-11-07
  HOW = Node built-in test runner
LICENSE: Internal LeeWay governance.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { VisionSensoryProvider } from '../providers/vision/index.mjs';

function createMockConnector() {
  const sources = [
    { key: 'pc\u0000cam1', platform: 'windows', deviceId: 'pc', physicalSensorId: 'cam1' }
  ];
  return {
    listSources: (clientId) => sources,
    getCapabilities: (clientId) => [
      { name: 'vision.sources.list', state: 'VERIFIED' }
    ],
    startSession: (clientId, { deviceId, physicalSensorId }) => ({
      sessionId: 'test-session-123',
      clientId,
      deviceId,
      physicalSensorId,
      status: 'ACTIVE'
    }),
    observeFrame: (clientId, sessionId) => ({
      sessionId,
      frameNumber: 42,
      telemetry: { dimensions: { width: 1280, height: 720 }, brightness: 0.5 }
    }),
    stopSession: (clientId, sessionId) => ({
      sessionId,
      stopped: true
    })
  };
}

test('VisionSensoryProvider initializes, describes contract, and probes health', async () => {
  const provider = new VisionSensoryProvider({
    bridgeSessionId: 'bridge-01',
    ownerId: 'creator'
  });

  const desc = provider.describe();
  assert.equal(desc.providerId, 'leeway-vision-sensory');
  assert.equal(desc.class, 'sensory');
  assert.equal(desc.capabilities.length, 6);

  const health1 = await provider.health();
  assert.equal(health1.ok, true);
  assert.equal(health1.body.connectorBound, false);

  provider.bindConnector(createMockConnector());
  const health2 = await provider.health();
  assert.equal(health2.body.connectorBound, true);
  assert.equal(health2.body.status, 'ACTIVE');
});

test('VisionSensoryProvider executes vision capability routes', async () => {
  const provider = new VisionSensoryProvider({
    bridgeSessionId: 'bridge-01',
    ownerId: 'creator',
    connector: createMockConnector()
  });

  // list
  const listRes = await provider.execute('vision.sources.list', { clientId: 'model-a' });
  assert.equal(listRes.ok, true);
  assert.equal(listRes.sources.length, 1);

  // start
  const startRes = await provider.execute('vision.session.start', {
    clientId: 'model-a',
    deviceId: 'pc',
    physicalSensorId: 'cam1'
  });
  assert.equal(startRes.ok, true);
  assert.equal(startRes.session.status, 'ACTIVE');

  // observe
  const obsRes = await provider.execute('vision.frames.observe', {
    clientId: 'model-a',
    sessionId: startRes.session.sessionId
  });
  assert.equal(obsRes.ok, true);
  assert.equal(obsRes.frame.frameNumber, 42);

  // stop
  const stopRes = await provider.execute('vision.session.stop', {
    clientId: 'model-a',
    sessionId: startRes.session.sessionId
  });
  assert.equal(stopRes.ok, true);
  assert.equal(stopRes.stopped, true);
});
