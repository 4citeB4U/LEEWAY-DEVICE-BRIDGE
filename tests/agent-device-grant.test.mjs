/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.TEST
TAG: LEEWAY.AGENT_DEVICE_GRANT.TEST.V1
5WH:
WHAT: Exercise agent/device grant binding and denial semantics.
WHY: Ensure helpers cannot obtain an iPhone capability merely by naming a device or capability.
WHO: Creator-authorized Device Bridge contributors.
WHERE: tests/agent-device-grant.test.mjs.
WHEN: 2026-11-19.
HOW: Use deterministic structural grants and a separate verifier stub; no physical device claim.
LICENSE: MIT.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { createAgentDeviceGrantGate, validateAgentDeviceGrant } from '../packages/protocol/agent-device-grant.mjs';
import { Bridge } from '../packages/protocol/index.mjs';

const now = Date.parse('2026-11-19T19:00:00.000Z');
const grant = Object.freeze({ version: 1, grantId: 'grant-iphone-11-001', issuerId: 'runtime-fabric', agentId: 'agent-lee', ownerSubject: 'owner-001', deviceId: 'iphone-11', capabilities: ['device.camera'], expiresAt: '2026-11-19T19:10:00.000Z', signature: 'a'.repeat(64) });
const context = { agentId: 'agent-lee', ownerSubject: 'owner-001', deviceId: 'iphone-11', capability: 'device.camera', now };

test('accepts only a matching bounded agent grant', () => {
  assert.equal(validateAgentDeviceGrant(grant, context).grantId, 'grant-iphone-11-001');
  assert.throws(() => validateAgentDeviceGrant({ ...grant, agentId: 'other-helper' }, context), /BINDING_MISMATCH/);
  assert.throws(() => validateAgentDeviceGrant({ ...grant, capabilities: ['device.gpu.metal.probe'] }, context), /CAPABILITY_DENIED/);
});

test('refuses expired grants and iOS cross-app control capabilities', () => {
  assert.throws(() => validateAgentDeviceGrant({ ...grant, expiresAt: '2026-11-19T18:59:00.000Z' }, context), /EXPIRED/);
  assert.throws(() => validateAgentDeviceGrant({ ...grant, capabilities: ['device.apps.control.cross-app'] }, { ...context, capability: 'device.apps.control.cross-app' }), /APPLE_PLATFORM_CAPABILITY_DENIED/);
});

test('requires an independent Runtime verifier after structural validation', async () => {
  const gate = createAgentDeviceGrantGate({ verifyGrant: async ({ validated }) => validated.issuerId === 'runtime-fabric', now: () => now });
  assert.equal((await gate({ agentGrant: grant, ...context })).agentId, 'agent-lee');
  const unbound = createAgentDeviceGrantGate({ now: () => now });
  await assert.rejects(() => unbound({ agentGrant: grant, ...context }), /VERIFIER_UNBOUND/);
});

test('Bridge enforces the agent grant before an admitted device operation', async () => {
  const receipts = [];
  const deviceHealthGrant = {
    ...grant,
    capabilities: ['device.health'],
  };
  const bridge = new Bridge([{
    id: 'iphone-11',
    grants: ['device.health'],
    adapter: {
      discover: async () => ['device.health'],
      execute: async () => ({ source: 'test-adapter' }),
    },
  }], {
    admission: async () => true,
    receiptSink: async entry => { receipts.push(entry); },
    agentGrantGate: createAgentDeviceGrantGate({
      verifyGrant: async () => true,
      now: () => now,
    }),
  });

  const denied = await bridge.call('iphone-11', 'device.health');
  assert.equal(denied.ok, false);
  assert.equal(denied.error, 'AGENT_DEVICE_GRANT_REQUIRED');

  const admitted = await bridge.call('iphone-11', 'device.health', {}, {
    agentGrant: deviceHealthGrant,
    agentId: 'agent-lee',
    ownerSubject: 'owner-001',
  });
  assert.equal(admitted.ok, true);
  assert.equal(admitted.result.source, 'test-adapter');
  assert.equal(receipts.at(-1).outcome, 'PASS');
});
