// Read-only assessment: registry facts never substitute for live health,
// independent Veritas receipt admission or Learning Ledger provider response.
// Receives observations supplied by a separate authorized host probe.
export function assessLeeWayAuthorityGates(input={}) {
  const r=input.registry||{}, service=input.receiptService||{}, chain=input.receiptChain||{};
  const veritas=input.veritas||{}, learning=input.learningLedger||{}, workflow=input.n8nWorkflow||{};
  const registryRecognized=r.providerId==="receipt-provider"
    && Array.isArray(r.contracts) && r.contracts.includes("receipt.ledger")
    && r.entryPath==="server/receipt-ledger-service.mjs";
  const liveHealthy=registryRecognized && service.httpStatus===200
    && service.status==="LEEWAY_RECEIPT_LEDGER_PASS";
  // Receipt-chain PASS requires a measured chain result, not just HTTP 200.
  const chainVerified=liveHealthy && chain.valid===true
    && Number.isSafeInteger(chain.entries) && chain.entries>=0;
  const veritasVerified=veritas.source==="CANONICAL_INDEPENDENT_VERITAS"
    && veritas.trustRootVerified===true && veritas.receiptDigestMatched===true
    && veritas.decision==="VERIFIED" && veritas.signatureVerified===true;
  const learningAdmitted=veritasVerified && learning.source==="CANONICAL_LEARNING_LEDGER"
    && learning.providerAuthenticated===true && learning.admissionReceiptVerified===true
    && learning.verifiedSourceDigest===veritas.receiptDigest && typeof learning.admissionId==="string"
    && learning.admissionId.trim().length>0;
  // Historical n8n workflow references never establish executable/qualified ingestion.
  const n8nQualified=workflow.workflowId==="LEEWAY-LEARNING-LEDGER-INGEST"
    && workflow.protectedMigrationApproved===true && workflow.installedVerified===true
    && workflow.providerAuthenticated===true && workflow.negativeTestPassed===true;
  const gates={
    runtimeFabric:{status:liveHealthy?"LIVE_HEALTH_OBSERVED":"BLOCKED",registryRecognized,liveHealthy},
    receiptLedger:{status:chainVerified?"HASH_CHAIN_VERIFIED":"BLOCKED",chainVerified},
    learningIngest:{status:learningAdmitted&&n8nQualified?"VERIFIED_ADMITTED":"BLOCKED",
      n8nQualified,learningAdmitted}
  };
  return {gates,allThreeComplete:liveHealthy&&chainVerified&&learningAdmitted&&n8nQualified,
    execution:"READ_ONLY_ASSESSMENT",mutationsPerformed:false};
}
