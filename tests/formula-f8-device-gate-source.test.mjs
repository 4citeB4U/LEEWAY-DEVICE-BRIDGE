import fs from "node:fs";
import assert from "node:assert/strict";

const src=fs.readFileSync(
  "apps/android/app/src/main/java/industries/leeway/devicebridge/FormulaF8Gate.kt",
  "utf8"
);

assert.match(src,/DEVICE_BRIDGE_LOCAL_ELIGIBILITY/);
assert.match(src,/LW-F8/);
assert.match(src,/4citeB4U\/Leeway-formula-live/);
assert.match(src,/canonicalFormulaExecuted/);
assert.match(src,/NOT_EXECUTED/);
assert.match(src,/canonicalQ69/);
assert.match(src,/JSONObject\.NULL/);
assert.match(src,/EXECUTE/);
assert.match(src,/HOLD/);
assert.match(src,/EMPTY_CONDITIONS_BLOCKED/);
assert.doesNotMatch(src,/qA\s*=/);
assert.doesNotMatch(src,/if \(fire\) 69/);

console.log("PASS local eligibility gate preserves centralized Formula truth boundary");