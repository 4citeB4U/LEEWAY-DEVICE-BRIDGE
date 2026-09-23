import fs from "node:fs";
import assert from "node:assert/strict";

const src=fs.readFileSync(
  "apps/android/app/src/main/java/industries/leeway/devicebridge/FormulaF8Gate.kt",
  "utf8"
);

assert.match(src,/LW-F8/);
assert.match(src,/qA/);
assert.match(src,/69/);
assert.match(src,/EXECUTE/);
assert.match(src,/HOLD/);
assert.match(src,/EMPTY_CONDITIONS_BLOCKED/);
assert.match(src,/canonicalPolicyGapClosed", false/);

console.log("PASS F8 Device Bridge source policy");
