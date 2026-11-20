/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.OWNER_CONSENT.NEGATIVE_TEST
TAG: LEEWAY.BRIDGE.OWNER_CONSENT.FAIL_CLOSED_TEST_V1
5WH:
WHAT = Verify unconfigured owner-consent integration cannot issue approvals.
WHY = Prevent automatic consent at host startup if original Runtime providers are absent.
WHO = LeeWay Device Bridge contributors; tests are not production qualification.
WHERE = tests/runtime-owner-consent-negative.test.mjs.
WHEN = 2026-11-20.
HOW = Test startup refusal with absent providers, issuer enrollment, or signing authority.
LICENSE = MIT.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntimeOwnerConsentProvider } from '../operator/identity/runtime-owner-consent-provider.mjs';

const noop=async()=>null;
const callbacks={
 requestOwnerAuthorization:noop,
 verifyOwnerAuthorization:noop,
 recordOwnerProof:noop,
};

test('owner consent adapter refuses startup without genuine Runtime callbacks',()=>{
 assert.throws(()=>createRuntimeOwnerConsentProvider({}),/RUNTIME_OWNER_CONSENT_PROVIDERS_REQUIRED/);
});
test('unregistered issuer cannot activate owner consent',()=>{
 assert.throws(()=>createRuntimeOwnerConsentProvider({
  ...callbacks,trustedIssuerRegistry:{},consentIssuer:'not-enrolled',
  consentKeyId:'none',consentPrivateKeyPem:'not-a-key'
 }),/RUNTIME_OWNER_CONSENT_ISSUER_NOT_ENROLLED/);
});
test('host refuses owner consent when an enrolled issuer has no signing key',()=>{
 assert.throws(()=>createRuntimeOwnerConsentProvider({
  ...callbacks,
  trustedIssuerRegistry:{example:{
    issuerId:'example',keyId:'test',status:'ACTIVE',algorithm:'Ed25519',
    publicKeySpki:'-----BEGIN PUBLIC KEY-----\nplaceholder\n-----END PUBLIC KEY-----'
  }},
  consentIssuer:'example',consentKeyId:'test',
 }),/RUNTIME_OWNER_CONSENT_SIGNING_KEY_REQUIRED/);
});
