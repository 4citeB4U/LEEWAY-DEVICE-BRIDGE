/*
REGION: LeeWay Device Passport cross-platform qualification
TAG: LEEWAY-DEVICE-PASSPORT-FIXTURES-TEST
WHO: Veritas / CI
WHAT: Verify Android, Apple, invalid-hybrid, and reconciliation-provenance device passport validation.
WHEN: Every repository test run.
WHERE: 4citeB4U/LEEWAY-DEVICE-BRIDGE/tests
WHY: Guarantee that Apple device support does not weaken Android contracts or LeeWay identity authority.
HOW: Ajv 2020 validation against contracts/device-passport.schema.json with canonical and negative fixtures.
LICENSE: MIT
*/
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const Ajv2020 = require("ajv/dist/2020.js");

const ajv = new Ajv2020({ allErrors: true });
const schemaPath = path.join(HERE, "../contracts/device-passport.schema.json");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const reconciliationSchema = JSON.parse(fs.readFileSync(path.join(HERE, '../contracts/reconciliation.schema.json'), 'utf8'));
ajv.addSchema(reconciliationSchema);
const validate = ajv.compile(schema);

// Fixture 1: Real Android Observed Specimen (from DevicePassport.kt & test logs)
export const androidSpecimen = {
  schemaVersion: "0.1.0",
  authority: "NATIVE_ANDROID_OBSERVED",
  manufacturer: "samsung",
  model: "SM-F956U1",
  device: "q6q",
  product: "q6quew",
  hardware: "qcom",
  androidRelease: "14",
  sdkInt: 34,
  securityPatch: "2026-08-01",
  supportedAbis: ["arm64-v8a", "armeabi-v7a", "armeabi"]
};

// Fixture 2: Apple iPhone 11 Specimen (iOS 17.6.1)
export const appleSpecimen = {
  schemaVersion: "0.1.0",
  authority: "NATIVE_APPLE_OBSERVED",
  manufacturer: "Apple",
  model: "iPhone 11",
  device: "iPhone12,1",
  product: "iPhone12,1",
  osVersion: "17.6.1",
  buildNumber: "21G93",
  applePlatform: "ios"
};

// Fixture 3: Negative Android Specimen (missing androidRelease, sdkInt, supportedAbis)
export const androidInvalidSpecimen = {
  schemaVersion: "0.1.0",
  authority: "NATIVE_ANDROID_OBSERVED",
  manufacturer: "samsung",
  model: "SM-F956U1",
  device: "q6q",
  product: "q6quew"
};

// Fixture 4: Negative Apple Specimen (missing osVersion)
export const appleInvalidSpecimen = {
  schemaVersion: "0.1.0",
  authority: "NATIVE_APPLE_OBSERVED",
  manufacturer: "Apple",
  model: "iPhone 11",
  device: "iPhone12,1",
  product: "iPhone12,1"
};

// Fixture 5: Invalid Hybrid Specimen A (Android authority declaring Apple osVersion / applePlatform)
export const invalidHybridAndroidWithAppleFields = {
  schemaVersion: "0.1.0",
  authority: "NATIVE_ANDROID_OBSERVED",
  manufacturer: "samsung",
  model: "SM-F956U1",
  device: "q6q",
  product: "q6quew",
  androidRelease: "14",
  sdkInt: 34,
  supportedAbis: ["arm64-v8a"],
  osVersion: "17.6.1",
  applePlatform: "ios"
};

// Fixture 6: Invalid Hybrid Specimen B (Apple authority declaring Android sdkInt / androidRelease)
export const invalidHybridAppleWithAndroidFields = {
  schemaVersion: "0.1.0",
  authority: "NATIVE_APPLE_OBSERVED",
  manufacturer: "Apple",
  model: "iPhone 11",
  device: "iPhone12,1",
  product: "iPhone12,1",
  osVersion: "17.6.1",
  androidRelease: "14",
  sdkInt: 34
};

// Fixture 7: Unreconciled / Missing Provenance Verified Device Passport (MUST FAIL)
export const unprovenancedVerifiedPassportSpecimen = {
  schemaVersion: "0.1.0",
  authority: "VERIFIED_DEVICE_PASSPORT",
  manufacturer: "Apple",
  model: "iPhone 11",
  device: "iPhone12,1",
  product: "iPhone12,1",
  osVersion: "17.6.1"
};

// Fixture 8: Valid Reconciled Verified Device Passport Specimen with complete provenance
export const verifiedPassportSpecimen = {
  schemaVersion: "0.1.0",
  authority: "VERIFIED_DEVICE_PASSPORT",
  manufacturer: "Apple",
  model: "iPhone 11",
  device: "iPhone12,1",
  product: "iPhone12,1",
  osVersion: "17.6.1",
  reconciliation: {
    bootstrapSessionId: "rec-session-20261020-001",
    browserAuthority: "BROWSER_DISCOVERY_ONLY",
    nativeAuthority: "NATIVE_APPLE_OBSERVED",
    status: "MATCH",
    differences: [],
    promotedAuthority: "VERIFIED_DEVICE_PASSPORT"
  }
};
// Invariant 1: Android existing passport MUST ALWAYS validate
assert.equal(validate(androidSpecimen), true, "Android specimen must pass schema validation");

// Invariant 2: Apple passport positive MUST validate unconditionally
assert.equal(validate(appleSpecimen), true, "Apple positive specimen must pass schema validation unconditionally");

// Invariant 3: Android negative specimen MUST fail
assert.equal(validate(androidInvalidSpecimen), false, "Android negative specimen must fail schema validation");

// Invariant 4: Apple negative specimen MUST fail
assert.equal(validate(appleInvalidSpecimen), false, "Apple negative specimen must fail schema validation");

// Invariant 5: Invalid hybrid Android specimen MUST fail
assert.equal(validate(invalidHybridAndroidWithAppleFields), false, "Android specimen with Apple fields must fail schema validation");

// Invariant 6: Invalid hybrid Apple specimen MUST fail
assert.equal(validate(invalidHybridAppleWithAndroidFields), false, "Apple specimen with Android fields must fail schema validation");

// Invariant 7: VERIFIED_DEVICE_PASSPORT without reconciliation provenance MUST fail
assert.equal(validate(unprovenancedVerifiedPassportSpecimen), false, "Verified passport lacking reconciliation provenance must fail schema validation");

// Invariant 8: Reconciled Verified Device Passport with legitimate provenance MUST pass
assert.equal(validate(verifiedPassportSpecimen), true, "Verified reconciled passport with provenance must pass schema validation");

console.log("PASS device passport cross-platform fixtures (unconditional Apple, hybrid rejection & reconciliation provenance)");

assert.equal(validate({...verifiedPassportSpecimen,
 reconciliation:{...verifiedPassportSpecimen.reconciliation,bootstrapSessionId:undefined}}),false,
 "Verified passport with missing canonical session must fail");
assert.equal(validate({...verifiedPassportSpecimen,
 reconciliation:{...verifiedPassportSpecimen.reconciliation,status:"PARTIAL_MATCH"}}),false,
 "Partial match cannot promote verified passport");
assert.equal(validate({...verifiedPassportSpecimen,
 reconciliation:{...verifiedPassportSpecimen.reconciliation,promotedAuthority:"NOT_PROMOTED"}}),false,
 "Explicit not-promoted reconciliation cannot become verified passport");
// Negative promotion verification: these are source-only JSON fixtures,
// never credentials or production device-enrollment evidence.
const verifiedAndroidSpecimen={
 ...androidSpecimen,authority:"VERIFIED_DEVICE_PASSPORT",
 reconciliation:{...verifiedPassportSpecimen.reconciliation,nativeAuthority:"NATIVE_ANDROID_OBSERVED"}
};
assert.equal(validate(verifiedAndroidSpecimen),true,
 "Verified Android shape must preserve canonical reconciled native Android identity");
assert.equal(validate({...verifiedPassportSpecimen,
 reconciliation:{...verifiedPassportSpecimen.reconciliation,differences:[{field:"model"}]}}),false,
 "Mismatch evidence cannot be promoted by reporting status MATCH");
assert.equal(validate({...verifiedPassportSpecimen,
 reconciliation:{...verifiedPassportSpecimen.reconciliation,bootstrapSessionId:""}}),false,
 "Blank bootstrap session cannot be promoted");
assert.equal(validate({...verifiedPassportSpecimen,androidRelease:"14"}),false,
 "Promoted Apple passport must reject Android-only hardware fields");
assert.equal(validate({...verifiedPassportSpecimen,osVersion:undefined}),false,
 "Promoted Apple passport requires native Apple OS version");
assert.equal(validate({...verifiedPassportSpecimen,
 reconciliation:{...verifiedPassportSpecimen.reconciliation,nativeAuthority:"NATIVE_ANDROID_OBSERVED"}}),false,
 "Promoted Apple payload cannot claim Android native authority");
assert.equal(validate({...verifiedAndroidSpecimen,supportedAbis:undefined}),false,
 "Promoted Android passport must retain native architecture field");
assert.equal(validate({...verifiedAndroidSpecimen,osVersion:"18.7"}),false,
 "Promoted Android passport rejects native Apple fields");
assert.equal(validate({...appleSpecimen,supportedAbis:["arm64-v8a"]}),false,"Native Apple must reject Android ABIs");
assert.equal(validate({...verifiedPassportSpecimen,supportedAbis:["arm64-v8a"]}),false,"Reconciled Apple must reject Android ABIs");
