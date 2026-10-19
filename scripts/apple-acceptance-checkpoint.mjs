import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const receiptPath = "evidence/apple/artifacts/iphone11-metal-receipt-20261018.json";
const integrityPath = "evidence/apple/G19-IPHONE11-LOCAL-RECEIPT-INTEGRITY-20261018.md";
const lineagePath = "evidence/apple/G19-IPHONE11-LOCAL-METAL-RECEIPT-OBSERVED-20261018.md";
const releasePath = "evidence/apple/G19-DIRECT-ILOADER-ACCEPTANCE-20261018.md";
function canonical(v) {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])]));
  return v;
}
const digest = v => createHash("sha256").update(JSON.stringify(canonical(v))).digest("hex");
export function checkpoint({ receipt, integrityReport, lineageReport, releaseReport }) {
  const { receiptHash, ...hashedPayload } = receipt;
  const evidenceHash = receipt.evidenceHash;
  // The hash covers all receipt fields except receiptHash; this is not a digital signature.
  const evidenceMatches = digest(receipt.evidence) === evidenceHash;
  const receiptMatches = digest(hashedPayload) === receiptHash;
  const reportMentionsHashes = integrityReport.includes(evidenceHash) && integrityReport.includes(receiptHash);
  const oldLineage = lineageReport.match(/IPA SHA-256:\s*([a-f0-9]{64})/i)?.[1]?.toLowerCase() ?? null;
  const releaseLineage = releaseReport.match(/833d88a1fb13248b326e39ac26b7c8fd02535202056d2824a47d413575eab007/)?.[0] ?? null;
  const hasLocalEvidence = evidenceMatches && receiptMatches && receipt.result === "PASS";
  return {
    state: hasLocalEvidence ? "LOCAL_HASH_REPLAY_PASSED_BASELINE" : "LOCAL_HASH_REPLAY_FAILED_BASELINE",
    localEvidence: { evidenceMatches, receiptMatches, reportMentionsHashes, metalResult: receipt.result },
    recordedIpaDigest: oldLineage,
    release27DocumentedDigest: releaseLineage,
    checkpointScope: "ARCHIVED_EVIDENCE_BASELINE_ONLY",
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
