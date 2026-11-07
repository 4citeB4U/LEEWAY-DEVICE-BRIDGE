/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.INSTALLATION
TAG: LEEWAY-INSTALLATION-ADAPTER
5WH:
WHAT = Deterministic read-only installer selection and hash-bound Apple release handoff.
WHY = Prevent foreign packages and unverified signing from being passed to native installers.
WHO = LeeWay Device Bridge contributors under Creator and LeeWay Standards authority.
WHERE = operator/installation-adapter.mjs.
WHEN = Original implementation 2026-10-18; Apple release binding qualified in source 2026-11-07.
HOW = Probe, classify, verify canonical release identity, require owner approval, and plan; execution remains separate.
LICENSE = MIT; no upstream iLoader code is embedded.
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
  if (provider.accountAuthorized !== true) return { state: provider.accountAuthorized === false ? "APPLE_ACCOUNT_AUTH_FAILED" : "APPLE_ACCOUNT_AUTH_NOT_OBSERVED", ready: false };
  if (provider.signingIdentityPresent !== true) return { state: provider.signingIdentityPresent === false ? "SIGNING_IDENTITY_MISSING" : "SIGNING_IDENTITY_NOT_OBSERVED", ready: false };
  if (provider.certificateState === "EXPIRED") return { state: "CERT_EXPIRED", ready: false };
  if (provider.certificateState !== "VALID") return { state: "CERTIFICATE_NOT_OBSERVED", ready: false };
  if (provider.profileMatchesBundle !== true) return { state: provider.profileMatchesBundle === false ? "PROFILE_MISMATCH" : "PROFILE_NOT_OBSERVED", ready: false };
  if (provider.deviceInProfile !== true) return { state: provider.deviceInProfile === false ? "DEVICE_NOT_IN_PROFILE" : "DEVICE_PROFILE_MEMBERSHIP_NOT_OBSERVED", ready: false };
  if (provider.entitlementsCompatible !== true) return { state: provider.entitlementsCompatible === false ? "ENTITLEMENT_MISMATCH" : "ENTITLEMENTS_NOT_OBSERVED", ready: false };
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
  if (!provider || provider.health !== "HEALTHY") {
    return { state: "INSTALLER_PROVIDER_UNAVAILABLE", executable: false, adapterId: adapter.adapterId };
  }

  if (APPLE_PLATFORMS.has(platform)) {
    const apple = classifyApplePreflight({ package: packageDescriptor, target });
    if (!apple.ready) return { ...apple, executable: false, adapterId: adapter.adapterId };
  }
  if (!boolean(provider.authorized)) {
    return { state: "INSTALLER_PROVIDER_NOT_AUTHORIZED", executable: false, adapterId: adapter.adapterId };
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

const APPLE_RELEASE_ASSET = "https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/releases/download/apple-latest/LeeWayDeviceBridge-unsigned.ipa";

/**
 * Bind the existing iLoader preflight to the actual LeeWay-distributed IPA.
 * The caller must provide a SHA-256 measured from the downloaded file,
 * never one copied from the publication manifest as simulated readback.
 * This prepares a handoff; it does not execute a native signing operation.
 */
export function planPublishedAppleIpaHandoff({ manifest, measuredIpaSha256, target = {}, ownerApproved = false } = {}, registry = loadAdapterRegistry()) {
  if (target.platform !== "ios" && target.platform !== "ipados") {
    return { state: "APPLE_TARGET_REQUIRED", executable: false };
  }
  if (manifest?.authority !== "4citeB4U/LEEWAY-DEVICE-BRIDGE" ||
      manifest?.distributionRole !== "GITHUB_PAGES_DISCOVERY_AND_DOWNLOAD" ||
      !Array.isArray(manifest?.packages)) {
    return { state: "APPLE_RELEASE_AUTHORITY_UNVERIFIED", executable: false };
  }
  const matches = manifest.packages.filter(item => item?.platform === "ios" && item?.id === "apple-native");
  if (matches.length !== 1) {
    return { state: "APPLE_RELEASE_IDENTITY_AMBIGUOUS", executable: false };
  }
  const pkg = matches[0];
  const ci = pkg.githubActionsQualification;
  if (pkg.downloadUrl !== APPLE_RELEASE_ASSET ||
      pkg.source !== "github-release" ||
      pkg.status !== "QUALIFIED_ARTIFACT_OWNER_INSTALL_REQUIRED" ||
      !sha256(pkg.sha256) || !Number.isSafeInteger(pkg.sizeBytes) || pkg.sizeBytes <= 0 ||
      ci?.state !== "VERIFIED" || ci?.ipaSha256 !== pkg.sha256 ||
      ci?.ipaSizeBytes !== pkg.sizeBytes ||
      !/^[a-f0-9]{40}$/i.test(ci?.sourceRevision ?? "") ||
      !Number.isSafeInteger(ci?.runId) || ci.runId <= 0 ||
      !Number.isSafeInteger(pkg.versionCode) || pkg.versionCode <= 0) {
    return { state: "APPLE_RELEASE_PROVENANCE_UNVERIFIED", executable: false };
  }
  if (!sha256(measuredIpaSha256) || measuredIpaSha256.toLowerCase() !== pkg.sha256.toLowerCase()) {
    return { state: "PACKAGE_HASH_MISMATCH", executable: false };
  }
  const plan = planInstallation({
    target,
    package: {
      type: "ipa",
      expectedSha256: pkg.sha256,
      actualSha256: measuredIpaSha256
    },
    ownerApproved
  }, registry);
  if (plan.state !== "DRY_RUN_READY") return plan;
  return {
    ...plan,
    state: "APPLE_NATIVE_HANDOFF_PLANNED",
    executable: false,
    bundleIdentifier: "industries.leeway.devicebridge",
    downloadUrl: APPLE_RELEASE_ASSET,
    version: pkg.versionName,
    build: pkg.versionCode,
    signing: "OWNER_CONTROLLED_ILOADER",
    requiresNativeProvider: true,
    nativeInstallVerified: false
  };
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
