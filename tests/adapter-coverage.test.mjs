import fs from "node:fs";
import assert from "node:assert/strict";

const coverage = JSON.parse(fs.readFileSync("docs/adapter-coverage.json", "utf8"));
const expected = [
  "android.adapter","windows.adapter","linux.adapter","bluetooth.adapter","wifi-lan.adapter",
  "matter.adapter","mqtt.adapter","tesla.adapter","camera.adapter","drone.adapter",
  "robot.adapter","appliance.adapter","desktop-commander.adapter"
];

assert.deepEqual(coverage.targetTree, expected);
for (const id of expected) {
  assert.ok(coverage.coverage[id], "missing coverage entry: " + id);
  assert.ok(fs.existsSync(coverage.coverage[id].path), "missing adapter source: " + id);
  assert.ok(coverage.coverage[id].state);
}
assert.match(coverage.hardRule, /does not promote native or physical verification state/);

console.log("PASS exact Device Bridge adapter coverage source contract");
