import fs from "node:fs";
import assert from "node:assert/strict";

const requiredContracts = [
  "contracts/device-command-envelope.schema.json",
  "contracts/device-lifecycle.schema.json",
  "contracts/actuation-policy.schema.json",
  "contracts/readback-policy.schema.json",
  "contracts/fail-safe-policy.schema.json",
  "contracts/calibration-policy.schema.json",
  "contracts/provider-qualification.schema.json",
  "contracts/promotion-policy.schema.json"
];

for (const file of requiredContracts) {
  const value = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(value.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.ok(value.$id);
  assert.ok(value.title);
}

const lifecycle = fs.readFileSync("policies/DEVICE-CAPABILITY-LIFECYCLE.md", "utf8");
assert.match(lifecycle, /Discovery SHALL NOT:/);
assert.match(lifecycle, /CALIBRATED TIMEOUT/i);
assert.match(lifecycle, /API success, socket write, MQTT PUBACK/i);
assert.match(lifecycle, /PROPOSED[\s\S]*SOURCE_IMPLEMENTED[\s\S]*SOURCE_QUALIFIED[\s\S]*LIVE_OBSERVED[\s\S]*PHYSICAL_VERIFIED[\s\S]*CANONICAL/);

const safety = fs.readFileSync("policies/SAFETY-CLASSIFICATION.md", "utf8");
assert.match(safety, /CRITICAL/);
assert.match(safety, /Default state: BLOCKED/);

const veritas = fs.readFileSync("policies/RECEIPT-AND-VERITAS.md", "utf8");
assert.match(veritas, /ADMITTED/);
assert.match(veritas, /REJECTED/);
assert.match(veritas, /UNVERIFIED/);
assert.match(veritas, /provider cache mutation/);

const routing = fs.readFileSync("policies/PROVIDER-ROUTING.md", "utf8");
assert.match(routing, /WebRTC\/Edge RTC is an optional transport, not device authority/);
assert.match(routing, /No silent failover/);

const index = JSON.parse(fs.readFileSync("docs/device-policy-index.json", "utf8"));
assert.equal(index.executionAuthority, "4citeB4U/LEEWAY-DEVICE-BRIDGE");
assert.equal(index.formulaAuthority, "4citeB4U/Leeway-formula-live");
assert.equal(index.voiceAuthority, "4citeB4U/LeeWay-Voice-Fabric");

console.log("PASS Device Bridge policy/contract source conformance");
