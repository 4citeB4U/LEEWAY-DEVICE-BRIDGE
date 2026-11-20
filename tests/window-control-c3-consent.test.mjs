/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.C3.WINDOW_CONTROL_TESTS
TAG: LEEWAY.C3.WINDOW_MUTATION_CONSENT_REGRESSION
5WH:
WHAT = Check that Windows window mutations cannot inherit read-only admission.
WHY = Prevent window invoke/input/submit from operating without verified owner consent.
WHO = LeeWay Device Bridge contributors under Creator authority.
WHERE = tests/window-control-c3-consent.test.mjs
WHEN = 2026-11-20.
HOW = Exercise canonical createC3AdmissionBinding with a bounded fixture and denied consent.
LICENSE = MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { createC3AdmissionBinding } from '../operator/c3-admission-binding.mjs';

const windowCapabilities = Object.freeze([
  'device.windows.window.list',
  'device.windows.window.observe',
  'device.windows.window.invoke',
  'device.windows.window.input',
  'device.windows.window.submit',
]);

function admissionFixture() {
  const registry = {
    adapters: [{
      adapterId: 'test.windows',
      platform: 'linux',
      capabilities: Object.fromEntries(windowCapabilities.map(capability =>
        [capability, { state: 'SUPPORTED', requiresHumanConsent: false }]))
    }]
  };
  const c3 = createC3AdmissionBinding({
    deviceRegistry: new Map([['test-control-node', { platform: 'linux' }]]),
    registry,
    trustedIssuerRegistry: {},
    formulaPreGate: async () => true,
    veritasPreGate: async () => true,
    consentProvider: async () => null,
  });
  return capability => c3({deviceId:'test-control-node', capability, args:{}});
}

test('window list and observe remain read-only in canonical C3', async () => {
  const evaluate = admissionFixture();
  assert.equal(await evaluate('device.windows.window.list'), true);
  assert.equal(await evaluate('device.windows.window.observe'), true);
});

test('window invoke, input and submit deny without verified consent even if registry omits consent', async () => {
  const evaluate = admissionFixture();
  for (const capability of [
    'device.windows.window.invoke',
    'device.windows.window.input',
    'device.windows.window.submit',
  ]) {
    assert.equal(await evaluate(capability), false, capability);
  }
});
