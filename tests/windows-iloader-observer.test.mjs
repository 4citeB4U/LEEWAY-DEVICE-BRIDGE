import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { observeWindowsIloader } from "../operator/windows-iloader-observer.mjs";
import { planInstallation } from "../operator/installation-adapter.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "leeway-iloader-"));
fs.writeFileSync(path.join(root, "preferences.json"), JSON.stringify({ newAnisetteServer: "redacted" }));
fs.writeFileSync(path.join(root, "data.json"), JSON.stringify({ account: "redacted" }));
const runner = () => JSON.stringify({ appleMobileDeviceServiceRunning: true, appleUsbPresent: true, iLoaderRunning: true });
const observed = observeWindowsIloader({ appDataRoot: root, commandRunner: runner, hostPlatform: "win32" });

assert.equal(observed.state, "WINDOWS_ILOADER_OBSERVED");
assert.equal(observed.observation.selectedServerStored, false);
assert.equal(observed.observation.selectedServerObservationState, "NOT_OBSERVED");
assert.equal(observed.observation.accountRecordStored, false);
assert.equal(observed.observation.accountRecordObservationState, "NOT_OBSERVED");
assert.equal(observed.observation.credentialStoreState, "NOT_INSPECTED");
assert.equal(observed.observation.localStatePresent, true);
assert.equal(JSON.stringify(observed).includes("redacted"), false);
const packageDescriptor = { type: "ipa", expectedSha256: "b".repeat(64), actualSha256: "b".repeat(64) };
assert.equal(planInstallation({ target: observed.installationTarget, package: packageDescriptor }).state, "TRANSPORT_NOT_READY");
assert.equal(observeWindowsIloader({ hostPlatform: "linux" }).state, "WINDOWS_HOST_REQUIRED");
fs.rmSync(root, { recursive: true, force: true });
console.log("PASS Windows iLoader observer privacy and planning contract");
