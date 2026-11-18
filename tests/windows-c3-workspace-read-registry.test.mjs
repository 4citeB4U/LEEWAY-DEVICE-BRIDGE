/**
 * LEEWAY HEADER — DO NOT REMOVE
 * REGION: LEEWAY.DEVICE.BRIDGE.WINDOWS.READ_ADMISSION.TEST
 * TAG: LEEWAY.W01.WINDOWS.C3.READ_REGISTRY_REGRESSION.V1
 * 5WH: WHAT=Assert Windows C3 registry declares bounded workspace reads and still rejects unauthorized calls.
 * WHY=Prevent health-only operator metadata from silently denying previously qualified workspace reads.
 * WHO=Creator-authorized W01 outside support contributor; WHERE=tests/windows-c3-workspace-read-registry.test.mjs.
 * WHEN=2026-11-17; HOW=Test-only signed owner consent + source registry + C3 callback, never a physical read.
 * AUTHORITY=TEST_ONLY; no live token, Formula/Veritas decision, Receipt, or production admission.
 * LICENSE=MIT.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { loadAdapterRegistry, admitCommand } from '../operator/device-operator.mjs';
import { createC3AdmissionBinding } from '../operator/c3-admission-binding.mjs';
import { createConsentEvidenceToken, ConsentReplayGuard } from '../operator/trusted-issuer-registry.mjs';

const readCapabilities = ['device.files.read', 'device.directories.list'];
const registry = loadAdapterRegistry();
const win = registry.adapters.find(a => a.platform === 'windows');

test('Windows operator registry declares both workspace read capabilities as consent-gated, not verified grants', () => {
  assert.ok(win, 'Windows operator metadata must exist');
  for (const cap of readCapabilities) {
    const claim = win.capabilities?.[cap];
    assert.ok(claim, `missing Windows C3 metadata: ${cap}`);
    assert.equal(claim.state, 'SUPPORTED');
    assert.equal(claim.requiresHumanConsent, true);
    assert.equal(admitCommand({platform:'windows',capability:cap,authorityTier:'MUTATE',humanConfirmed:false},registry).admitted,false);
  }
  assert.equal(win.capabilities['device.files.write'], undefined, 'do not broaden Windows mutation claims');
  assert.equal(win.capabilities['device.health'].requiresHumanConsent,false);
});

test('read-only Bridge entry remains denied without a trusted owner-signed consent', async () => {
  const verified = {
    platform:'windows', identityVerified:true, registrationState:'TRUSTED_REGISTRY_READ',
    identitySource:'WINDOWS_CIM_READONLY',passportAuthority:'OWNER_SIGNED_WINDOWS_PASSPORT',
    ownerSubject:'test-owner-only',passportSha256:'a'.repeat(64)
  };
  const c3 = createC3AdmissionBinding({
    deviceRegistry: new Map([['pc-primary',verified]]), registry,
    formulaPreGate: async()=>true, veritasPreGate: async()=>true
  });
  for(const cap of readCapabilities) {
    assert.equal(await c3({deviceId:'pc-primary',capability:cap,args:{path:'safe.txt'}}),false);
  }
  const badIdentity=createC3AdmissionBinding({
    deviceRegistry:new Map([['pc-primary',{platform:'windows'}]]),registry,
    formulaPreGate:async()=>true,veritasPreGate:async()=>true
  });
  assert.equal(await badIdentity({deviceId:'pc-primary',capability:'device.health',args:{}}),false);
});

test('test-only signed owner consent admits only exact requested read and rejects replay',async()=>{
  const {privateKey,publicKey}=generateKeyPairSync('ed25519');
  const issuer={
    issuerId:'test-w01-consent-issuer',keyId:'test-w01-key',algorithm:'Ed25519',
    publicKeySpki:publicKey.export({type:'spki',format:'pem'}),
    status:'ACTIVE',validUntil:new Date(Date.now()+86400000).toISOString()
  };
  const owner='test-owner-only';
  let nextToken=null;
  const c3=createC3AdmissionBinding({
    deviceRegistry:new Map([['pc-primary',{
      platform:'windows',identityVerified:true,registrationState:'TRUSTED_REGISTRY_READ',
      identitySource:'WINDOWS_CIM_READONLY',passportAuthority:'OWNER_SIGNED_WINDOWS_PASSPORT',
      ownerSubject:owner,passportSha256:'b'.repeat(64)
    }]]),
    registry, trustedIssuerRegistry:{[issuer.issuerId]:issuer},
    replayGuard:new ConsentReplayGuard({inMemoryOnly:true}),
    formulaPreGate:async()=>true,veritasPreGate:async()=>true,
    consentProvider:async()=>nextToken
  });
  const privateKeyPem=privateKey.export({type:'pkcs8',format:'pem'});
  for(const [i,cap] of readCapabilities.entries()){
    const args=cap==='device.directories.list'?{path:'workspace',limit:10}:{path:'workspace/checkpoint.md'};
    nextToken=createConsentEvidenceToken({
      issuer:issuer.issuerId,keyId:issuer.keyId,privateKeyPem,
      requestId:`W01-READ-TEST-${i}`,deviceId:'pc-primary',platform:'windows',
      capability:cap,args,sessionNonce:`session-read-test-${i}`,tokenNonce:`token-read-test-${i}`
    });
    assert.equal(await c3({deviceId:'pc-primary',capability:cap,args}),true,`signed ${cap} should be admitted`);
    assert.equal(await c3({deviceId:'pc-primary',capability:cap,args}),false,'replay must be denied');
  }
});
