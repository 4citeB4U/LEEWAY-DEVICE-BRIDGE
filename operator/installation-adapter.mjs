/*
REGION: LeeWay Device Bridge installation adapter
TAG: LEEWAY-INSTALLATION-ADAPTER
WHAT: Deterministic, read-only selection and preflight for an authorized package installer.
WHY: Route a package only through observed platform capabilities without inventing installer authority.
HOW: Probe -> classify -> plan. Execution, verification, and rollback remain explicitly unavailable here.
*/
import { adapterForPlatform, loadAdapterRegistry } from "./device-operator.mjs";

const APPLE_PLATFORMS = new Set(["ios", "ipados"]);
const DESKTOP_PLATFORMS = new Set(["windows", "macos", "linux"]);
const PACKAGE_TYPES = {
  android: "apk",
  ios: "ipa",
  ipados: "ipa",
  windows: "msix-or-exe",
  macos: "dmg-or-pkg",
  linux: "native-package"
};

const APPROVAL_REQUIRED = Object.freeze({
  state: "OWNER_AUTHORIZATION_REQUIRED",
  executable: false,
  requiresExplicitApproval: true
});

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function boolean(value) {
  return value === true;
}

function sha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value) ? value.toLowerCase() : null;
}

function routeId(platform) {
  if (APPLE_PLATFORMS.has(platform)) return "APPLE_ILOADER_USB";
  if (platform === "android") return "ANDROID_PACKAGE_INSTALLER_HANDOFF";
  if (platform === "windows") return "WINDOWS_NATIVE_INSTALLER";
  if (platform === "macos") return "MACOS_NATIVE_INSTALLER";
  if (platform === "linux") return "LINUX_NATIVE_PACKAGE_MANAGER";
  return null;
}

function expectedProvider(platform) {
  if (APPLE_PLATFORMS.has(platform)) return "iloader";
  if (platform === "android") return "android-package-installer";
  if (DESKTOP_PLATFORMS.has(platform)) return `${platform}-native-installer`;
  return null;
}

function providerFor(target, platform) {
  const expected = expectedProvider(platform);
  const providers = Array.isArray(target?.installerProviders) ? target.installerProviders : [];
  return providers.find((provider) => provider?.id === expected) ?? null;
}

function packageFinding(platform, packageDescriptor) {
  if (!packageDescriptor || typeof packageDescriptor !== "object") {
    return { state: "PACKAGE_DESCRIPTOR_MISSING", ready: false };
  }
  if (packageDescriptor.type !== PACKAGE_TYPES[platform]) {
    return { state: "PACKAGE_TYPE_UNSUPPORTED", ready: false, expectedType: PACKAGE_TYPES[platform] };
  }
  const expectedSha256 = sha256(packageDescriptor.expectedSha256);
  const actualSha256 = sha256(packageDescriptor.actualSha256);
  if (!expectedSha256 || !actualSha256 || expectedSha256 !== actualSha256) {
    return { state: "PACKAGE_HASH_MISMATCH", ready: false };
  }
  return { state: "PACKAGE_INTEGRITY_READY", ready: true, sha256: actualSha256 };
}

/**
 * Classifies a supplied Apple observation. It is intentionally read-only and
 * accepts only explicit observation values; missing values remain missing.
 */
export function classifyApplePreflight({ package: packageDescriptor, target = {} } = {}) {
  const integrity = packageFinding(target.platform ?? "ios", packageDescriptor);
  if (!integrity.ready) return { state: integrity.state, ready: false };
  const provider = providerFor(target, target.platform ?? "ios");
  if (!boolean(target.transport?.ready)) return { state: "TRANSPORT_NOT_READY", ready: false };
  if (!provider || provider.health !== "HEALTHY") return { state: "ANISETTE_PROVIDER_UNAVAILABLE", ready: false };
  if (!boolean(provider.accountAuthorized)) return { state: "APPLE_ACCOUNT_AUTH_FAILED", ready: false };
  if (!boolean(provider.signingIdentityPresent)) return { state: "SIGNING_IDENTITY_MISSING", ready: false };
  if (provider.certificateState === "EXPIRED") return { state: "CERT_EXPIRED", ready: false };
  if (!boolean(provider.profileMatchesBundle)) return { state: "PROFILE_MISMATCH", ready: false };
  if (!boolean(provider.deviceInProfile)) return { state: "DEVICE_NOT_IN_PROFILE", ready: false };
  if (!boolean(provider.entitlementsCompatible)) return { state: "ENTITLEMENT_MISMATCH", ready: false };
  return { state: "READY_TO_INSTALL", ready: true, route: "APPLE_ILOADER_USB", sha256: integrity.sha256 };
}

/**
 * Returns a dry-run plan from observed capabilities. It never starts an
 * installer and never reads credentials, keychains, pairing files, or devices.
 */
export function planInstallation({ target = {}, package: packageDescriptor, ownerApproved = false } = {}, registry = loadAdapterRegistry()) {
  const platform = text(target.platform)?.toLowerCase() ?? "unknown";
  let adapter;
  try {
    adapter = adapterForPlatform(platform, registry);
  } catch {
    return { state: "UNSUPPORTED_TARGET", executable: false, reason: "PLATFORM_ADAPTER_NOT_REGISTERED" };
  }

  const integrity = packageFinding(platform, packageDescriptor);
  if (!integrity.ready) return { ...integrity, executable: false, adapterId: adapter.adapterId };
  if (!boolean(target.transport?.ready)) {
    return { state: "TRANSPORT_NOT_READY", executable: false, adapterId: adapter.adapterId };
  }

  const provider = providerFor(target, platform);
  if (!provider || provider.health !== "HEALTHY" || !boolean(provider.authorized)) {
    return { state: "INSTALLER_PROVIDER_UNAVAILABLE", executable: false, adapterId: adapter.adapterId };
  }

  if (APPLE_PLATFORMS.has(platform)) {
    const apple = classifyApplePreflight({ package: packageDescriptor, target });
    if (!apple.ready) return { ...apple, executable: false, adapterId: adapter.adapterId };
  }

  if (!ownerApproved) return { ...APPROVAL_REQUIRED, adapterId: adapter.adapterId, route: routeId(platform), sha256: integrity.sha256 };
  return {
    state: "DRY_RUN_READY",
    executable: false,
    route: routeId(platform),
    adapterId: adapter.adapterId,
    packageType: packageDescriptor.type,
    sha256: integrity.sha256,
    providerId: provider.id,
    nextStep: "Obtain an implementation-specific, owner-approved execution adapter and verify the installed package afterwards."
  };
}

export function probeInstallationTarget(target = {}, registry = loadAdapterRegistry()) {
  const platform = text(target.platform)?.toLowerCase() ?? "unknown";
  try {
    const adapter = adapterForPlatform(platform, registry);
    const provider = providerFor(target, platform);
    return {
      state: provider ? "INSTALLER_PROVIDER_OBSERVED" : "INSTALLER_PROVIDER_NOT_OBSERVED",
      platform,
      adapterId: adapter.adapterId,
      expectedPackageType: PACKAGE_TYPES[platform],
      expectedProviderId: expectedProvider(platform),
      transportReady: boolean(target.transport?.ready),
      providerHealth: provider?.health ?? "UNKNOWN"
    };
  } catch {
    return { state: "UNSUPPORTED_TARGET", platform, expectedPackageType: null, expectedProviderId: null, transportReady: false };
  }
}

export function executeInstallation() {
  return {
    state: "EXECUTION_NOT_IMPLEMENTED",
    executed: false,
    reason: "The installation adapter is currently a read-only probe, classifier, and dry-run planner."
  };
}

export function verifyInstallation() {
  return { state: "VERIFICATION_NOT_IMPLEMENTED", verified: false };
}

export function rollbackInstallation() {
  return { state: "ROLLBACK_NOT_IMPLEMENTED", rolledBack: false };
}
