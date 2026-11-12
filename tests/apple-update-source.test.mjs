import fs from "node:fs";
import assert from "node:assert/strict";

const coordinator = fs.readFileSync("apps/apple/Sources/AppleUpdateCoordinator.swift", "utf8");
const view = fs.readFileSync("apps/apple/Sources/AppleDeviceBridgeView.swift", "utf8");
const workflow = fs.readFileSync(".github/workflows/apple-github-iloader-channel.yml", "utf8");

assert.match(coordinator, /package-manifest\.json/);
assert.match(coordinator, /versionCode/);
assert.match(coordinator, /UPDATE_AVAILABLE/);
assert.match(coordinator, /latestIPAURL/);
assert.match(coordinator, /APPLE-DIRECT-ILOADER-DELIVERY/);
assert.doesNotMatch(coordinator, /sidestore:\/\/source/);
assert.doesNotMatch(coordinator, /sidestore-source\.json/);
assert.match(coordinator, /iLoaderGuideURL/);
assert.match(coordinator, /manifestURL/);
assert.match(coordinator, /releaseURL/);
assert.doesNotMatch(view, /Open SideStore/);
assert.match(workflow, /docs\/package-manifest\.json/);
assert.match(workflow, /Publish unified GitHub Pages update manifest/);
assert.match(workflow, /ipaSha256/);

console.log("PASS Apple GitHub owner-confirmed update source contract");
