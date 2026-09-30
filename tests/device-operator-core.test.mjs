/*
REGION: LeeWay Device Operator tests
TAG: LEEWAY-DEVICE-OPERATOR-TEST
WHO: Veritas / CI
WHAT: Validate universal adapter coverage and command admission invariants.
WHEN: Every repository test run.
WHERE: 4citeB4U/LEEWAY-DEVICE-BRIDGE/tests
WHY: Prevent platform claims from outrunning implementation/authorization.
HOW: Node assertions against the portable operator kernel and registry.
LICENSE: MIT
*/
import assert from "node:assert/strict";
import { loadAdapterRegistry, adapterForPlatform, admitCommand } from "../operator/device-operator.mjs";

const registry = loadAdapterRegistry();
const required = ["android","ios","ipados","windows","macos","linux"];
for (const platform of required) {
  const adapter = adapterForPlatform(platform, registry);
  assert.equal(adapter.platform, platform);
  assert.ok(adapter.authorityBoundary.length > 20);
}

const iosControl = admitCommand({platform:"ios", capability:"device.ui.control", authorityTier:"OPERATE", humanConfirmed:true}, registry);
assert.equal(iosControl.admitted, false);
assert.equal(iosControl.reason, "CAPABILITY_NOT_AVAILABLE");

const androidRead = admitCommand({platform:"android", capability:"device.info", authorityTier:"READ"}, registry);
assert.equal(androidRead.admitted, true);

const androidInstallWithoutOwner = admitCommand({platform:"android", capability:"device.apps.install", authorityTier:"MUTATE"}, registry);
assert.equal(androidInstallWithoutOwner.admitted, false);
assert.equal(androidInstallWithoutOwner.reason, "HUMAN_CONFIRMATION_REQUIRED");

const androidInstallWithOwner = admitCommand({platform:"android", capability:"device.apps.install", authorityTier:"MUTATE", humanConfirmed:true}, registry);
assert.equal(androidInstallWithOwner.admitted, true);

console.log("PASS universal device operator core");
