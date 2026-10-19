import assert from "node:assert/strict";
import test from "node:test";
import { readCanonical } from "../scripts/apple-acceptance-checkpoint.mjs";
import { planAppleReceiptHandoff } from "../scripts/apple-receipt-handoff-gate.mjs";
const baseline = readCanonical();
test("Archived receipt blocks handoff when canonical providers are absent", () => {
  const plan = planAppleReceiptHandoff(baseline);
  assert.equal(plan.status, "BLOCKED");
  assert.deepEqual(plan.blockers, ["CANONICAL_VERITAS_PROVIDER_NOT_QUALIFIED", "LEARNING_LEDGER_PROVIDER_NOT_QUALIFIED"]);
  assert.equal(plan.receiptSubmitted, false);
});
test("Caller assertions alone cannot qualify authority", () => {
  const plan = planAppleReceiptHandoff(baseline, {veritas:{providerId:"mock",contractRef:"mock"}, learningLedger:{providerId:"mock",contractRef:"mock"}});
  assert.equal(plan.status, "BLOCKED");
});
test("Even two explicitly qualified contract bindings cannot execute or claim verified receipt", () => {
  const a={providerId:"fixture",contractRef:"tests/fixture",independentlyQualified:true};
  const plan=planAppleReceiptHandoff(baseline,{veritas:a,learningLedger:a});
  assert.equal(plan.status,"BLOCKED");
  assert.equal(plan.providerClaimsStructurallyComplete,true);
  assert.ok(plan.blockers.includes("CANONICAL_AUTHORITY_BINDING_NOT_INDEPENDENTLY_VERIFIED"));
  assert.equal(plan.executable,false);
  assert.equal(plan.verification,"NOT_EXECUTED");
  assert.equal(plan.learningLedgerUpdated,false);
});
test("Tampered receipt blocks even synthetic qualified bindings", () => {
  const a={providerId:"fixture",contractRef:"tests/fixture",independentlyQualified:true};
  const plan=planAppleReceiptHandoff({...baseline,localEvidence:{...baseline.localEvidence,evidenceMatches:false}}, {veritas:a,learningLedger:a});
  assert.equal(plan.status,"BLOCKED");
});

test("Untrusted claim cannot become readiness even if all fields are true", () => {
  const claim={providerId:"invented",contractRef:"invented",independentlyQualified:true};
  const plan=planAppleReceiptHandoff(baseline,{veritas:claim,learningLedger:claim});
  assert.equal(plan.status,"BLOCKED");
  assert.equal(plan.executable,false);
  assert.equal(plan.receiptSubmitted,false);
  assert.equal(plan.learningLedgerUpdated,false);
});
