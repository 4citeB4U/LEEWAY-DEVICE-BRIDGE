import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const catalog = readFileSync("apps/apple/Sources/AppleCapabilityCatalog.swift", "utf8");
const handoff = readFileSync("apps/apple/Sources/AppleSystemHandoff.swift", "utf8");
const intents = readFileSync("apps/apple/Sources/LeeWayDeviceBridgeAppIntents.swift", "utf8");
const view = readFileSync("apps/apple/Sources/AppleDeviceBridgeView.swift", "utf8");

test("Apple capability source keeps iPhone control boundaries explicit", () => {
  assert.match(catalog, /device\.gpu\.metal\.probe/);
  assert.match(catalog, /device\.ui\.pointer\.cross-app/);
  assert.match(catalog, /UNAVAILABLE_BY_PLATFORM/);
  assert.match(catalog, /PLANNED_NATIVE_ADAPTER/);
});

test("Apple source exposes owner-visible phone and mail handoffs", () => {
  assert.match(handoff, /tel:/);
  assert.match(handoff, /mailto/);
  assert.match(view, /Hand off to Phone/);
  assert.match(view, /Hand off to Mail/);
  assert.match(view, /Complete or cancel the call in Apple’s Phone interface/);
});

test("Apple source exposes the Metal probe through an App Intent", () => {
  assert.match(intents, /import AppIntents/);
  assert.match(intents, /RunLeeWayMetalProbeIntent/);
  assert.match(intents, /AppShortcutsProvider/);
  assert.match(intents, /MetalDeviceProbe\.run/);
  assert.match(intents, /External verification remains separate/);
});
