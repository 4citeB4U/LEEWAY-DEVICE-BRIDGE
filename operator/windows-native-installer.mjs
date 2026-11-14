/*
REGION: LeeWay Device Bridge Windows native installer
TAG: LEEWAY.WINDOWS.NATIVE.INSTALLER.V1
WHAT: Inspect and, when explicitly approved, install a locally staged MSIX/AppX package.
WHY: A portable Windows install must verify the exact artifact before the OS installer receives it.
HOW: Validate path, extension, digest and Authenticode signature before an owner-approved AppX handoff.
*/
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { execFile as execFileCallback } from "node:child_process";

const execFile = promisify(execFileCallback);
const APPX_EXTENSIONS = new Set([".appx", ".appxbundle", ".msix", ".msixbundle"]);

function normalizedSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value)
    ? value.toLowerCase()
    : null;
}

function normalizedThumbprint(value) {
  const normalized = typeof value === "string" ? value.replace(/\s/g, "").toUpperCase() : "";
  return /^[A-F0-9]{40}$/.test(normalized) ? normalized : null;
}

function extensionFor(installerPath) {
  return path.extname(installerPath ?? "").toLowerCase();
}

function quotedPowerShellLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function encodedPowerShellCommand(script) {
  return Buffer.from(script, "utf16le").toString("base64");
}

async function defaultSignatureInspector(installerPath) {
  const script = [
    `$signature = Get-AuthenticodeSignature -LiteralPath ${quotedPowerShellLiteral(installerPath)}`,
    "[pscustomobject]@{ status = [string]$signature.Status; thumbprint = [string]$signature.SignerCertificate.Thumbprint } | ConvertTo-Json -Compress"
  ].join("; ");
  const { stdout } = await execFile("powershell.exe", [
    "-NoProfile", "-NonInteractive", "-EncodedCommand", encodedPowerShellCommand(script)
  ], { windowsHide: true, timeout: 30_000 });
  const value = JSON.parse(stdout);
  return { status: String(value.status ?? "UNKNOWN"), thumbprint: value.thumbprint ?? null };
}

/**
 * This is a preflight, not a release decision. Its PASS means only that the
 * supplied local bytes and Windows signature observation agree with the caller's
 * declared release descriptor.
 */
export async function inspectWindowsPackage({ installerPath, expectedSha256, signerThumbprint } = {}, {
  readFile = fs.readFile,
  stat = fs.stat,
  signatureInspector = defaultSignatureInspector
} = {}) {
  if (typeof installerPath !== "string" || !path.isAbsolute(installerPath)) {
    return { state: "INSTALLER_PATH_INVALID", ready: false };
  }
  if (!APPX_EXTENSIONS.has(extensionFor(installerPath))) {
    return { state: "WINDOWS_PACKAGE_TYPE_UNSUPPORTED", ready: false, allowedExtensions: [...APPX_EXTENSIONS] };
  }
  const expected = normalizedSha256(expectedSha256);
  const requiredThumbprint = normalizedThumbprint(signerThumbprint);
  if (!expected || !requiredThumbprint) {
    return { state: "WINDOWS_RELEASE_DESCRIPTOR_INCOMPLETE", ready: false };
  }
  let bytes;
  try {
    const file = await stat(installerPath);
    if (!file.isFile()) return { state: "INSTALLER_NOT_A_FILE", ready: false };
    bytes = await readFile(installerPath);
  } catch {
    return { state: "INSTALLER_NOT_FOUND", ready: false };
  }
  const actualSha256 = createHash("sha256").update(bytes).digest("hex");
  if (actualSha256 !== expected) {
    return { state: "PACKAGE_HASH_MISMATCH", ready: false, actualSha256 };
  }
  let signature;
  try {
    signature = await signatureInspector(installerPath);
  } catch {
    return { state: "AUTHENTICODE_INSPECTION_FAILED", ready: false };
  }
  if (signature?.status !== "Valid") {
    return { state: "AUTHENTICODE_SIGNATURE_INVALID", ready: false, signatureStatus: signature?.status ?? "UNKNOWN" };
  }
  const observedThumbprint = normalizedThumbprint(signature.thumbprint);
  if (observedThumbprint !== requiredThumbprint) {
    return { state: "AUTHENTICODE_SIGNER_MISMATCH", ready: false, observedThumbprint };
  }
  return {
    state: "WINDOWS_PACKAGE_READY_FOR_OWNER_APPROVAL",
    ready: true,
    installerPath,
    packageExtension: extensionFor(installerPath),
    sha256: actualSha256,
    signerThumbprint: observedThumbprint
  };
}

/**
 * Hands a preflighted package to Windows. It never downloads, uninstalls,
 * disables OS protections, elevates, or reports an installation as verified.
 */
export async function executeWindowsPackageInstallation({ inspection, ownerApproved = false } = {}, {
  powershellRunner = async (args) => execFile("powershell.exe", args, { windowsHide: false, timeout: 120_000 })
} = {}) {
  if (!inspection?.ready || inspection.state !== "WINDOWS_PACKAGE_READY_FOR_OWNER_APPROVAL") {
    return { state: "WINDOWS_PACKAGE_NOT_READY", executed: false };
  }
  if (ownerApproved !== true) {
    return { state: "OWNER_AUTHORIZATION_REQUIRED", executed: false };
  }
  try {
    const script = `Add-AppxPackage -LiteralPath ${quotedPowerShellLiteral(inspection.installerPath)} -ErrorAction Stop`;
    await powershellRunner([
      "-NoProfile", "-NonInteractive", "-EncodedCommand", encodedPowerShellCommand(script)
    ]);
    return {
      state: "WINDOWS_INSTALL_EXECUTED_PENDING_VERIFICATION",
      executed: true,
      sha256: inspection.sha256,
      signerThumbprint: inspection.signerThumbprint
    };
  } catch (error) {
    return { state: "WINDOWS_INSTALL_EXECUTION_FAILED", executed: false, error: String(error?.message ?? error) };
  }
}

/**
 * Observes the package identity Windows reports after an install handoff. This
 * does not establish Bridge connectivity, grants, or production qualification.
 */
export async function verifyWindowsPackageInstallation({ packageFamilyName, expectedVersion, expectedPublisherId } = {}, {
  powershellRunner = async (args) => execFile("powershell.exe", args, { windowsHide: true, timeout: 30_000 })
} = {}) {
  if (typeof packageFamilyName !== "string" || !/^[A-Za-z0-9._-]{3,256}$/.test(packageFamilyName)) {
    return { state: "WINDOWS_PACKAGE_FAMILY_INVALID", verified: false };
  }
  if (typeof expectedVersion !== "string" || !/^[0-9]+(?:\.[0-9]+){1,3}$/.test(expectedVersion) ||
      typeof expectedPublisherId !== "string" || !/^[A-Za-z0-9]{8,64}$/.test(expectedPublisherId)) {
    return { state: "WINDOWS_PACKAGE_IDENTITY_INCOMPLETE", verified: false };
  }
  const script = [
    `$package = Get-AppxPackage -PackageFamilyName ${quotedPowerShellLiteral(packageFamilyName)} -ErrorAction SilentlyContinue`,
    "if ($null -ne $package) { [pscustomobject]@{ packageFamilyName = [string]$package.PackageFamilyName; version = [string]$package.Version; publisherId = [string]$package.PublisherId; packageFullName = [string]$package.PackageFullName } | ConvertTo-Json -Compress }"
  ].join("; ");
  let stdout;
  try {
    ({ stdout } = await powershellRunner([
      "-NoProfile", "-NonInteractive", "-EncodedCommand", encodedPowerShellCommand(script)
    ]));
  } catch {
    return { state: "WINDOWS_POSTINSTALL_OBSERVATION_FAILED", verified: false };
  }
  if (!stdout?.trim()) return { state: "WINDOWS_PACKAGE_NOT_INSTALLED", verified: false };
  let observed;
  try {
    observed = JSON.parse(stdout);
  } catch {
    return { state: "WINDOWS_POSTINSTALL_OBSERVATION_INVALID", verified: false };
  }
  if (observed.packageFamilyName !== packageFamilyName) {
    return { state: "WINDOWS_PACKAGE_FAMILY_MISMATCH", verified: false, observed };
  }
  if (observed.version !== expectedVersion) {
    return { state: "WINDOWS_PACKAGE_VERSION_MISMATCH", verified: false, observed };
  }
  if (observed.publisherId !== expectedPublisherId) {
    return { state: "WINDOWS_PACKAGE_PUBLISHER_MISMATCH", verified: false, observed };
  }
  return { state: "WINDOWS_PACKAGE_INSTALLED_OBSERVED", verified: true, observed };
}
