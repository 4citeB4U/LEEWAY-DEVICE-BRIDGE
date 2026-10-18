import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

test("Apple native package template preserves native and governance boundaries", () => {
  const schema = readJson("contracts/apple-native-package.schema.json");
  const manifest = readJson("apps/apple/AppleNativePackageManifest.json");

  assert.equal(schema.properties.schemaVersion.const, "1.0.0");
  assert.equal(manifest.adapterId, "leeway.operator.ios");
  assert.equal(manifest.components.deviceBridge, "INCLUDED");
  assert.equal(manifest.components.nativeMetalService, "INCLUDED");
  assert.equal(manifest.components.agentLeeRuntime, "RUNTIME_NOT_INSTALLED");
  assert.equal(manifest.components.formula, "EXTERNAL_AUTHORITY_REQUIRED");
  assert.equal(manifest.components.veritas, "EXTERNAL_AUTHORITY_REQUIRED");
  assert.equal(manifest.components.receipt, "EXTERNAL_AUTHORITY_REQUIRED");
  assert.deepEqual(manifest.artifact, {
    format: "ipa",
    fileName: null,
    sha256: null,
    signingState: "UNSIGNED_OWNER_CONTROLLED_SIGNING_REQUIRED"
  });
});

test("Apple qualification artifact carries the generated package manifest", () => {
  const workflow = readFileSync(".github/workflows/apple-device-bridge-qualification.yml", "utf8");
  assert.match(workflow, /AppleNativePackageManifest\.json/);
  assert.match(workflow, /LEEWAY-APPLE-PACKAGE-MANIFEST\.json/);
  assert.match(workflow, /shasum -a 256/);
  assert.match(workflow, /Payload\/LeeWayDeviceBridge\.app/);
});
