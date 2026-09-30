import fs from "node:fs";
import assert from "node:assert/strict";

const src=fs.readFileSync(
  "apps/android/app/src/main/java/industries/leeway/devicebridge/FormulaF8Gate.kt",
  "utf8"
);

assert.match(src,/LW-F8/);
assert.match(src,/LOCAL_PRE_GATE_ONLY/);
assert.match(src,/localAuthorizationPassed/);
assert.match(src,/formulaEvaluatorState", "UNEXPOSED"/);
assert.match(src,/formulaExecutionState", "NOT_EXECUTED"/);
assert.match(src,/q69ResultClaimed", false/);
assert.match(src,/EMPTY_CONDITIONS_BLOCKED/);
assert.match(src,/canonicalPolicyGapClosed", false/);
assert.doesNotMatch(src,/put\("qA"/);
assert.doesNotMatch(src,/val qA/);

console.log("PASS F8 local pre-gate truth boundary");
