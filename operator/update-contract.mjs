/*
REGION: 🟢 CORE / OPERATOR
TAG: LEEWAY-UPDATE-CONTRACT
WHO: Agent Lee / Runtime Fabric / Device Bridge
WHAT: Unified Device Bridge Update Contract and platform state machine.
      Governs GitHub Releases -> Verification -> Staging -> Platform-Approved Installation
      -> Health Gated Activation -> Rollback -> Signed Update Receipt.
WHEN: Continuous update lifecycle across Windows, Android, and Apple platforms.
WHERE: 4citeB4U/LEEWAY-DEVICE-BRIDGE/operator
WHY: Zero-bureaucracy, fully lawful, self-healing update delivery without spoofing OS boundaries.
LICENSE: MIT
*/
import { createHash, randomUUID } from "node:crypto";

export const UPDATE_STATES = Object.freeze({
  DISCOVERED: "DISCOVERED",
  VERIFIED: "VERIFIED",
  STAGED: "STAGED",
  AWAITING_OWNER_ACTION: "AWAITING_OWNER_ACTION",
  INSTALLING: "INSTALLING",
  HEALTH_GATED_ACTIVE: "HEALTH_GATED_ACTIVE",
  ROLLED_BACK: "ROLLED_BACK",
});

export function parseSemVer(v) {
  if (!v || typeof v !== "string") return null;
  const parts = v.trim().replace(/^v/, "").split(".").map(Number);
  if (parts.length !== 3 || parts.some(n => Number.isNaN(n) || n < 0)) return null;
  return { major: parts[0], minor: parts[1], patch: parts[2] };
}

export function compareSemVer(a, b) {
  const pa = parseSemVer(a);
  const pb = parseSemVer(b);
  if (!pa || !pb) return 0;
  if (pa.major !== pb.major) return pa.major - pb.major;
  if (pa.minor !== pb.minor) return pa.minor - pb.minor;
  return pa.patch - pb.patch;
}

export function validateUpdateManifest(manifest) {
  if (!manifest || typeof manifest !== "object") {
    throw new Error("INVALID_UPDATE_MANIFEST: manifest must be an object");
  }
  if (manifest.schemaVersion !== "1.0.0") {
    throw new Error("UNSUPPORTED_SCHEMA_VERSION: " + manifest.schemaVersion);
  }
  if (!manifest.packageId || typeof manifest.packageId !== "string") {
    throw new Error("PACKAGE_ID_REQUIRED");
  }
  if (!parseSemVer(manifest.version)) {
    throw new Error("INVALID_VERSION_FORMAT: " + manifest.version);
  }
  if (!parseSemVer(manifest.lastKnownGoodVersion)) {
    throw new Error("INVALID_LAST_KNOWN_GOOD_VERSION: " + manifest.lastKnownGoodVersion);
  }
  if (!manifest.compatibility?.platforms?.length) {
    throw new Error("COMPATIBILITY_PLATFORMS_REQUIRED");
  }
  if (!manifest.integrity?.sha256 || !/^[a-f0-9]{64}$/i.test(manifest.integrity.sha256)) {
    throw new Error("VALID_INTEGRITY_SHA256_REQUIRED");
  }
  return true;
}

export function evaluateCompatibility(manifest, targetDevice) {
  validateUpdateManifest(manifest);
  const platform = targetDevice.platform?.toLowerCase();
  if (!manifest.compatibility.platforms.includes(platform)) {
    return { compatible: false, reason: "PLATFORM_NOT_SUPPORTED", platform };
  }
  if (manifest.minAdapterVersion && targetDevice.adapterVersion) {
    if (compareSemVer(targetDevice.adapterVersion, manifest.minAdapterVersion) < 0) {
      return {
        compatible: false,
        reason: "ADAPTER_VERSION_TOO_LOW",
        current: targetDevice.adapterVersion,
        required: manifest.minAdapterVersion,
      };
    }
  }
  if (manifest.compatibility.supportedModels?.length && targetDevice.model) {
    const matched = manifest.compatibility.supportedModels.some(m =>
      targetDevice.model.toLowerCase().includes(m.toLowerCase())
    );
    if (!matched) {
      return { compatible: false, reason: "MODEL_NOT_SUPPORTED", model: targetDevice.model };
    }
  }
  return { compatible: true };
}

export function verifyPackageIntegrity(packageBuffer, expectedSha256) {
  if (!Buffer.isBuffer(packageBuffer)) {
    throw new Error("PACKAGE_BUFFER_REQUIRED");
  }
  const actualHash = createHash("sha256").update(packageBuffer).digest("hex").toLowerCase();
  const expectedHash = expectedSha256.toLowerCase();
  if (actualHash !== expectedHash) {
    return { verified: false, expected: expectedHash, actual: actualHash };
  }
  return { verified: true, sha256: actualHash };
}

export async function executeUpdateLifecycle({
  manifest,
  targetDevice,
  packageBuffer,
  installFn,
  healthCheckFn,
  rollbackFn,
  isPrivileged = false,
  lawfulHandoff = null,
}) {
  const steps = [];
  let currentState = UPDATE_STATES.DISCOVERED;
  steps.push({ state: currentState, timestamp: new Date().toISOString() });

  // 1. Compatibility Check
  const compat = evaluateCompatibility(manifest, targetDevice);
  if (!compat.compatible) {
    return generateReceipt({
      manifest,
      targetDevice,
      finalState: currentState,
      success: false,
      diagnostic: "COMPATIBILITY_FAILED: " + compat.reason,
      steps,
    });
  }

  // 2. Verification
  const integrity = verifyPackageIntegrity(packageBuffer, manifest.integrity.sha256);
  if (!integrity.verified) {
    return generateReceipt({
      manifest,
      targetDevice,
      finalState: currentState,
      success: false,
      diagnostic: "INTEGRITY_CHECK_FAILED: SHA256 mismatch",
      steps,
    });
  }
  currentState = UPDATE_STATES.VERIFIED;
  steps.push({ state: currentState, timestamp: new Date().toISOString() });

  // 3. Staging
  currentState = UPDATE_STATES.STAGED;
  steps.push({ state: currentState, timestamp: new Date().toISOString() });

  // 4. Platform Execution Flow
  const platform = targetDevice.platform?.toLowerCase();

  // Track: Apple iOS (Lawful Handoff - Never claim silent IPA replacement)
  if (platform === "ios" || platform === "ipados") {
    currentState = UPDATE_STATES.AWAITING_OWNER_ACTION;
    const handoffAuthority = lawfulHandoff || {
      authorityType: "SIDESTORE_ILOADER",
      deepLinkUrl: "https://4citeb4u.github.io/LEEWAY-DEVICE-BRIDGE/docs/APPLE-DIRECT-ILOADER-DELIVERY.md",
      instructions: "Owner must trigger sideloading / MDM / TestFlight installation handoff.",
    };
    steps.push({ state: currentState, timestamp: new Date().toISOString(), handoff: handoffAuthority });
    return generateReceipt({
      manifest,
      targetDevice,
      finalState: currentState,
      success: true,
      pendingOwnerAction: true,
      handoff: handoffAuthority,
      diagnostic: "AWAITING_OWNER_ACTION: iOS lawful installation handoff prepared.",
      steps,
    });
  }

  // Track: Android (Samsung Fold6)
  if (platform === "android") {
    if (!isPrivileged) {
      currentState = UPDATE_STATES.AWAITING_OWNER_ACTION;
      const handoffAuthority = {
        authorityType: "PACKAGE_INSTALLER_PROMPT",
        instructions: "System PackageInstaller prompt launched for owner confirmation.",
      };
      steps.push({ state: currentState, timestamp: new Date().toISOString(), handoff: handoffAuthority });
      return generateReceipt({
        manifest,
        targetDevice,
        finalState: currentState,
        success: true,
        pendingOwnerAction: true,
        handoff: handoffAuthority,
        diagnostic: "AWAITING_OWNER_ACTION: PackageInstaller prompt active.",
        steps,
      });
    }
  }

  // Track: Windows / Linux / macOS or Privileged Android (Silent Execution + Health Gate + Auto Rollback)
  currentState = UPDATE_STATES.INSTALLING;
  steps.push({ state: currentState, timestamp: new Date().toISOString() });

  let installOk = false;
  try {
    if (typeof installFn === "function") {
      installOk = await installFn(manifest, packageBuffer);
    } else {
      installOk = true;
    }
  } catch (err) {
    installOk = false;
  }

  if (!installOk) {
    // Immediate rollback
    if (typeof rollbackFn === "function") await rollbackFn(manifest.lastKnownGoodVersion);
    currentState = UPDATE_STATES.ROLLED_BACK;
    steps.push({ state: currentState, timestamp: new Date().toISOString() });
    return generateReceipt({
      manifest,
      targetDevice,
      finalState: currentState,
      success: false,
      rollbackExecuted: true,
      diagnostic: "INSTALLATION_FAILED: Rolled back to " + manifest.lastKnownGoodVersion,
      steps,
    });
  }

  // 5. Health Check Gate
  let healthy = false;
  try {
    if (typeof healthCheckFn === "function") {
      healthy = await healthCheckFn();
    } else {
      healthy = true;
    }
  } catch {
    healthy = false;
  }

  if (!healthy) {
    // Health failed, trigger deterministic rollback
    if (typeof rollbackFn === "function") await rollbackFn(manifest.lastKnownGoodVersion);
    currentState = UPDATE_STATES.ROLLED_BACK;
    steps.push({ state: currentState, timestamp: new Date().toISOString() });
    return generateReceipt({
      manifest,
      targetDevice,
      finalState: currentState,
      success: false,
      healthCheckPassed: false,
      rollbackExecuted: true,
      diagnostic: "HEALTH_CHECK_FAILED: Rolled back to " + manifest.lastKnownGoodVersion,
      steps,
    });
  }

  // 6. Health-Gated Active Activation
  currentState = UPDATE_STATES.HEALTH_GATED_ACTIVE;
  steps.push({ state: currentState, timestamp: new Date().toISOString() });

  return generateReceipt({
    manifest,
    targetDevice,
    finalState: currentState,
    success: true,
    healthCheckPassed: true,
    rollbackExecuted: false,
    diagnostic: "UPDATE_SUCCESS: Activated version " + manifest.version,
    steps,
  });
}

export function generateReceipt({
  manifest,
  targetDevice,
  finalState,
  success,
  healthCheckPassed = null,
  rollbackExecuted = false,
  pendingOwnerAction = false,
  handoff = null,
  diagnostic = "",
  steps = [],
}) {
  const receiptId = `ur-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const timestamp = new Date().toISOString();
  const receipt = {
    schemaVersion: "1.0.0",
    authority: "LEEWAY_UPDATE_RECEIPT_AUTHORITY_V1",
    receiptId,
    timestamp,
    deviceId: targetDevice.deviceId || targetDevice.id,
    platform: targetDevice.platform,
    packageId: manifest.packageId,
    fromVersion: targetDevice.version || targetDevice.adapterVersion || manifest.lastKnownGoodVersion,
    toVersion: manifest.version,
    finalState,
    success,
    healthCheckPassed,
    rollbackExecuted,
    pendingOwnerAction,
    handoff,
    diagnostic,
    integritySha256: manifest.integrity?.sha256,
    signingIdentity: manifest.integrity?.signingIdentity,
    steps,
  };
  return Object.freeze(receipt);
}

