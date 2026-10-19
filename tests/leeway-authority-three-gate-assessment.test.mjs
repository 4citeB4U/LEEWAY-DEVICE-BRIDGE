import test from "node:test";
import assert from "node:assert/strict";
import {assessLeeWayAuthorityGates as assess} from "../scripts/leeway-authority-three-gate-assessment.mjs";
const good={
 registry:{providerId:"receipt-provider",contracts:["receipt.ledger"],entryPath:"server/receipt-ledger-service.mjs"},
 receiptService:{httpStatus:200,status:"LEEWAY_RECEIPT_LEDGER_PASS"},
 receiptChain:{valid:true,entries:3},
 veritas:{source:"CANONICAL_INDEPENDENT_VERITAS",trustRootVerified:true,receiptDigestMatched:true,decision:"VERIFIED",signatureVerified:true,receiptDigest:"a".repeat(64)},
 learningLedger:{source:"CANONICAL_LEARNING_LEDGER",providerAuthenticated:true,admissionReceiptVerified:true,verifiedSourceDigest:"a".repeat(64),admissionId:"verified-fixture"},
 n8nWorkflow:{workflowId:"LEEWAY-LEARNING-LEDGER-INGEST",protectedMigrationApproved:true,installedVerified:true,providerAuthenticated:true,negativeTestPassed:true}
};
test("Registration alone fails all three gates",()=>{
 const v=assess({registry:good.registry});assert.equal(v.allThreeComplete,false);
 assert.equal(v.gates.runtimeFabric.status,"BLOCKED");assert.equal(v.mutationsPerformed,false);
});
test("Unreachable ledger service blocks real Runtime Fabric",()=>{
 const v=assess({...good,receiptService:{httpStatus:null}});assert.equal(v.allThreeComplete,false);
 assert.equal(v.gates.receiptLedger.chainVerified,false);
});
test("HTTP 200 with bad hash chain is not receipt verification",()=>{
 const v=assess({...good,receiptChain:{valid:false,entries:3}});assert.equal(v.allThreeComplete,false);
 assert.equal(v.gates.receiptLedger.status,"BLOCKED");
});
test("Historical n8n workflow name alone never qualifies admission",()=>{
 const v=assess({...good,n8nWorkflow:{workflowId:"LEEWAY-LEARNING-LEDGER-INGEST"}});
 assert.equal(v.allThreeComplete,false);assert.equal(v.gates.learningIngest.status,"BLOCKED");
});
test("Self-asserted Veritas signature does not admit learning",()=>{
 const v=assess({...good,veritas:{...good.veritas,signatureVerified:false}});
 assert.equal(v.gates.learningIngest.learningAdmitted,false);
});
test("Learning Ledger receipt tied to wrong evidence digest fails closed",()=>{
 const v=assess({...good,learningLedger:{...good.learningLedger,verifiedSourceDigest:"b".repeat(64)}});
 assert.equal(v.gates.learningIngest.learningAdmitted,false);
});
test("Only complete synthetic evidence sets all gates; assessment never executes",()=>{
 const v=assess(good);assert.equal(v.evidenceClaimsComplete,true);assert.equal(v.allThreeComplete,false);
 assert.equal(v.execution,"READ_ONLY_ASSESSMENT");assert.equal(v.mutationsPerformed,false);
});
