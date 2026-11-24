import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const project = readFileSync("apps/apple/project.yml", "utf8");
const packageSchema = JSON.parse(readFileSync("contracts/apple-native-package.schema.json", "utf8"));
const packageTemplate = JSON.parse(readFileSync("apps/apple/AppleNativePackageManifest.json", "utf8"));
const qualification = readFileSync(".github/workflows/apple-device-bridge-qualification.yml", "utf8");
const publish = readFileSync(".github/workflows/apple-github-iloader-channel.yml", "utf8");
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

test("Apple unsigned developer package remains in historical source but cannot re-publish a public customer install", () => {
  assert.match(publish, /workflow_run:/);
  assert.match(publish, /UNSIGNED_APPLE_PUBLICATION_HOLD/);
  assert.match(publish, /if: false/);
  assert.match(publish, /UNSIGNED_ARTIFACT_NOT_APPROVED_FOR_PUBLIC_INSTALL/);
  assert.match(publish, /"downloadUrl": None/);
  assert.match(publish, /apple-latest/);
  assert.match(publish, /iLoader signing and USB installation/);
  assert.match(publish, /LeeWayDeviceBridge-unsigned\.ipa/);
  assert.match(publish, /LEEWAY-APPLE-PACKAGE-MANIFEST\.json/);
  assert.doesNotMatch(publish, /sidestore-source\.json/);
  assert.match(pwa, /Return to secure Apple setup/);
  assert.match(pwa, /id="dbAppleHomeInstall"/);
  assert.doesNotMatch(pwa, /OPEN APPLE PACKAGE/);
  assert.match(pwa, /Direct iLoader update/);
  assert.doesNotMatch(pwa, /sidestore:\/\/source\?url=/);
  assert.doesNotMatch(pwa, /releases\/tag\/apple-latest/);
});

