import fs from "node:fs";
import assert from "node:assert/strict";

const coordinator = fs.readFileSync("apps/apple/Sources/AppleUpdateCoordinator.swift", "utf8");
const view = fs.readFileSync("apps/apple/Sources/AppleDeviceBridgeView.swift", "utf8");
const workflow = fs.readFileSync(".github/workflows/apple-github-iloader-channel.yml", "utf8");

assert.match(coordinator, /package-manifest\.json/);
assert.match(coordinator, /versionCode/);
assert.match(coordinator, /UPDATE_AVAILABLE/);
assert.match(coordinator, /latestIPAURL/);
assert.match(coordinator, /SIGNED_CUSTOMER_RELEASE_APPROVED/);
assert.match(coordinator, /customerInstallApproved/);
assert.match(coordinator, /releaseSigning/);
assert.match(coordinator, /deviceBridgeSetupURL/);
assert.match(coordinator, /APPLE-DIRECT-ILOADER-DELIVERY/);
assert.doesNotMatch(coordinator, /sidestore:\/\/source/);
assert.doesNotMatch(coordinator, /sidestore-source\.json/);
assert.match(view, /Apple companion qualification and updates/);
assert.match(view, /Check for an approved signed Apple Bridge update/);
assert.match(view, /Open LeeWay Device Bridge setup/);
assert.match(view, /Developer-only unsigned IPA workflow/);
assert.match(view, /Open unsigned developer package source/);
assert.match(view, /Read developer iLoader delivery instructions/);
assert.match(view, /original Runtime\/Zitadel|original Runtime/);
assert.doesNotMatch(view, /Open SideStore/);
assert.match(workflow, /docs\/package-manifest\.json/);
assert.match(workflow, /Publish unified GitHub Pages update manifest/);
assert.match(workflow, /ipaSha256/);

console.log("PASS Apple Device Bridge setup and signed customer release gate; developer iLoader optional");
