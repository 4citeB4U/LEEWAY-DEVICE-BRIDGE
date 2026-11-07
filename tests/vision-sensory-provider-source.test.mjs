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
  assert.equal(desc.capabilities.length, 0); // no connector, no advertised executable routes

  const health1 = await provider.health();
  assert.equal(health1.ok, false);
  assert.equal(health1.body.connectorBound, false);

  provider.bindConnector(createMockConnector());
  const health2 = await provider.health();
  assert.equal(health2.body.connectorBound, true);
  assert.equal(health2.body.status, 'ACTIVE');
  assert.equal(provider.describe().capabilities.length, 4); // semantic adapters are not bound
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


test('Vision provider advertises semantic routes only when executable adapters are bound', async () => {
  const connector = createMockConnector();
  const noSemantic = new VisionSensoryProvider({ bridgeSessionId: 'bridge-01', ownerId: 'creator', connector });
  assert.equal(noSemantic.describe().capabilities.includes('vision.scene.describe'), false);
  assert.equal(noSemantic.describe().capabilities.includes('vision.objects.detect'), false);
  await assert.rejects(noSemantic.execute('vision.scene.describe', { clientId: 'model-a', sessionId: 's' }), /VISION_SCENE_BACKEND_NOT_BOUND/);
  await assert.rejects(noSemantic.execute('vision.objects.detect', { clientId: 'model-a', sessionId: 's' }), /VISION_OBJECT_BACKEND_NOT_BOUND/);

  connector.describeScene = async (_clientId, sessionId) => ({ sourceSessionId: sessionId, label: 'fixture-only' });
  connector.detectObjects = async (_clientId, sessionId) => ({ sourceSessionId: sessionId, objects: [] });
  const active = new VisionSensoryProvider({ bridgeSessionId: 'bridge-01', ownerId: 'creator', connector });
  assert.equal(active.describe().capabilities.length, 6);
  const scene = await active.execute('vision.scene.describe', { clientId: 'model-a', sessionId: 's' });
  assert.equal(scene.scene.label, 'fixture-only');
  const detection = await active.execute('vision.objects.detect', { clientId: 'model-a', sessionId: 's' });
  assert.deepEqual(detection.detection.objects, []);
});

test('Vision provider rejects a connector without executable base routes', () => {
  const provider = new VisionSensoryProvider({ bridgeSessionId: 'bridge-01', ownerId: 'creator' });
  assert.throws(() => provider.bindConnector({ getCapabilities: () => [] }), /INVALID_CONNECTOR/);
  assert.equal(provider.describe().capabilities.length, 0);
});
