/*
REGION: 🟢 CORE / OPERATOR
TAG: LEEWAY-C3-ADMISSION-BINDING-TEST
WHO: Veritas / CI / Agent Lee
WHAT: Verify hardened canonical C3 admission binding for Bridge.call() across iOS, Android, and Windows.
WHEN: Every repository test run.
WHERE: 4citeB4U/LEEWAY-DEVICE-BRIDGE/tests
WHY: Replace placeholder admission: async () => true with governed C3 admission;
     prove that Apple iPhone 11 read-only capabilities admit while prohibited capabilities fail closed;
     prove that consequential mutations require verified signed consent tokens from registered issuers;
     prove that caller-supplied _authorityTier / _humanConfirmed are stripped and denied.
HOW: Exercise createC3AdmissionBinding directly and within Bridge.call().
LICENSE: MIT
*/
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { Bridge } from "../packages/protocol/index.mjs";
import { createC3AdmissionBinding } from "../operator/c3-admission-binding.mjs";
import { createConsentEvidenceToken, ConsentReplayGuard } from "../operator/trusted-issuer-registry.mjs";

const { publicKey: carrierPub, privateKey: carrierPriv } = generateKeyPairSync("ed25519");
const carrierPubSpki = carrierPub.export({ type: "spki", format: "pem" });
const carrierPrivPkcs8 = carrierPriv.export({ type: "pkcs8", format: "pem" });

const TRUSTED_ISSUER_REGISTRY = {
  "leeway.runtime.carrier.v1": {
    issuerId: "leeway.runtime.carrier.v1",
    displayName: "LeeWay Canonical Runtime Fabric Carrier",
    keyId: "carrier-ed25519-key-001",
    algorithm: "Ed25519",
    publicKeySpki: carrierPubSpki,
    status: "ACTIVE",
    validUntil: "2027-01-01T00:00:00.000Z"
  }
};

const devices = [
  {
    id: "iphone-11-live",
    platform: "ios",
    grants: ["device.info", "device.files.read", "device.apps.launch", "device.files.write"],
    adapter: {
      discover: async () => ["device.info", "device.files.read", "device.apps.launch", "device.files.write"],
      execute: async (cap) => ({ ok: true, capability: cap, platform: "ios" })
    }
  },
  {
    id: "samsung-fold6-live",
    platform: "android",
    grants: ["device.info", "device.files.write"],
    adapter: {
      discover: async () => ["device.info", "device.files.write"],
      execute: async (cap) => ({ ok: true, capability: cap, platform: "android" })
    }
  }
];

let globalConsent = false;
let nonceCounter = 1;

const replayGuard = new ConsentReplayGuard({ inMemoryOnly: true });

const consentProvider = async ({ deviceId, platform, capability, argsDigest }) => {
  if (!globalConsent) return null;
  return createConsentEvidenceToken({
    issuer: "leeway.runtime.carrier.v1",
    keyId: "carrier-ed25519-key-001",
    privateKeyPem: carrierPrivPkcs8,
    requestId: "TURN-TEST-0001",
    deviceId,
    platform,
    capability,
    args: { path: "test.txt", text: "hello" },
    sessionNonce: "sess-nonce-12345678",
    tokenNonce: "token-nonce-" + (nonceCounter++)
  });
};

const admission = createC3AdmissionBinding({
  deviceRegistry: devices,
  trustedIssuerRegistry: TRUSTED_ISSUER_REGISTRY,
  replayGuard,
  veritasPreGate: async ({ capability }) => true,
  formulaPreGate: async ({ capability }) => true,
  consentProvider
});

const receipts = [];
const bridge = new Bridge(devices, {
  admission,
  receiptSink: async (r) => receipts.push(r)
});

// ── Invariant 1: iPhone 11 device.info is ADMITTED ──────────────────────────
{
  const admitted = await admission({ deviceId: "iphone-11-live", capability: "device.info", args: {} });
  assert.equal(admitted, true, "iPhone 11 device.info must be admitted by C3");
  const callResult = await bridge.call("iphone-11-live", "device.info", {});
  assert.equal(callResult.ok, true);
  assert.equal(callResult.result.ok, true);
  console.log("  ✔ Invariant 1: iPhone 11 device.info admitted by canonical C3 gate");
}

// ── Invariant 2: iPhone 11 device.ui.control is REFUSED directly (UNAVAILABLE)
{
  const admitted = await admission({ deviceId: "iphone-11-live", capability: "device.ui.control", args: {} });
  assert.equal(admitted, false, "iOS device.ui.control must be refused (UNAVAILABLE)");
  console.log("  ✔ Invariant 2: iPhone 11 device.ui.control denied directly by C3 gate");
}

// ── Invariant 3: iPhone 11 device.apps.install is REFUSED directly (BLOCKED) ──
{
  globalConsent = true;
  const admitted = await admission({ deviceId: "iphone-11-live", capability: "device.apps.install", args: {} });
  assert.equal(admitted, false, "iOS device.apps.install must be refused (BLOCKED)");
  globalConsent = false;
  console.log("  ✔ Invariant 3: iPhone 11 device.apps.install blocked directly by C3 gate");
}

// ── Invariant 4: iPhone 11 undeclared mutation (files.write) DENIED in Bridge ─
{
  // device.files.write is in protocol schemas, but NOT declared/supported in iOS adapter-registry
  const callResult = await bridge.call("iphone-11-live", "device.files.write", { path: "test.txt", text: "hello" });
  assert.equal(callResult.ok, false);
  assert.equal(callResult.error, "ADMISSION_DENIED");
  console.log("  ✔ Invariant 4: iPhone 11 undeclared mutation denied by Bridge admission gate");
}

// ── Invariant 5: Android device.info is ADMITTED ────────────────────────────
{
  const admitted = await admission({ deviceId: "samsung-fold6-live", capability: "device.info", args: {} });
  assert.equal(admitted, true, "Android device.info must be admitted");
  console.log("  ✔ Invariant 5: Android device.info admitted");
}

// ── Invariant 6: Android files.write without consent is REFUSED in Bridge ────
{
  globalConsent = false;
  const callResult = await bridge.call("samsung-fold6-live", "device.files.write", { path: "test.txt", text: "hello" });
  assert.equal(callResult.ok, false);
  assert.equal(callResult.error, "ADMISSION_DENIED");
  console.log("  ✔ Invariant 6: Android files.write without consent denied by Bridge");
}

// ── Invariant 7: Android files.write with signed consent is ADMITTED ────────
{
  globalConsent = true;
  const callResult = await bridge.call("samsung-fold6-live", "device.files.write", { path: "test.txt", text: "hello" });
  assert.equal(callResult.ok, true);
  assert.equal(callResult.result.ok, true);
  globalConsent = false;
  console.log("  ✔ Invariant 7: Android files.write with verified signed consent admitted by Bridge");
}

// ── Invariant 8: Unregistered device fails closed ────────────────────────────
{
  const admitted = await admission({ deviceId: "unknown-rogue-device", capability: "device.info", args: {} });
  assert.equal(admitted, false, "Unregistered device must fail closed");
  console.log("  ✔ Invariant 8: Unregistered device fails closed");
}

// ── Invariant 9: Veritas Pre-Gate refusal denies admission ───────────────────
{
  let veritasInvoked = false;
  const veritasDenyingAdmission = createC3AdmissionBinding({
    deviceRegistry: devices,
    trustedIssuerRegistry: TRUSTED_ISSUER_REGISTRY,
    formulaPreGate: async () => true,
    veritasPreGate: async ({ capability }) => {
      veritasInvoked = true;
      return capability === "device.info"; // Only allow device.info
    },
    consentProvider
  });

  const ok = await veritasDenyingAdmission({ deviceId: "iphone-11-live", capability: "device.info", args: {} });
  assert.equal(ok, true);
  assert.equal(veritasInvoked, true);

  globalConsent = true;
  const blocked = await veritasDenyingAdmission({ deviceId: "samsung-fold6-live", capability: "device.files.write", args: { path: "test.txt", text: "hello" } });
  assert.equal(blocked, false, "Veritas pre-gate refusal must deny admission even with consent");
  globalConsent = false;
  console.log("  ✔ Invariant 9: Veritas pre-gate hook enforced");
}

// ── Invariant 10: Missing Veritas Pre-Gate fails closed ─────────────────────
{
  const unconfiguredVeritas = createC3AdmissionBinding({
    deviceRegistry: devices,
    trustedIssuerRegistry: TRUSTED_ISSUER_REGISTRY,
    formulaPreGate: async () => true
    // veritasPreGate omitted!
  });

  const blocked = await unconfiguredVeritas({ deviceId: "iphone-11-live", capability: "device.info", args: {} });
  assert.equal(blocked, false, "Missing veritasPreGate must fail closed");
  console.log("  ✔ Invariant 10: Missing Veritas Pre-Gate fails closed");
}

// ── Invariant 10b: Missing Formula Pre-Gate fails closed (MANDATORY FORMULA PRE-GATE)
{
  const unconfiguredFormula = createC3AdmissionBinding({
    deviceRegistry: devices,
    trustedIssuerRegistry: TRUSTED_ISSUER_REGISTRY,
    veritasPreGate: async () => true
    // formulaPreGate omitted!
  });

  const blocked = await unconfiguredFormula({ deviceId: "iphone-11-live", capability: "device.info", args: {} });
  assert.equal(blocked, false, "Missing formulaPreGate must fail closed");
  console.log("  ✔ Invariant 10b: Missing Formula Pre-Gate fails closed (Mandatory Formula Verification)");
}

// ── Invariant 11: ATTACK refused: Caller-supplied _humanConfirmed / _authorityTier ignored
{
  globalConsent = false;
  // Direct admission callback test: attacker attempts to bypass consent by passing _humanConfirmed: true and _authorityTier: "READ"
  const admitted = await admission({
    deviceId: "samsung-fold6-live",
    capability: "device.files.write",
    args: { path: "test.txt", text: "hello", _humanConfirmed: true, _authorityTier: "READ" }
  });
  assert.equal(admitted, false, "Caller-supplied _humanConfirmed / _authorityTier must not grant admission");

  // Bridge execution test: extraneous arguments are rejected
  const callResult = await bridge.call("samsung-fold6-live", "device.files.write", {
    path: "test.txt",
    text: "hello",
    _humanConfirmed: true,
    _authorityTier: "READ"
  });
  assert.equal(callResult.ok, false);
  console.log("  ✔ Invariant 11: ATTACK refused: Caller-supplied _humanConfirmed / _authorityTier ignored and denied");
}

console.log("\nPASS canonical C3 admission binding — governed multi-platform admission enforced with signed consent and mandatory Veritas");
