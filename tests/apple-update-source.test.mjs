import fs from "node:fs";
import assert from "node:assert/strict";

const coordinator = fs.readFileSync("apps/apple/Sources/AppleUpdateCoordinator.swift", "utf8");
const view = fs.readFileSync("apps/apple/Sources/AppleDeviceBridgeView.swift", "utf8");
const workflow = fs.readFileSync(".github/workflows/apple-sidestore-channel.yml", "utf8");

assert.match(coordinator, /package-manifest\.json/);
assert.match(coordinator, /versionCode/);
assert.match(coordinator, /UPDATE_AVAILABLE/);
assert.match(coordinator, /sidestore:\/\/source/);
assert.match(coordinator, /sidestore-source\.json/);
assert.match(view, /GitHub update channel/);
assert.match(view, /Check GitHub for Updates/);
assert.match(view, /Open SideStore Update Channel/);
assert.match(view, /iOS cannot replace its own signed app/);
assert.match(workflow, /docs\/package-manifest\.json/);
assert.match(workflow, /Publish unified GitHub Pages update manifest/);
assert.match(workflow, /ipaSha256/);

console.log("PASS Apple GitHub owner-confirmed update source contract");
