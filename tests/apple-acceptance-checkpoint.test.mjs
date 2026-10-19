import assert from "node:assert/strict";
import test from "node:test";
import { readCanonical, checkpoint } from "../scripts/apple-acceptance-checkpoint.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const fixtureUrl = new URL("../evidence/apple/artifacts/iphone11-metal-receipt-20261018.json", import.meta.url);

test("Existing Apple receipt is intact, without promoting it to external authority", () => {
  const result = readCanonical();
  assert.equal(result.state, "LOCAL_HASH_REPLAY_PASSED_BASELINE");
  assert.equal(result.localEvidence.evidenceMatches, true);
  assert.equal(result.localEvidence.receiptMatches, true);
  assert.equal(result.localEvidence.reportMentionsHashes, true);
  assert.equal(result.release27PhysicalBindingVerified, false);
  assert.equal(result.externalVeritasDecision, "NOT_OBSERVED");
  assert.equal(result.acceptanceComplete, false);
});
test("Tampered local evidence fails closed", () => {
  const receipt = JSON.parse(readFileSync(fixtureUrl, "utf8"));
  receipt.evidence.mismatchCount = 42;
  const result = checkpoint({receipt, integrityReport: "", lineageReport: "", releaseReport: ""});
  assert.equal(result.localEvidence.evidenceMatches, false);
  assert.equal(result.state, "LOCAL_HASH_REPLAY_FAILED_BASELINE");
  assert.equal(result.acceptanceComplete, false);
});

test("Tampered receipt hash fails closed", () => {
  const receipt = JSON.parse(readFileSync(fixtureUrl, "utf8"));
  receipt.receiptHash = "0".repeat(64);
  const result = checkpoint({ receipt, integrityReport: "", lineageReport: "", releaseReport: "" });
  assert.equal(result.localEvidence.receiptMatches, false);
  assert.equal(result.state, "LOCAL_HASH_REPLAY_FAILED_BASELINE");
});
test("Integrity report prose cannot override digest replay", () => {
  const original = JSON.parse(readFileSync(fixtureUrl, "utf8"));
  const receipt = { ...original, evidence: { ...original.evidence, laneCount: 17 } };
  const forgedReport = `FAIL ${original.evidenceHash} ${original.receiptHash}`;
  const result = checkpoint({receipt, integrityReport: forgedReport, lineageReport: "", releaseReport: ""});
  assert.equal(result.localEvidence.reportMentionsHashes, true);
  assert.equal(result.localEvidence.evidenceMatches, false);
  assert.equal(result.state, "LOCAL_HASH_REPLAY_FAILED_BASELINE");
});
test("Missing package lineage is not guessed", () => {
  const receipt = JSON.parse(readFileSync(fixtureUrl, "utf8"));
  const result = checkpoint({receipt, integrityReport: "", lineageReport: "", releaseReport: ""});
  assert.equal(result.recordedIpaDigest, null);
  assert.equal(result.release27DocumentedDigest, null);
  assert.equal(result.release27PhysicalBindingVerified, false);
  assert.equal(result.acceptanceComplete, false);
});
