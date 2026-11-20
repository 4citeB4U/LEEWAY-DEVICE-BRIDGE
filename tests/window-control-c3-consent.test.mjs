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
  'device.ui.tap',
  'device.ui.swipe',
  'device.ui.text',
  'device.ui.snapshot',
  'device.process.execute',
  'device.session.input',
]);

function admissionFixture() {
  const registry = {
    adapters: [{
      adapterId: 'test.windows',
      platform: 'windows',
      capabilities: Object.fromEntries(windowCapabilities.map(capability =>
        [capability, { state: 'SUPPORTED', requiresHumanConsent: false }]))
    }]
  };
  const c3 = createC3AdmissionBinding({
    deviceRegistry: new Map([['pc-primary', {
      platform: 'windows', identityVerified: true,
      registrationState: 'TRUSTED_REGISTRY_READ',
      identitySource: 'WINDOWS_CIM_READONLY',
      passportAuthority: 'OWNER_SIGNED_WINDOWS_PASSPORT',
      ownerSubject: 'fixture-owner-subject', passportSha256: 'a'.repeat(64),
    }]]),
    registry,
    trustedIssuerRegistry: {},
    formulaPreGate: async () => true,
    veritasPreGate: async () => true,
    consentProvider: async () => null,
  });
  return capability => c3({deviceId:'pc-primary', capability, args:{}});
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

test('UI pointer, keyboard, process and session mutations cannot inherit READ from a faulty registry', async () => {
  const evaluate = admissionFixture();
  for (const capability of [
    'device.ui.tap', 'device.ui.swipe', 'device.ui.text',
    'device.process.execute', 'device.session.input'
  ]) {
    assert.equal(await evaluate(capability), false, capability);
  }
  assert.equal(await evaluate('device.ui.snapshot'), true);
});

test('consent provider receives real request arguments and their canonical digest', async () => {
  const { computeArgsDigest } = await import('../operator/trusted-issuer-registry.mjs');
  const seen = [];
  const registry = {
    adapters: [{
      adapterId: 'test.windows', platform: 'windows',
      capabilities: { 'device.ui.tap': {state:'SUPPORTED', requiresHumanConsent:false} }
    }]
  };
  const c3 = createC3AdmissionBinding({
    deviceRegistry:new Map([['pc-primary', {
      platform:'windows', identityVerified:true, registrationState:'TRUSTED_REGISTRY_READ',
      identitySource:'WINDOWS_CIM_READONLY', passportAuthority:'OWNER_SIGNED_WINDOWS_PASSPORT',
      ownerSubject:'fixture-owner-subject', passportSha256:'a'.repeat(64),
    }]]),
    registry,
    trustedIssuerRegistry:{},
    formulaPreGate:async () => true,
    veritasPreGate:async () => true,
    consentProvider:async request => {seen.push(request);return null;},
  });
  const args = {x:120,y:240,button:'left'};
  assert.equal(await c3({deviceId:'pc-primary',capability:'device.ui.tap',args}),false);
  assert.equal(seen.length,1);
  assert.deepEqual(seen[0].args,args);
  assert.equal(seen[0].argsDigest,computeArgsDigest(args));
});

test('a signed token is accepted only for matching Windows UI action arguments and rejects replay', async () => {
  const { generateKeyPairSync, randomUUID } = await import('node:crypto');
  const { createConsentEvidenceToken } = await import('../operator/trusted-issuer-registry.mjs');
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const privateKeyPem = privateKey.export({ format:'pem', type:'pkcs8' });
  const publicKeySpki = publicKey.export({ format:'pem', type:'spki' });
  const registry = {
    adapters: [{
      adapterId: 'fixture.windows', platform:'windows',
      capabilities: { 'device.ui.tap': {state:'SUPPORTED',requiresHumanConsent:false} }
    }]
  };
  const deviceRegistry = new Map([['pc-primary',{
    platform:'windows',identityVerified:true,registrationState:'TRUSTED_REGISTRY_READ',
    identitySource:'WINDOWS_CIM_READONLY',passportAuthority:'OWNER_SIGNED_WINDOWS_PASSPORT',
    ownerSubject:'fixture-owner-subject',passportSha256:'a'.repeat(64)
  }]]);
  const issuers = {
    'fixture.runtime': {
      issuerId:'fixture.runtime',keyId:'fixture-key',algorithm:'Ed25519',
      publicKeySpki,status:'ACTIVE',validUntil:'2027-01-01T00:00:00.000Z'
    }
  };
  let signedArgs = {x:10,y:20};
  let tokenNonce = randomUUID();
  const c3 = createC3AdmissionBinding({
    deviceRegistry,registry,trustedIssuerRegistry:issuers,replayGuard:new Set(),
    formulaPreGate:async () => ({passed:true,formulaId:'TEST_ONLY_FORMULA'}),
    veritasPreGate:async () => true,
    consentProvider:async ({deviceId,platform,capability}) => createConsentEvidenceToken({
      issuer:'fixture.runtime',keyId:'fixture-key',privateKeyPem,requestId:randomUUID(),
      deviceId,platform,capability,args:signedArgs,sessionNonce:randomUUID(),tokenNonce,
    }),
  });
  // The fixture signer grants coordinates (10,20); moving to (99,20) is denied.
  assert.equal(await c3({deviceId:'pc-primary',capability:'device.ui.tap',args:{x:99,y:20}}),false);
  // The same signed request arguments can be admitted once; this does NOT
  // represent real owner interaction, Formula or Veritas production evidence.
  assert.equal(await c3({deviceId:'pc-primary',capability:'device.ui.tap',args:{x:10,y:20}}),true);
  assert.equal(await c3({deviceId:'pc-primary',capability:'device.ui.tap',args:{x:10,y:20}}),false);
});
