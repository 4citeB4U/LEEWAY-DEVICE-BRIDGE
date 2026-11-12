/*
REGION: 🟢 TESTS / OPERATOR
TAG: LEEWAY-UPDATE-CONTRACT-TEST
WHO: Agent Lee / Runtime Fabric / Device Bridge
WHAT: Unit tests for Unified Device Bridge Update Contract state machines and receipts.
*/
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  UPDATE_STATES,
  validateUpdateManifest,
  evaluateCompatibility,
  verifyPackageIntegrity,
  executeUpdateLifecycle,
} from "../operator/update-contract.mjs";

const samplePackageBuffer = Buffer.from("LEEWAY-DEVICE-BRIDGE-TEST-PAYLOAD-V2");
const sampleSha256 = createHash("sha256").update(samplePackageBuffer).digest("hex");

function createMockManifest(overrides = {}) {
  return {
    schemaVersion: "1.0.0",
    authority: "LEEWAY_UNIFIED_UPDATE_AUTHORITY_V1",
    packageId: "industries.leeway.devicebridge",
    version: "2.1.0",
    lastKnownGoodVersion: "2.0.0",
    compatibility: {
      platforms: ["windows", "android", "ios"],
      supportedModels: ["SM-F956U", "iPhone12,1", "pc-primary"],
      minOsVersion: "1.0.0",
    },
    minAdapterVersion: "1.0.0",
    integrity: {
      sha256: sampleSha256,
      signingIdentity: "LeeWay Industries Release Authority",
      signature: "mock-valid-sig",
    },
    permissions: ["INTERNET", "ACCESS_NETWORK_STATE"],
    rolloutPercentage: 100,
    state: "DISCOVERED",
    ...overrides,
  };
}

test("UpdateContract: validates complete manifest and rejects malformed fields", () => {
  const manifest = createMockManifest();
  assert.equal(validateUpdateManifest(manifest), true);

  assert.throws(() => validateUpdateManifest(null), /INVALID_UPDATE_MANIFEST/);
  assert.throws(() => validateUpdateManifest(createMockManifest({ schemaVersion: "2.0.0" })), /UNSUPPORTED_SCHEMA_VERSION/);
  assert.throws(() => validateUpdateManifest(createMockManifest({ version: "invalid" })), /INVALID_VERSION_FORMAT/);
  assert.throws(() => validateUpdateManifest(createMockManifest({ integrity: { sha256: "short" } })), /VALID_INTEGRITY_SHA256_REQUIRED/);
});

test("UpdateContract: compatibility filter enforces platform, model, and minAdapterVersion", () => {
  const manifest = createMockManifest();

  // Matched Windows device
  const win = evaluateCompatibility(manifest, { platform: "windows", model: "pc-primary", adapterVersion: "1.5.0" });
  assert.equal(win.compatible, true);

  // Unmatched platform
  const solaris = evaluateCompatibility(manifest, { platform: "solaris" });
  assert.equal(solaris.compatible, false);
  assert.equal(solaris.reason, "PLATFORM_NOT_SUPPORTED");

  // Adapter version too low
  const oldAdapter = evaluateCompatibility(manifest, { platform: "windows", adapterVersion: "0.9.0" });
  assert.equal(oldAdapter.compatible, false);
  assert.equal(oldAdapter.reason, "ADAPTER_VERSION_TOO_LOW");
});

test("UpdateContract: package integrity rejects tampered payload", () => {
  const ok = verifyPackageIntegrity(samplePackageBuffer, sampleSha256);
  assert.equal(ok.verified, true);

  const tampered = Buffer.from("TAMPERED-BYTES");
  const bad = verifyPackageIntegrity(tampered, sampleSha256);
  assert.equal(bad.verified, false);
});

test("UpdateContract: Windows desktop full success lifecycle triggers HEALTH_GATED_ACTIVE", async () => {
  const manifest = createMockManifest();
  const targetDevice = { id: "pc-primary", platform: "windows", adapterVersion: "1.5.0", model: "pc-primary" };

  let installed = false;
  let healthChecked = false;

  const receipt = await executeUpdateLifecycle({
    manifest,
    targetDevice,
    packageBuffer: samplePackageBuffer,
    installFn: async () => { installed = true; return true; },
    healthCheckFn: async () => { healthChecked = true; return true; },
    rollbackFn: async () => {},
  });

  assert.equal(installed, true);
  assert.equal(healthChecked, true);
  assert.equal(receipt.finalState, UPDATE_STATES.HEALTH_GATED_ACTIVE);
  assert.equal(receipt.success, true);
  assert.equal(receipt.healthCheckPassed, true);
  assert.equal(receipt.rollbackExecuted, false);
  assert.equal(receipt.toVersion, "2.1.0");
});

test("UpdateContract: Windows desktop health failure automatically executes rollback", async () => {
  const manifest = createMockManifest();
  const targetDevice = { id: "pc-primary", platform: "windows", adapterVersion: "1.5.0", model: "pc-primary" };

  let rolledBackTo = null;

  const receipt = await executeUpdateLifecycle({
    manifest,
    targetDevice,
    packageBuffer: samplePackageBuffer,
    installFn: async () => true,
    healthCheckFn: async () => false, // Health gate rejects!
    rollbackFn: async (version) => { rolledBackTo = version; },
  });

  assert.equal(rolledBackTo, "2.0.0");
  assert.equal(receipt.finalState, UPDATE_STATES.ROLLED_BACK);
  assert.equal(receipt.success, false);
  assert.equal(receipt.healthCheckPassed, false);
  assert.equal(receipt.rollbackExecuted, true);
});

test("UpdateContract: Android unprivileged installer halts at AWAITING_OWNER_ACTION", async () => {
  const manifest = createMockManifest();
  const targetDevice = { id: "phone-fold6", platform: "android", model: "SM-F956U", adapterVersion: "1.2.0" };

  const receipt = await executeUpdateLifecycle({
    manifest,
    targetDevice,
    packageBuffer: samplePackageBuffer,
    isPrivileged: false,
  });

  assert.equal(receipt.finalState, UPDATE_STATES.AWAITING_OWNER_ACTION);
  assert.equal(receipt.pendingOwnerAction, true);
  assert.equal(receipt.handoff?.authorityType, "PACKAGE_INSTALLER_PROMPT");
});

test("UpdateContract: Apple iOS never claims silent update and gates at AWAITING_OWNER_ACTION", async () => {
  const manifest = createMockManifest();
  const targetDevice = { id: "phone-iphone11", platform: "ios", model: "iPhone12,1", adapterVersion: "1.1.0" };

  const receipt = await executeUpdateLifecycle({
    manifest,
    targetDevice,
    packageBuffer: samplePackageBuffer,
  });

  assert.equal(receipt.finalState, UPDATE_STATES.AWAITING_OWNER_ACTION);
  assert.equal(receipt.pendingOwnerAction, true);
  assert.equal(receipt.handoff?.authorityType, "SIDESTORE_ILOADER");
  assert.ok(receipt.handoff?.deepLinkUrl.includes("APPLE-DIRECT-ILOADER-DELIVERY"));
});

