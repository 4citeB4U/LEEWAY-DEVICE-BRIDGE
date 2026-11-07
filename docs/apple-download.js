/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.PUBLIC.APPLE_DISTRIBUTION
TAG: LEEWAY.DEVICE_BRIDGE.APPLE_RELEASE_DIRECT_DOWNLOAD
5WH:
WHAT = Bind Apple download controls to the published LeeWay native IPA instead of a GitHub project page.
WHY = Deliver the canonical Apple package directly while keeping signing and device execution honest.
WHO = LeeWay Device Bridge contributors under Creator and LeeWay Standards authority.
WHERE = docs/apple-download.js in the canonical Device Bridge repository.
WHEN = 2026-11-07.
HOW = Validate the existing publication manifest and expose its exact release asset with an explicit signing boundary.
LICENSE = MIT; no upstream iLoader code or branding is copied here.
*/
export const APPLE_IPA_URL = "https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/releases/download/apple-latest/LeeWayDeviceBridge-unsigned.ipa";
export const APPLE_IPA_FILENAME = "LeeWayDeviceBridge-unsigned.ipa";
const HEX_256 = /^[a-f0-9]{64}$/i;

export function qualifyAppleRelease(manifest) {
  if (manifest?.authority !== "4citeB4U/LEEWAY-DEVICE-BRIDGE" ||
      manifest?.distributionRole !== "GITHUB_PAGES_DISCOVERY_AND_DOWNLOAD" ||
      !Array.isArray(manifest?.packages)) {
    return {state: "MANIFEST_AUTHORITY_UNVERIFIED", usable: false};
  }
  const packages = manifest.packages.filter(item => item?.platform === "ios" && item?.id === "apple-native");
  if (packages.length !== 1) return {state: "APPLE_PACKAGE_IDENTITY_AMBIGUOUS", usable: false};
  const pkg = packages[0];
  const ci = pkg.githubActionsQualification;
  if (pkg.downloadUrl !== APPLE_IPA_URL ||
      pkg.source !== "github-release" ||
      pkg.status !== "QUALIFIED_ARTIFACT_OWNER_INSTALL_REQUIRED" ||
      pkg.nativeVerification !== true) {
    return {state: "APPLE_RELEASE_ROUTE_UNVERIFIED", usable: false};
  }
  if (!HEX_256.test(pkg.sha256 ?? "") ||
      ci?.state !== "VERIFIED" ||
      ci?.ipaSha256 !== pkg.sha256 ||
      !Number.isSafeInteger(pkg.sizeBytes) || pkg.sizeBytes <= 0 ||
      ci?.ipaSizeBytes !== pkg.sizeBytes ||
      !Number.isSafeInteger(ci?.runId) || ci.runId <= 0 ||
      !/^[a-f0-9]{40}$/i.test(ci?.sourceRevision ?? "") ||
      !Number.isSafeInteger(pkg.versionCode) || pkg.versionCode <= 0 ||
      typeof pkg.versionName !== "string" || !/^\d+\.\d+\.\d+$/.test(pkg.versionName)) {
    return {state: "APPLE_PACKAGE_PROVENANCE_UNVERIFIED", usable: false};
  }
  return {
    state: "PUBLISHED_UNSIGNED_IPA",
    usable: true,
    downloadUrl: APPLE_IPA_URL,
    fileName: APPLE_IPA_FILENAME,
    version: pkg.versionName,
    build: pkg.versionCode,
    sizeBytes: pkg.sizeBytes,
    sha256: pkg.sha256,
    sourceRevision: ci.sourceRevision,
    qualifyingRunId: ci.runId,
    signingRequired: true,
    nativeInstallVerified: false
  };
}

export function qualifyAppleStoreDistribution(manifest) {
  const packages = manifest?.authority === "4citeB4U/LEEWAY-DEVICE-BRIDGE"
    && Array.isArray(manifest?.packages)
    ? manifest.packages.filter(item => item?.platform === "ios" && item?.id === "apple-native") : [];
  if (packages.length !== 1) return {state:"APP_STORE_IDENTITY_UNVERIFIED", available:false};
  const record = packages[0].consumerDistribution;
  if (record?.state !== "PUBLISHED") return {state:"APP_STORE_NOT_PUBLISHED", available:false};
  const urlString = record.installUrl;
  let parsed;
  try { parsed = new URL(urlString); } catch { return {state:"APP_STORE_URL_INVALID", available:false}; }
  const match = /^\/(?:[a-z]{2}\/)?app\/[^/]+\/id([0-9]+)$/.exec(parsed.pathname);
  if (record.channel !== "APPLE_APP_STORE" ||
      record.bundleId !== "industries.leeway.devicebridge" ||
      typeof record.appStoreId !== "string" ||
      !/^[0-9]{7,16}$/.test(record.appStoreId) ||
      !match || match[1] !== record.appStoreId ||
      parsed.protocol !== "https:" || parsed.hostname !== "apps.apple.com" ||
      parsed.username || parsed.password || parsed.search || parsed.hash || parsed.port) {
    return {state:"APP_STORE_URL_INVALID", available:false};
  }
  return {state:"APP_STORE_PUBLISHED", available:true, installUrl:parsed.href};
}

const HOST_ARCHIVE_NAMES = {
  windows: "LeeWay-Apple-Installer-windows.zip",
  macos: "LeeWay-Apple-Installer-macos.tar.gz",
  linux: "LeeWay-Apple-Installer-linux.tar.gz"
};
export function qualifyLeeWayHostInstallers(manifest) {
  if (manifest?.authority !== "4citeB4U/LEEWAY-DEVICE-BRIDGE") {
    return {state:"HOST_INSTALLER_AUTHORITY_UNVERIFIED",available:false};
  }
  const source=manifest.appleInstallerDistribution;
  if (source?.state !== "PUBLISHED") {
    return {state:"HOST_INSTALLER_NOT_PUBLISHED",available:false};
  }
  if (source.role !== "FIRST_PARTY_HOST_SIDELOAD_INSTALLER" ||
      source.package !== "leeway-apple-native-installer" ||
      source.releaseTag !== "apple-installer-latest" ||
      !/^[0-9a-f]{40}$/i.test(source.sourceRevision ?? "") ||
      !Number.isSafeInteger(source.qualificationRunId) || source.qualificationRunId <= 0 ||
      source.requiresPaidDeveloperMembership !== false ||
      source.requiresAppleAccountAuthentication !== true ||
      source.requiresTrustedDevicePairing !== true) {
    return {state:"HOST_INSTALLER_PROVENANCE_UNVERIFIED",available:false};
  }
  const items=[];
  for (const [platform,archive] of Object.entries(HOST_ARCHIVE_NAMES)) {
    const pkg=source.assets?.[platform];
    if (!pkg || !/^[a-f0-9]{64}$/i.test(pkg.sha256 ?? "") ||
        !Number.isSafeInteger(pkg.sizeBytes) || pkg.sizeBytes <= 0) {
      return {state:"HOST_INSTALLER_ASSET_UNVERIFIED",available:false};
    }
    const expected = "https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/releases/download/apple-installer-latest/" + archive;
    if (pkg.url !== expected) return {state:"HOST_INSTALLER_URL_UNVERIFIED",available:false};
    items.push({platform,url:expected,archive,sizeBytes:pkg.sizeBytes,sha256:pkg.sha256});
  }
  return {state:"FIRST_PARTY_HOST_INSTALLERS_PUBLISHED",available:true,items};
}

export async function initializeAppleDownloads(fetchManifest = () => fetch("./package-manifest.json", {cache: "no-store"})) {
  if (typeof document === "undefined") return {state: "NO_BROWSER_DOCUMENT", usable: false};
  const links = [...document.querySelectorAll("[data-apple-ipa-download]")];
  const customerInstallRegions = [...document.querySelectorAll("[data-apple-customer-install]")];
  const showAppStore = distribution => {
    customerInstallRegions.forEach(node => {
      node.replaceChildren();
      if (distribution.available) {
        const link = document.createElement("a");
        link.href = distribution.installUrl;
        link.className = "action";
        link.textContent = "INSTALL OFFICIAL LEEWAY APP";
        link.rel = "noopener";
        node.appendChild(link);
      } else {
        node.textContent = "Public App Store release not yet published. The IPA below is for authorized developer installations only.";
      }
    });
  };
  const installerRegions = [...document.querySelectorAll("[data-apple-host-installers]")];
  const showHostInstallers = distribution => {
    installerRegions.forEach(node => {
      node.replaceChildren();
      if (!distribution.available) {
        node.textContent = "Native LeeWay installer binaries are awaiting release qualification. Existing iLoader installations remain supported.";
        return;
      }
      for (const item of distribution.items) {
        const link=document.createElement("a");
        link.href=item.url;
        link.download=item.archive;
        link.rel="noopener";
        link.className="action secondary";
        link.textContent="LEEWAY APPLE INSTALLER — " + item.platform.toUpperCase();
        node.appendChild(link);
      }
    });
  };
  const labels = [...document.querySelectorAll("[data-apple-package-status]")];
  const badge = document.querySelector("#applePackageVerifiedState");
  const updateState = (message, badgeText) => {
    labels.forEach(node => {node.textContent = message;});
    if (badge) badge.textContent = badgeText;
  };
  // The exact known release asset remains a useful no-JavaScript fallback.
  // Never assign an unvalidated URL from a mutable JSON manifest.
  links.forEach(node => {
    node.href = APPLE_IPA_URL;
    node.download = APPLE_IPA_FILENAME;
    node.removeAttribute("target");
  });
  try {
    const response = await fetchManifest();
    if (!response?.ok) throw new Error("MANIFEST_FETCH_FAILED");
    const manifest = await response.json();
    showAppStore(qualifyAppleStoreDistribution(manifest));
    showHostInstallers(qualifyLeeWayHostInstallers(manifest));
    const packageState = qualifyAppleRelease(manifest);
    if (!packageState.usable) {
      updateState("Apple package publication could not be validated here. Check the release manifest before installing.", "CHECK REQUIRED");
      return packageState;
    }
    updateState(
      "LeeWay iOS " + packageState.version + " (build " + packageState.build +
      ") · unsigned IPA · " + packageState.sizeBytes + " bytes · SHA-256 " + packageState.sha256 +
      ". Owner-controlled Apple signing and installation required; native Metal and model execution are separate tests.",
      "IPA PUBLISHED"
    );
    return packageState;
  } catch {
    showAppStore({available:false});
    showHostInstallers({available:false});
    updateState("Current Apple manifest unavailable. The link targets LeeWay's established release asset, but this session has not checked its current contents or signature.", "CHECK REQUIRED");
    return {state: "APPLE_MANIFEST_UNAVAILABLE", usable: false};
  }
}

if (typeof document !== "undefined") {
  void initializeAppleDownloads();
}
