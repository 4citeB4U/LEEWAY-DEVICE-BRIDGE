import fs from "node:fs";
import assert from "node:assert/strict";

const localGate=fs.readFileSync(
  "apps/android/app/src/main/java/industries/leeway/devicebridge/LocalAutomationGate.kt",
  "utf8"
);
const legacy=fs.readFileSync(
  "apps/android/app/src/main/java/industries/leeway/devicebridge/FormulaF8Gate.kt",
  "utf8"
);

assert.match(localGate,/LEEWAY_LOCAL_AUTOMATION_GATE_V1/);
assert.match(localGate,/formulaFamilyReference", "LW-F8"/);
assert.match(localGate,/formulaExecution", "NOT_EXECUTED"/);
assert.match(localGate,/EMPTY_CONDITIONS_BLOCKED/);
assert.match(localGate,/canonicalFormulaRequiredForFormulaClaim", true/);
assert.doesNotMatch(localGate,/put\("qA"/);
assert.doesNotMatch(localGate,/qA\s*=/);
assert.match(legacy,/CANONICAL_FORMULA_EVALUATOR_REQUIRED/);
assert.match(legacy,/Leeway-formula-live/);

console.log("PASS local automation gate does not fabricate Formula/Q69 execution");
