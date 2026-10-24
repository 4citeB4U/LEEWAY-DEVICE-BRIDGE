/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE
TAG: LEEWAY.C3.UNSIGNED_CONSENT_REGRESSION
5WH:
WHO = LeeWay creator-authorized Device Bridge maintainers.
WHAT = Prevent unsigned caller claims from satisfying sovereign owner consent.
WHEN = 2026-10-23.
WHERE = tests/c3-unsigned-consent-regression.test.mjs.
WHY = Close an observed C3 candidate consent-provenance acceptance defect.
HOW = Isolated admission function with deliberately synthetic gates; never execute adapters.
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { createC3AdmissionBinding } from '../operator/c3-admission-binding.mjs';

test('unsigned valid flag and nonce cannot authorize a device mutation', async () => {
  const registry = { adapters: [{ platform: 'windows', adapterId: 'synthetic-local-test',
    capabilities: { 'device.files.write': { state: 'SUPPORTED', requiresHumanConsent: true } } }] };
  let formulaCalls = 0;
  let veritasCalls = 0;
  const admission = createC3AdmissionBinding({
    deviceRegistry: new Map([['synthetic-host', { platform: 'windows' }]]),
    registry, trustedIssuerRegistry: { issuers: [] },
    consentProvider: async () => ({
      valid: true, issuer: 'not-authenticated', keyId: 'none',
      tokenNonce: 'synthetic-token', sessionNonce: 'synthetic-session'
    }),
    formulaPreGate: async () => { formulaCalls++; return true; },
    veritasPreGate: async () => { veritasCalls++; return true; }
  });
  const granted = await admission({ deviceId: 'synthetic-host',
    capability: 'device.files.write', args: { path: 'never-created.txt', text: 'none' } });
  assert.equal(granted, false, 'unsigned synthetic consent must never admit a mutating command');
  assert.equal(formulaCalls, 0, 'short-circuit before mock Formula');
  assert.equal(veritasCalls, 0, 'short-circuit before mock Veritas');
});
