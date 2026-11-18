/**
 * LEEWAY HEADER — DO NOT REMOVE
 * REGION: LEEWAY.DEVICE.BRIDGE.WINDOWS.READ_ADMISSION.TEST
 * TAG: LEEWAY.W01.WINDOWS.C3.READ_REGISTRY_REGRESSION.V1
 * 5WH: WHAT=Check bounded owner-scoped Windows READ declarations and preserve strict C3 mutation admission.
 * WHY=Prevent health-only registry drift and accidental conversion of workspace READ into MUTATE.
 * WHO=Creator-directed W01 engineering; WHERE=tests/windows-c3-workspace-read-registry.test.mjs.
 * WHEN=2026-11-17; HOW=Source-only C3 contract tests, synthetic identity and test-only signed tokens.
 * AUTHORITY=TEST_ONLY; all Formula/Veritas provider fakes are explicit test fixtures, no live device approval.
 * LICENSE=MIT.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadAdapterRegistry, admitCommand } from '../operator/device-operator.mjs';
import { createC3AdmissionBinding } from '../operator/c3-admission-binding.mjs';
import { DesktopAdapter } from '../apps/desktop/adapter.mjs';
import { createConsentEvidenceToken, ConsentReplayGuard } from '../operator/trusted-issuer-registry.mjs';

const readCapabilities = ['device.files.read', 'device.directories.list'];
const registry = loadAdapterRegistry();
const windows = registry.adapters.find(adapter => adapter.platform === 'windows');

// Test-only synthetic registry record: no real Windows passport is created here.
const identity = Object.freeze({
  platform: 'windows',
  identityVerified: true,
  registrationState: 'TRUSTED_REGISTRY_READ',
  identitySource: 'WINDOWS_CIM_READONLY',
  passportAuthority: 'OWNER_SIGNED_WINDOWS_PASSPORT',
  ownerSubject: 'w01-test-owner',
  passportSha256: 'a'.repeat(64)
});

test('only bounded Windows workspace read/list are declared with the autonomous READ disposition', () => {
  assert.ok(windows, 'Windows platform adapter must exist');
  assert.equal(windows.implementationStatus, 'PARTIAL', 'do not promote adapter without live qualification');
  for (const capability of readCapabilities) {
    const claim = windows.capabilities?.[capability];
    assert.ok(claim, `undeclared Windows bounded read: ${capability}`);
    assert.equal(claim.state, 'SUPPORTED', 'source declaration is not a live verified capability');
    assert.equal(claim.requiresHumanConsent, false, 'scoped READ policy does not require separate consent token');
    assert.equal(admitCommand({
      platform: 'windows', capability, authorityTier: 'READ', humanConfirmed: false
    }, registry).admitted, true, 'operator metadata must recognize owner-governed READ');
    assert.equal(admitCommand({
      platform: 'windows', capability, authorityTier: 'MUTATE', humanConfirmed: false
    }, registry).admitted, false, 'a caller cannot claim mutation authority without consent');
  }
  assert.equal(windows.capabilities['device.files.write'], undefined);
  assert.equal(windows.capabilities['device.ui.control'], undefined);
  assert.equal(windows.capabilities['device.health'].requiresHumanConsent, false);
});

test('owner-scoped READ requires trusted device identity plus actual Formula and Veritas gate success', async () => {
  const args = { path: 'workspace' };
  const admitted = createC3AdmissionBinding({
    deviceRegistry: new Map([['pc-primary', identity]]), registry,
    formulaPreGate: async () => true, veritasPreGate: async () => true,
  });
  // Successful fixtures demonstrate the C3 policy path, not live authority.
  for (const capability of readCapabilities) {
    assert.equal(await admitted({deviceId:'pc-primary',capability,args}), true, capability);
  }
  const missingFormula = createC3AdmissionBinding({
    deviceRegistry: new Map([['pc-primary', identity]]), registry,
    veritasPreGate: async () => true,
  });
  const rejectedFormula = createC3AdmissionBinding({
    deviceRegistry: new Map([['pc-primary', identity]]), registry,
    formulaPreGate: async () => false, veritasPreGate: async () => true,
  });
  const missingVeritas = createC3AdmissionBinding({
    deviceRegistry: new Map([['pc-primary', identity]]), registry,
    formulaPreGate: async () => true,
  });
  const rejectedVeritas = createC3AdmissionBinding({
    deviceRegistry: new Map([['pc-primary', identity]]), registry,
    formulaPreGate: async () => true, veritasPreGate: async () => false,
  });
  for (const gate of [missingFormula,rejectedFormula,missingVeritas,rejectedVeritas]) {
    assert.equal(await gate({deviceId:'pc-primary',capability:'device.files.read',args}),false);
  }
  const unverifiedIdentity = createC3AdmissionBinding({
    deviceRegistry: new Map([['pc-primary', {platform:'windows'}]]), registry,
    formulaPreGate: async () => true, veritasPreGate: async () => true,
  });
  assert.equal(await unverifiedIdentity({deviceId:'pc-primary',capability:'device.files.read',args}),false);
  assert.equal(await admitted({deviceId:'unregistered',capability:'device.files.read',args}),false);
  assert.equal(await admitted({deviceId:'pc-primary',capability:'device.files.write',args}),false);
});

test('consent remains required for consequential capabilities; signed nonce replay fails closed',async()=>{
  const isolatedRegistry = structuredClone(registry);
  const win = isolatedRegistry.adapters.find(adapter=>adapter.platform==='windows');
  // This capability exists ONLY in this test registry, never in the exported source registry.
  win.capabilities['device.files.write'] = { state:'SUPPORTED',requiresHumanConsent:true };
  const {privateKey,publicKey}=generateKeyPairSync('ed25519');
  const issuer = {
    issuerId:'w01-test-only-issuer',keyId:'w01-test-only-key',algorithm:'Ed25519',
    publicKeySpki:publicKey.export({type:'spki',format:'pem'}),
    status:'ACTIVE',validUntil:new Date(Date.now()+86400000).toISOString()
  };
  let consent = null;
  const c3 = createC3AdmissionBinding({
    deviceRegistry: new Map([['pc-primary',identity]]),
    registry: isolatedRegistry,
    trustedIssuerRegistry: {[issuer.issuerId]:issuer},
    replayGuard: new ConsentReplayGuard({inMemoryOnly:true}),
    formulaPreGate: async () => true,
    veritasPreGate: async () => true,
    consentProvider: async () => consent
  });
  const capability='device.files.write';
  const args={path:'workspace/test-only.txt',text:'synthetic test data'};
  assert.equal(await c3({deviceId:'pc-primary',capability,args}),false,'no signed consent');
  consent=createConsentEvidenceToken({
    issuer:issuer.issuerId,keyId:issuer.keyId,
    privateKeyPem:privateKey.export({type:'pkcs8',format:'pem'}),
    requestId:'W01-TEST-MUTATE-001',deviceId:'pc-primary',platform:'windows',
    capability,args,sessionNonce:'w01-test-session-001',tokenNonce:'w01-test-token-001'
  });
  assert.equal(await c3({deviceId:'pc-primary',capability,args}),true,'test-only signed mutation allowed');
  assert.equal(await c3({deviceId:'pc-primary',capability,args}),false,'consent replay rejected');
  assert.equal(registry.adapters.find(a=>a.platform==='windows').capabilities['device.files.write'],undefined,
    'test-only synthetic mutation did not escape into actual registry');
});

test('DesktopAdapter keeps READ confined to the configured workspace and denies traversal/symlinks', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'leeway-w01-workspace-'));
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'leeway-w01-outside-'));
  t.after(async()=>{ await fs.rm(root,{recursive:true,force:true}); await fs.rm(outside,{recursive:true,force:true}); });
  await fs.writeFile(path.join(root,'approved.txt'),'synthetic W01 read evidence');
  await fs.writeFile(path.join(outside,'outside.txt'),'must not be read');
  const adapter = new DesktopAdapter(root);
  const read = await adapter.execute('device.files.read',{path:'approved.txt'});
  assert.equal(read.text,'synthetic W01 read evidence');
  const listing = await adapter.execute('device.directories.list',{path:'.',limit:10});
  assert.ok(listing.entries.some(entry=>entry.name==='approved.txt'));
  await assert.rejects(
    adapter.execute('device.files.read',{path:'../outside.txt'}),
    /INVALID_PATH|PATH_OUTSIDE_WORKSPACE/
  );
  await assert.rejects(
    adapter.execute('device.directories.list',{path:'..',limit:10}),
    /INVALID_PATH|PATH_OUTSIDE_WORKSPACE/
  );
  await assert.rejects(
    adapter.execute('device.files.read',{path:path.join(outside,'outside.txt')}),
    /INVALID_PATH|PATH_OUTSIDE_WORKSPACE/
  );
  await fs.symlink(path.join(outside,'outside.txt'),path.join(root,'linked.txt'));
  await assert.rejects(
    adapter.execute('device.files.read',{path:'linked.txt'}),
    /LINK_NOT_ALLOWED/
  );
});
