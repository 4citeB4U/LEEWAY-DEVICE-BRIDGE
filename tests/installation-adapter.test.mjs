import assert from "node:assert/strict";
import {
  classifyApplePreflight,
  executeInstallation,
  planInstallation,
  probeInstallationTarget,
  rollbackInstallation,
  verifyInstallation
} from "../operator/installation-adapter.mjs";

const digest = "a".repeat(64);
const appleTarget = {
  platform: "ios",
  transport: { ready: true },
  installerProviders: [{
    id: "iloader", health: "HEALTHY", authorized: true,
    accountAuthorized: true, signingIdentityPresent: true, certificateState: "VALID",
    profileMatchesBundle: true, deviceInProfile: true, entitlementsCompatible: true
  }]
};
const ipa = { type: "ipa", expectedSha256: digest, actualSha256: digest };

assert.deepEqual(classifyApplePreflight({ target: appleTarget, package: ipa }).state, "READY_TO_INSTALL");
assert.equal(planInstallation({ target: appleTarget, package: ipa }).state, "OWNER_AUTHORIZATION_REQUIRED");
assert.equal(planInstallation({ target: appleTarget, package: ipa, ownerApproved: true }).state, "DRY_RUN_READY");

const profileMismatch = structuredClone(appleTarget);
profileMismatch.installerProviders[0].profileMatchesBundle = false;
assert.equal(classifyApplePreflight({ target: profileMismatch, package: ipa }).state, "PROFILE_MISMATCH");

const androidTarget = {
  platform: "android", transport: { ready: true },
  installerProviders: [{ id: "android-package-installer", health: "HEALTHY", authorized: true }]
};
const apk = { type: "apk", expectedSha256: digest, actualSha256: digest };
assert.equal(planInstallation({ target: androidTarget, package: apk }).state, "OWNER_AUTHORIZATION_REQUIRED");
assert.equal(planInstallation({ target: androidTarget, package: apk, ownerApproved: true }).route, "ANDROID_PACKAGE_INSTALLER_HANDOFF");

assert.equal(planInstallation({ target: { platform: "unknown" }, package: ipa }).state, "UNSUPPORTED_TARGET");
assert.equal(probeInstallationTarget(appleTarget).state, "INSTALLER_PROVIDER_OBSERVED");
assert.equal(executeInstallation().state, "EXECUTION_NOT_IMPLEMENTED");
assert.equal(verifyInstallation().verified, false);
assert.equal(rollbackInstallation().rolledBack, false);
console.log("PASS installation adapter dry-run contract");
