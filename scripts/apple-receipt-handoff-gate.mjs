import { readCanonical } from "./apple-acceptance-checkpoint.mjs";

// Planning is pure; the canonical Runtime Fabric/Veritas authorities retain execution and issuance.
export function planAppleReceiptHandoff(checkpoint, bindings = {}) {
  const baseline = checkpoint?.localEvidence;
  const verifiedLocal = checkpoint?.state === "LOCAL_HASH_REPLAY_PASSED_BASELINE"
    && baseline?.evidenceMatches === true && baseline?.receiptMatches === true;
  const veritas = bindings.veritas;
  const ledger = bindings.learningLedger;
  const qualified = provider => provider && typeof provider.providerId === "string"
    && provider.providerId.trim().length > 0
    && typeof provider.contractRef === "string" && provider.contractRef.trim().length > 0
    && provider.independentlyQualified === true;
  const failures = [];
  if (!verifiedLocal) failures.push("LOCAL_RECEIPT_HASH_REPLAY_NOT_PASSED");
  if (!qualified(veritas)) failures.push("CANONICAL_VERITAS_PROVIDER_NOT_QUALIFIED");
  if (!qualified(ledger)) failures.push("LEARNING_LEDGER_PROVIDER_NOT_QUALIFIED");
  return {
    status: failures.length === 0 ? "DRY_RUN_HANDOFF_ROUTE_READY" : "BLOCKED",
    blockers: failures,
    verification: "NOT_EXECUTED",
    receiptSubmitted: false,
    learningLedgerUpdated: false,
    executable: false,
    canonicalAuthorityRequired: true
  };
}
if (process.argv[1] && import.meta.url === new URL("file:" + process.argv[1].replaceAll("\\", "/")).href) {
  console.log(JSON.stringify(planAppleReceiptHandoff(readCanonical()), null, 2));
}
