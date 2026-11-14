import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  executeWindowsPackageInstallation,
  inspectWindowsPackage
} from "../operator/windows-native-installer.mjs";

const bytes = Buffer.from("signed-release-bytes");
const digest = createHash("sha256").update(bytes).digest("hex");
const thumbprint = "A".repeat(40);
const installerPath = "C:\\release\\LeeWayDeviceBridge.msix";
const dependencies = {
  async stat() { return { isFile: () => true }; },
  async readFile() { return bytes; },
  async signatureInspector() { return { status: "Valid", thumbprint }; }
};

const inspection = await inspectWindowsPackage({ installerPath, expectedSha256: digest, signerThumbprint: thumbprint }, dependencies);
assert.equal(inspection.state, "WINDOWS_PACKAGE_READY_FOR_OWNER_APPROVAL");
assert.equal(inspection.ready, true);
assert.equal((await inspectWindowsPackage({ installerPath: "relative.msix", expectedSha256: digest, signerThumbprint: thumbprint }, dependencies)).state, "INSTALLER_PATH_INVALID");
assert.equal((await inspectWindowsPackage({ installerPath: "C:\\release\\LeeWayDeviceBridge.exe", expectedSha256: digest, signerThumbprint: thumbprint }, dependencies)).state, "WINDOWS_PACKAGE_TYPE_UNSUPPORTED");
assert.equal((await inspectWindowsPackage({ installerPath, expectedSha256: "b".repeat(64), signerThumbprint: thumbprint }, dependencies)).state, "PACKAGE_HASH_MISMATCH");
assert.equal((await inspectWindowsPackage({ installerPath, expectedSha256: digest, signerThumbprint: "B".repeat(40) }, dependencies)).state, "AUTHENTICODE_SIGNER_MISMATCH");
assert.equal((await inspectWindowsPackage({ installerPath, expectedSha256: digest, signerThumbprint: thumbprint }, { ...dependencies, async signatureInspector() { return { status: "NotSigned", thumbprint }; } })).state, "AUTHENTICODE_SIGNATURE_INVALID");

assert.equal((await executeWindowsPackageInstallation({ inspection })).state, "OWNER_AUTHORIZATION_REQUIRED");
let received;
const installed = await executeWindowsPackageInstallation({ inspection, ownerApproved: true }, {
  async powershellRunner(args) { received = args; }
});
assert.equal(installed.state, "WINDOWS_INSTALL_EXECUTED_PENDING_VERIFICATION");
assert.equal(installed.executed, true);
assert.equal(received.at(-2), "-EncodedCommand");
assert.equal(Buffer.from(received.at(-1), "base64").toString("utf16le"), "Add-AppxPackage -LiteralPath 'C:\\release\\LeeWayDeviceBridge.msix' -ErrorAction Stop");
assert.equal((await executeWindowsPackageInstallation({ inspection: { ready: false }, ownerApproved: true })).state, "WINDOWS_PACKAGE_NOT_READY");
console.log("PASS Windows native installer gate");
