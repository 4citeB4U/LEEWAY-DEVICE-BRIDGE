import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const project = readFileSync("apps/apple/project.yml", "utf8");
const packageSchema = JSON.parse(readFileSync("contracts/apple-native-package.schema.json", "utf8"));
const packageTemplate = JSON.parse(readFileSync("apps/apple/AppleNativePackageManifest.json", "utf8"));
const qualification = readFileSync(".github/workflows/apple-device-bridge-qualification.yml", "utf8");
const publish = readFileSync(".github/workflows/apple-sidestore-channel.yml", "utf8");
const pwa = readFileSync("docs/index.html", "utf8");

test("Apple package carries an update-compatible bundle version and build", () => {
  assert.match(project, /INFOPLIST_KEY_CFBundleShortVersionString/);
  assert.match(project, /INFOPLIST_KEY_CFBundleVersion/);
  assert.deepEqual(packageSchema.properties.artifact.required, ["format", "fileName", "sha256", "version", "build", "signingState"]);
  assert.equal(packageTemplate.artifact.version, null);
  assert.equal(packageTemplate.artifact.build, null);
  assert.match(qualification, /MARKETING_VERSION="0\.1\.\$\{GITHUB_RUN_NUMBER\}"/);
  assert.match(qualification, /CFBundleShortVersionString/);
});

test("GitHub publishes a stable SideStore source after a qualified main build", () => {
  assert.match(publish, /workflow_run:/);
  assert.match(publish, /head_branch == 'main'/);
  assert.match(publish, /apple-latest/);
  assert.match(publish, /sidestore-source\.json/);
  assert.match(publish, /bundleIdentifier/);
  assert.match(publish, /versions/);
  assert.match(pwa, /sidestore:\/\/source\?url=/);
  assert.match(pwa, /releases\/tag\/apple-latest/);
});
