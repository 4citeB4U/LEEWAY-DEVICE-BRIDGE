import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { observeWindowsIloader } from "../operator/windows-iloader-observer.mjs";
import { classifyApplePreflight, planInstallation, executeInstallation } from "../operator/installation-adapter.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "leeway-trust-boundary-"));
try {
  fs.writeFileSync(path.join(root, "preferences.json"), JSON.stringify({ newAnisetteServer: "SENSITIVE_PLACEHOLDER" }));
  fs.writeFileSync(path.join(root, "data.json"), JSON.stringify({ account: "SENSITIVE_PLACEHOLDER" }));
  const ipa = { type: "ipa", expectedSha256: "a".repeat(64), actualSha256: "a".repeat(64) };
  for (const host of [
    { appleUsbPresent: true, iLoaderRunning: true, appleMobileDeviceServiceRunning: true },
    { appleUsbPresent: true, iLoaderRunning: false, appleMobileDeviceServiceRunning: false },
    { appleUsbPresent: false, iLoaderRunning: true, appleMobileDeviceServiceRunning: true }
  ]) {
    const observed = observeWindowsIloader({
      appDataRoot: root,
      hostPlatform: "win32",
      commandRunner: () => JSON.stringify(host)
    });
    assert.equal(observed.installationTarget.transport.ready, false);
    assert.equal(observed.installationTarget.installerProviders[0].health, "UNKNOWN");
    assert.equal(observed.installationTarget.installerProviders[0].authorized, false);
    assert.equal(observed.observation.selectedServerStored, null);
    assert.equal(observed.observation.accountRecordStored, null);
    assert.equal(observed.observation.selectedServerObservationState, "NOT_OBSERVED");
    assert.equal(observed.observation.accountRecordObservationState, "NOT_OBSERVED");
    assert.equal(classifyApplePreflight({ target: observed.installationTarget, package: ipa }).ready, false);
    const result = planInstallation({ target: observed.installationTarget, package: ipa, ownerApproved: true });
    assert.equal(result.state, "TRANSPORT_NOT_READY");
    assert.equal(result.executable, false);
    assert.equal(JSON.stringify(observed).includes("SENSITIVE_PLACEHOLDER"), false);
  }
  const synthetic = {
    platform: "ios",
    transport: { ready: true },
    installerProviders: [{
      id: "iloader", health: "HEALTHY", authorized: true,
      accountAuthorized: true, signingIdentityPresent: true, certificateState: "VALID",
      profileMatchesBundle: true, deviceInProfile: true, entitlementsCompatible: true
    }]
  };
  assert.equal(planInstallation({ target: synthetic, package: ipa, ownerApproved: true }).state, "DRY_RUN_READY");
  assert.equal(planInstallation({ target: synthetic, package: ipa, ownerApproved: true }).executable, false);
  assert.equal(executeInstallation().executed, false);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
console.log("PASS untrusted Windows observations cannot become signing or installation authority");
