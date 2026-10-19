import assert from "node:assert/strict";
import test from "node:test";
import { readCanonical, checkpoint } from "../scripts/apple-acceptance-checkpoint.mjs";
import { readFileSync } from "node:fs";

test("Existing Apple receipt is intact, without promoting it to external authority", () => {
  const result = readCanonical();
  assert.equal(result.state, "LOCAL_RECEIPT_INTEGRITY_QUALIFIED");
  assert.equal(result.localEvidence.evidenceMatches, true);
  assert.equal(result.localEvidence.receiptMatches, true);
  assert.equal(result.localEvidence.reportsMatch, true);
  assert.equal(result.release27PhysicalBindingVerified, false);
  assert.equal(result.externalVeritasDecision, "NOT_OBSERVED");
  assert.equal(result.acceptanceComplete, false);
});
test("Tampered local evidence fails closed", () => {
  const receipt = JSON.parse(readFileSync("evidence/apple/artifacts/iphone11-metal-receipt-20261018.json", "utf8"));
  receipt.evidence.mismatchCount = 42;
  const result = checkpoint({receipt, integrityReport: "", lineageReport: "", releaseReport: ""});
  assert.equal(result.localEvidence.evidenceMatches, false);
  assert.equal(result.state, "LOCAL_RECEIPT_INTEGRITY_FAILED");
  assert.equal(result.acceptanceComplete, false);
});
