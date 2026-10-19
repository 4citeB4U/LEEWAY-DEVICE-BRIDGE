import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const receiptPath = "evidence/apple/artifacts/iphone11-metal-receipt-20261018.json";
const integrityPath = "evidence/apple/G19-IPHONE11-LOCAL-RECEIPT-INTEGRITY-20261018.md";
const lineagePath = "evidence/apple/G19-IPHONE11-LOCAL-METAL-RECEIPT-OBSERVED-20261018.md";
const releasePath = "evidence/apple/G19-DIRECT-ILOADER-ACCEPTANCE-20261018.md";
const sha = v => createHash("sha256").update(JSON.stringify(v, Object.keys(v).sort())).digest("hex");
function canonical(v) {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])]));
  return v;
}
const digest = v => createHash("sha256").update(JSON.stringify(canonical(v))).digest("hex");
export function checkpoint({ receipt, integrityReport, lineageReport, releaseReport }) {
  const { receiptHash, evidenceHash, ...payload } = receipt;
  // The signed-over receipt payload retains evidenceHash; receiptHash alone is excluded.
  const { receiptHash: ignored, ...signedPayload } = receipt;
  const evidenceMatches = digest(receipt.evidence) === evidenceHash;
  const receiptMatches = digest(signedPayload) === receiptHash;
  const reportsMatch = integrityReport.includes(evidenceHash) && integrityReport.includes(receiptHash);
  const oldLineage = lineageReport.match(/IPA SHA-256:\s*([a-f0-9]{64})/i)?.[1]?.toLowerCase() ?? null;
  const releaseLineage = releaseReport.match(/833d88a1fb13248b326e39ac26b7c8fd02535202056d2824a47d413575eab007/)?.[0] ?? null;
  const hasLocalEvidence = evidenceMatches && receiptMatches && reportsMatch && receipt.result === "PASS";
  return {
    state: hasLocalEvidence ? "LOCAL_RECEIPT_INTEGRITY_QUALIFIED" : "LOCAL_RECEIPT_INTEGRITY_FAILED",
    localEvidence: { evidenceMatches, receiptMatches, reportsMatch, metalResult: receipt.result },
    recordedIpaDigest: oldLineage,
    release27Digest: releaseLineage,
    release27PhysicalBindingVerified: false,
    externalVeritasDecision: "NOT_OBSERVED",
    runtimeFabricConsumption: "NOT_OBSERVED",
    learningLedgerAdmission: "NOT_OBSERVED",
    installationAuthorized: false,
    acceptanceComplete: false
  };
}
export function readCanonical() {
  const read = rel => readFileSync(path.join(root, rel), "utf8");
  return checkpoint({receipt: JSON.parse(read(receiptPath)), integrityReport: read(integrityPath), lineageReport: read(lineagePath), releaseReport: read(releasePath)});
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(readCanonical(), null, 2));
