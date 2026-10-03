import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../apps/android/app/src/main/java/industries/leeway/devicebridge/LocalBridgeServer.kt", import.meta.url),
  "utf8"
);

test("maps Agent Skills device routes into existing canonical Android authorities", () => {
  for (const route of [
    "device.list",
    "device.capabilities",
    "device.screen.observe",
    "device.app.open",
    "device.ui.control"
  ]) assert.match(source, new RegExp('"' + route.replaceAll(".", "\\.") + '"'));

  assert.match(source, /RemoteCommandRouter\.execute/);
  assert.match(source, /DeviceOperatorAccessibilityService\.snapshot/);
  assert.match(source, /ReceiptStore\.record/);
  assert.match(source, /postcondition_verified/);
  assert.match(source, /verifyPostcondition/);
});

test("fails closed on unsupported file and UI routes", () => {
  assert.match(source, /CAPABILITY_NOT_IMPLEMENTED_BY_CURRENT_CANONICAL_ANDROID_ROUTER/);
  assert.match(source, /UI_ACTION_NOT_YET_MAPPED_TO_EXISTING_ANDROID_ROUTER/);
  assert.match(source, /TARGET_NOT_RESOLVED/);
});
