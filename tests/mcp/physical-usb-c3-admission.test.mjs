/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.C3
TAG: LEEWAY.C3.PHYSICAL_USB_ADMISSION_CONTRACT_TEST
5WH:
  WHAT = Test that registered USB physical adapters remain governed by the existing Formula/Veritas admission boundary
  WHY = Configuration and USB presence cannot substitute for policy, Formula or Veritas decisions
  WHO = LeeWay Industries
  WHERE = tests/mcp/physical-usb-c3-admission.test.mjs
  WHEN = 2026-11-07
  HOW = Test-only positive/negative callbacks and the real device operator registry; no physical device execution
LICENSE: Internal LeeWay governance.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { createProductionAdmission } from '../../apps/desktop/mcp-server.mjs';
import { loadAdapterRegistry } from '../../operator/device-operator.mjs';

const devices = [
  { id: 'fold6-usb-test', type: 'physical-android', platform: 'android' },
  { id: 'iphone-usb-test', type: 'physical-apple', platform: 'ios' }
];
const adapterRegistry = loadAdapterRegistry();
const registeredDeviceRegistry = new Map(devices.map(device => [device.id, { platform: device.platform }]));

test('physical USB READ routes require actual Formula and Veritas callback decisions', async () => {
  const calls = [];
  const formulaPreGate = async input => {
    calls.push({ gate: 'formula-fixture', ...input });
    return { passed: true, formulaId: 'TEST_ONLY_NOT_FORMULA_EXECUTION' };
  };
  const veritasPreGate = async input => {
    calls.push({ gate: 'veritas-fixture', ...input });
    return true;
  };
  const admit = createProductionAdmission(devices, { adapterRegistry, deviceRegistry: registeredDeviceRegistry, formulaPreGate, veritasPreGate });
  for (const device of devices) {
    for (const capability of ['device.info', 'device.health']) {
      assert.equal(await admit({ deviceId: device.id, capability, args: {} }), true);
    }
  }
  assert.equal(calls.filter(c => c.gate === 'formula-fixture').length, 4);
  assert.equal(calls.filter(c => c.gate === 'veritas-fixture').length, 4);
});

test('physical USB paths fail closed when either mandatory independent gate fails', async () => {
  const denyFormula = createProductionAdmission(devices, {
    adapterRegistry, deviceRegistry: registeredDeviceRegistry, formulaPreGate: async () => ({ passed: false }), veritasPreGate: async () => true
  });
  const denyVeritas = createProductionAdmission(devices, {
    adapterRegistry, deviceRegistry: registeredDeviceRegistry, formulaPreGate: async () => ({ passed: true }), veritasPreGate: async () => false
  });
  const missingGates = createProductionAdmission(devices, { adapterRegistry });
  for (const device of devices) {
    for (const admission of [denyFormula, denyVeritas, missingGates]) {
      assert.equal(await admission({ deviceId: device.id, capability: 'device.info', args: {} }), false);
    }
  }
  const alwaysAllowFixture = createProductionAdmission(devices, {
    adapterRegistry, deviceRegistry: registeredDeviceRegistry, formulaPreGate: async () => ({ passed: true }), veritasPreGate: async () => true
  });
  assert.equal(await alwaysAllowFixture({ deviceId: 'not-registered', capability: 'device.health', args: {} }), false);
  assert.equal(await alwaysAllowFixture({ deviceId: 'iphone-usb-test', capability: 'vision.session.start', args: {} }), false);
});
