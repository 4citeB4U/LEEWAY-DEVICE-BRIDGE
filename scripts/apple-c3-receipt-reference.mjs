// Device Bridge -> Runtime Fabric C3 reference map (planning only).
// A local Metal receipt is not a Formula/Veritas/independent-readback receipt.
import {readCanonical} from './apple-acceptance-checkpoint.mjs';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const HEX=/^[a-f0-9]{64}$/i;
const ID=/^[A-Za-z0-9._:-]{1,160}$/;
const missing=[
  'FORMULA_RECEIPT_HASH_NOT_OBSERVED',
  'VERITAS_PRE_RECEIPT_HASH_NOT_OBSERVED',
  'VERITAS_POST_RECEIPT_HASH_NOT_OBSERVED',
  'INDEPENDENT_EXECUTION_READBACK_HASH_NOT_OBSERVED',
  'CANONICAL_VERITAS_PROVIDER_NOT_AUTHENTICATED',
  'CANONICAL_LEARNING_LEDGER_PROVIDER_NOT_AUTHENTICATED'
];
export function mapAppleLocalReceiptToC3Reference(checkpoint,receipt) {
  const failures=[];
  if(checkpoint?.state!=='LOCAL_HASH_REPLAY_PASSED_BASELINE' ||
     checkpoint?.localEvidence?.evidenceMatches!==true ||
     checkpoint?.localEvidence?.receiptMatches!==true)
    failures.push('LOCAL_RECEIPT_HASH_REPLAY_NOT_PASSED');
  if (!receipt || !ID.test(receipt?.receiptId ?? '') ||
      !ID.test(receipt?.evidence?.id ?? '') ||
      !HEX.test(receipt?.receiptHash ?? '') ||
      !HEX.test(receipt?.evidenceHash ?? '')) failures.push('LOCAL_RECEIPT_REFERENCE_INVALID');
  const verifiedLocal=failures.length===0;
  return {
    status:'BLOCKED',
    mappingScope:'ARCHIVED_APPLE_METAL_LOCAL_REFERENCE_ONLY',
    // These are local identifiers, NOT a canonical Runtime Fabric request/outcome
    // until a fresh independently identified request binds them explicitly.
    localReference:verifiedLocal?{
      localReceiptId:receipt.receiptId,localEvidenceId:receipt.evidence.id,
      localReceiptSha256:receipt.receiptHash,localEvidenceSha256:receipt.evidenceHash,
      deviceCapability:receipt.capability,localProbeResult:receipt.result
    }:null,
    missingCanonicalEvidence:missing,
    failures,
    canonicalC3EvidenceProduced:false,
    runtimeExecutionObserved:false,
    independentVeritasAdmitted:false,
    learningLedgerUpdated:false,
    executable:false
  };
}
export function readAppleLocalC3Reference(){
  const receipt=JSON.parse(readFileSync(path.join(root,'evidence/apple/artifacts/iphone11-metal-receipt-20261018.json'),'utf8'));
  return mapAppleLocalReceiptToC3Reference(readCanonical(),receipt);
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  process.stdout.write(JSON.stringify(readAppleLocalC3Reference(),null,2)+'\n');
}
