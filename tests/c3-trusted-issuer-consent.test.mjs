/*
REGION: LeeWay C3 Trusted Issuer and Signed Consent Acceptance Tests
TAG: LEEWAY-C3-TRUSTED-ISSUER-CONSENT-TEST
WHO: Veritas / CI / Agent Lee
WHAT: Prove that signed, request-bound device-command consent (leeway.consent-evidence.v1)
      is accepted ONLY from a verified trusted issuer with registered public key,
      while forged signatures, untrusted keys, expired authorizations, replayed approvals,
      and target substitutions are strictly rejected.
WHEN: Every repository test run.
WHERE: 4citeB4U/LEEWAY-DEVICE-BRIDGE/tests
WHY: A development key or self-asserted boolean is not an owner authority.
     Consequential execution requires mathematically verified asymmetric signatures
     against an explicit trusted issuer registry with anti-replay and freshness guarantees.
HOW: Node crypto Ed25519 keypair generation -> sign/verify against TrustedIssuerRegistry ->
     assert rejection of 12 distinct attack invariants.
LICENSE: MIT
*/
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import {
  createConsentEvidenceToken,
  verifyConsentEvidence,
  computeArgsDigest
} from "../operator/trusted-issuer-registry.mjs";

// ── Generate Test Keypairs (In-Memory Only, No Secrets Persisted to Disk) ─────

// 1. Legitimate Carrier Keypair
const { publicKey: carrierPub, privateKey: carrierPriv } = generateKeyPairSync("ed25519");
const carrierPubSpki = carrierPub.export({ type: "spki", format: "pem" });
const carrierPrivPkcs8 = carrierPriv.export({ type: "pkcs8", format: "pem" });

// 2. Attacker / Untrusted Keypair (Valid Ed25519, but not enrolled in trust registry)
const { publicKey: attackerPub, privateKey: attackerPriv } = generateKeyPairSync("ed25519");
const attackerPubSpki = attackerPub.export({ type: "spki", format: "pem" });
const attackerPrivPkcs8 = attackerPriv.export({ type: "pkcs8", format: "pem" });

// ── Explicit Trusted Issuer Registry ──────────────────────────────────────────
const TEST_TRUSTED_ISSUER_REGISTRY = {
  "leeway.runtime.carrier.v1": {
    issuerId: "leeway.runtime.carrier.v1",
    displayName: "LeeWay Canonical Runtime Fabric Carrier",
    keyId: "carrier-ed25519-key-001",
    algorithm: "Ed25519",
    publicKeySpki: carrierPubSpki,
    status: "ACTIVE",
    validUntil: "2027-01-01T00:00:00.000Z"
  },
  "leeway.inactive.carrier.v1": {
    issuerId: "leeway.inactive.carrier.v1",
    displayName: "Inactive Carrier Key",
    keyId: "carrier-inactive-001",
    algorithm: "Ed25519",
    publicKeySpki: carrierPubSpki,
    status: "REVOKED",
    validUntil: "2027-01-01T00:00:00.000Z"
  }
};

const replayGuard = new Set();

const STANDARD_ARGS = { path: "governed/report.txt", content: "PASS_EVIDENCE" };
const STANDARD_ARGS_DIGEST = computeArgsDigest(STANDARD_ARGS);

// ── Invariant 1: Genuine signed consent token from registered issuer PASSES ───
{
  const token = createConsentEvidenceToken({
    issuer: "leeway.runtime.carrier.v1",
    keyId: "carrier-ed25519-key-001",
    privateKeyPem: carrierPrivPkcs8,
    requestId: "TURN-20261014-0001",
    deviceId: "samsung-fold6-live",
    platform: "android",
    capability: "device.files.write",
    args: STANDARD_ARGS,
    sessionNonce: "session-nonce-12345678",
    tokenNonce: "token-nonce-00000001"
  });

  const verification = verifyConsentEvidence({
    consentEvidence: token,
    expectedDeviceId: "samsung-fold6-live",
    expectedPlatform: "android",
    expectedCapability: "device.files.write",
    expectedArgsDigest: STANDARD_ARGS_DIGEST,
    trustedIssuerRegistry: TEST_TRUSTED_ISSUER_REGISTRY,
    replayGuard
  });

  assert.equal(verification.valid, true);
  assert.equal(verification.issuer, "leeway.runtime.carrier.v1");
  console.log("  ✔ Invariant 1: Genuine signed consent token from registered issuer PASSES");
}

// ── Invariant 2: ATTACK refused: Forged signature is rejected ─────────────────
{
  const token = createConsentEvidenceToken({
    issuer: "leeway.runtime.carrier.v1",
    keyId: "carrier-ed25519-key-001",
    privateKeyPem: carrierPrivPkcs8,
    requestId: "TURN-20261014-0002",
    deviceId: "samsung-fold6-live",
    platform: "android",
    capability: "device.files.write",
    args: STANDARD_ARGS,
    sessionNonce: "session-nonce-12345678",
    tokenNonce: "token-nonce-00000002"
  });

  // Corrupt signature bytes
  const forgedToken = {
    ...token,
    signature: Buffer.from("forged-invalid-signature-bytes-00000000000000000000").toString("base64")
  };

  assert.throws(
    () => verifyConsentEvidence({
      consentEvidence: forgedToken,
      expectedDeviceId: "samsung-fold6-live",
      expectedPlatform: "android",
      expectedCapability: "device.files.write",
      expectedArgsDigest: STANDARD_ARGS_DIGEST,
      trustedIssuerRegistry: TEST_TRUSTED_ISSUER_REGISTRY,
      replayGuard
    }),
    { message: "INVALID_SIGNATURE" },
    "Forged signature must be rejected with INVALID_SIGNATURE"
  );
  console.log("  ✔ Invariant 2: ATTACK refused: Forged signature rejected");
}

// ── Invariant 3: ATTACK refused: Tampered payload after signing is rejected ───
{
  const token = createConsentEvidenceToken({
    issuer: "leeway.runtime.carrier.v1",
    keyId: "carrier-ed25519-key-001",
    privateKeyPem: carrierPrivPkcs8,
    requestId: "TURN-20261014-0003",
    deviceId: "samsung-fold6-live",
    platform: "android",
    capability: "device.files.write",
    args: STANDARD_ARGS,
    sessionNonce: "session-nonce-12345678",
    tokenNonce: "token-nonce-00000003"
  });

  // Tamper with target capability after signature was generated
  const tamperedToken = {
    ...token,
    capability: "device.apps.install"
  };

  assert.throws(
    () => verifyConsentEvidence({
      consentEvidence: tamperedToken,
      expectedDeviceId: "samsung-fold6-live",
      expectedPlatform: "android",
      expectedCapability: "device.apps.install", // Attacker asks for install
      expectedArgsDigest: STANDARD_ARGS_DIGEST,
      trustedIssuerRegistry: TEST_TRUSTED_ISSUER_REGISTRY,
      replayGuard
    }),
    { message: "INVALID_SIGNATURE" },
    "Payload tampered after signing must fail signature verification"
  );
  console.log("  ✔ Invariant 3: ATTACK refused: Tampered payload rejected by signature verification");
}

// ── Invariant 4: ATTACK refused: Signed by untrusted/unrelated key ────────────
{
  // Attacker signs with their own private key, claiming to be the canonical issuer
  const token = createConsentEvidenceToken({
    issuer: "leeway.runtime.carrier.v1",
    keyId: "carrier-ed25519-key-001",
    privateKeyPem: attackerPrivPkcs8, // Signed with attacker key!
    requestId: "TURN-20261014-0004",
    deviceId: "samsung-fold6-live",
    platform: "android",
    capability: "device.files.write",
    args: STANDARD_ARGS,
    sessionNonce: "session-nonce-12345678",
    tokenNonce: "token-nonce-00000004"
  });

  assert.throws(
    () => verifyConsentEvidence({
      consentEvidence: token,
      expectedDeviceId: "samsung-fold6-live",
      expectedPlatform: "android",
      expectedCapability: "device.files.write",
      expectedArgsDigest: STANDARD_ARGS_DIGEST,
      trustedIssuerRegistry: TEST_TRUSTED_ISSUER_REGISTRY,
      replayGuard
    }),
    { message: "INVALID_SIGNATURE" },
    "Signature from unrelated/untrusted key must fail verification against registered public key"
  );
  console.log("  ✔ Invariant 4: ATTACK refused: Untrusted key signature rejected against registered public key");
}

// ── Invariant 5: ATTACK refused: Unregistered issuer ID ────────────────────────
{
  const token = createConsentEvidenceToken({
    issuer: "rogue.sovereign.consent.service",
    keyId: "rogue-key-001",
    privateKeyPem: attackerPrivPkcs8,
    requestId: "TURN-20261014-0005",
    deviceId: "samsung-fold6-live",
    platform: "android",
    capability: "device.files.write",
    args: STANDARD_ARGS,
    sessionNonce: "session-nonce-12345678",
    tokenNonce: "token-nonce-00000005"
  });

  assert.throws(
    () => verifyConsentEvidence({
      consentEvidence: token,
      expectedDeviceId: "samsung-fold6-live",
      expectedPlatform: "android",
      expectedCapability: "device.files.write",
      expectedArgsDigest: STANDARD_ARGS_DIGEST,
      trustedIssuerRegistry: TEST_TRUSTED_ISSUER_REGISTRY,
      replayGuard
    }),
    { message: "UNTRUSTED_ISSUER" },
    "Unregistered issuer must be rejected with UNTRUSTED_ISSUER"
  );
  console.log("  ✔ Invariant 5: ATTACK refused: Unregistered issuer rejected");
}

// ── Invariant 6: ATTACK refused: Expired consent token ────────────────────────
{
  const expiredTime = new Date(Date.now() - 300000).toISOString(); // 5 minutes ago
  const token = createConsentEvidenceToken({
    issuer: "leeway.runtime.carrier.v1",
    keyId: "carrier-ed25519-key-001",
    privateKeyPem: carrierPrivPkcs8,
    requestId: "TURN-20261014-0006",
    deviceId: "samsung-fold6-live",
    platform: "android",
    capability: "device.files.write",
    args: STANDARD_ARGS,
    sessionNonce: "session-nonce-12345678",
    tokenNonce: "token-nonce-00000006",
    issuedAt: expiredTime,
    ttlMs: 60000 // Expired 4 minutes ago
  });

  assert.throws(
    () => verifyConsentEvidence({
      consentEvidence: token,
      expectedDeviceId: "samsung-fold6-live",
      expectedPlatform: "android",
      expectedCapability: "device.files.write",
      expectedArgsDigest: STANDARD_ARGS_DIGEST,
      trustedIssuerRegistry: TEST_TRUSTED_ISSUER_REGISTRY,
      replayGuard
    }),
    { message: "CONSENT_EXPIRED" },
    "Expired token must be rejected with CONSENT_EXPIRED"
  );
  console.log("  ✔ Invariant 6: ATTACK refused: Expired consent token rejected");
}

// ── Invariant 7: ATTACK refused: Replayed token nonce ─────────────────────────
{
  const token = createConsentEvidenceToken({
    issuer: "leeway.runtime.carrier.v1",
    keyId: "carrier-ed25519-key-001",
    privateKeyPem: carrierPrivPkcs8,
    requestId: "TURN-20261014-0007",
    deviceId: "samsung-fold6-live",
    platform: "android",
    capability: "device.files.write",
    args: STANDARD_ARGS,
    sessionNonce: "session-nonce-12345678",
    tokenNonce: "token-nonce-single-use-007"
  });

  // First verification consumes the token nonce
  const first = verifyConsentEvidence({
    consentEvidence: token,
    expectedDeviceId: "samsung-fold6-live",
    expectedPlatform: "android",
    expectedCapability: "device.files.write",
    expectedArgsDigest: STANDARD_ARGS_DIGEST,
    trustedIssuerRegistry: TEST_TRUSTED_ISSUER_REGISTRY,
    replayGuard
  });
  assert.equal(first.valid, true);

  // Second verification with identical token nonce MUST be rejected (anti-replay)
  assert.throws(
    () => verifyConsentEvidence({
      consentEvidence: token,
      expectedDeviceId: "samsung-fold6-live",
      expectedPlatform: "android",
      expectedCapability: "device.files.write",
      expectedArgsDigest: STANDARD_ARGS_DIGEST,
      trustedIssuerRegistry: TEST_TRUSTED_ISSUER_REGISTRY,
      replayGuard
    }),
    { message: "TOKEN_NONCE_ALREADY_CONSUMED" },
    "Replayed token nonce must be rejected with TOKEN_NONCE_ALREADY_CONSUMED"
  );
  console.log("  ✔ Invariant 7: ATTACK refused: Replayed token nonce rejected");
}

// ── Invariant 8: ATTACK refused: Wrong-device substitution ────────────────────
{
  const token = createConsentEvidenceToken({
    issuer: "leeway.runtime.carrier.v1",
    keyId: "carrier-ed25519-key-001",
    privateKeyPem: carrierPrivPkcs8,
    requestId: "TURN-20261014-0008",
    deviceId: "samsung-fold6-live", // Token was granted for Fold 6
    platform: "android",
    capability: "device.files.write",
    args: STANDARD_ARGS,
    sessionNonce: "session-nonce-12345678",
    tokenNonce: "token-nonce-00000008"
  });

  // Attacker attempts to apply this token to an iPhone 11 operation
  assert.throws(
    () => verifyConsentEvidence({
      consentEvidence: token,
      expectedDeviceId: "iphone-11-live",
      expectedPlatform: "ios",
      expectedCapability: "device.files.write",
      expectedArgsDigest: STANDARD_ARGS_DIGEST,
      trustedIssuerRegistry: TEST_TRUSTED_ISSUER_REGISTRY,
      replayGuard
    }),
    { message: "DEVICE_ID_MISMATCH" },
    "Cross-device token substitution must be rejected with DEVICE_ID_MISMATCH"
  );
  console.log("  ✔ Invariant 8: ATTACK refused: Cross-device token substitution rejected");
}

// ── Invariant 9: ATTACK refused: Wrong-capability substitution ────────────────
{
  const token = createConsentEvidenceToken({
    issuer: "leeway.runtime.carrier.v1",
    keyId: "carrier-ed25519-key-001",
    privateKeyPem: carrierPrivPkcs8,
    requestId: "TURN-20261014-0009",
    deviceId: "samsung-fold6-live",
    platform: "android",
    capability: "device.files.write", // Granted for files.write
    args: STANDARD_ARGS,
    sessionNonce: "session-nonce-12345678",
    tokenNonce: "token-nonce-00000009"
  });

  // Caller attempts to execute device.apps.install using the files.write token
  assert.throws(
    () => verifyConsentEvidence({
      consentEvidence: token,
      expectedDeviceId: "samsung-fold6-live",
      expectedPlatform: "android",
      expectedCapability: "device.apps.install",
      expectedArgsDigest: STANDARD_ARGS_DIGEST,
      trustedIssuerRegistry: TEST_TRUSTED_ISSUER_REGISTRY,
      replayGuard
    }),
    { message: "CAPABILITY_MISMATCH" },
    "Capability substitution must be rejected with CAPABILITY_MISMATCH"
  );
  console.log("  ✔ Invariant 9: ATTACK refused: Capability substitution rejected");
}

// ── Invariant 10: ATTACK refused: Arguments digest mismatch ───────────────────
{
  const token = createConsentEvidenceToken({
    issuer: "leeway.runtime.carrier.v1",
    keyId: "carrier-ed25519-key-001",
    privateKeyPem: carrierPrivPkcs8,
    requestId: "TURN-20261014-0010",
    deviceId: "samsung-fold6-live",
    platform: "android",
    capability: "device.files.write",
    args: { path: "safe/report.txt", content: "SAFE" }, // Approved for safe path
    sessionNonce: "session-nonce-12345678",
    tokenNonce: "token-nonce-00000010"
  });

  // Caller invokes files.write with a different target path / payload
  const maliciousArgsDigest = computeArgsDigest({ path: "system/core/exploit.bin", content: "MALICIOUS" });

  assert.throws(
    () => verifyConsentEvidence({
      consentEvidence: token,
      expectedDeviceId: "samsung-fold6-live",
      expectedPlatform: "android",
      expectedCapability: "device.files.write",
      expectedArgsDigest: maliciousArgsDigest,
      trustedIssuerRegistry: TEST_TRUSTED_ISSUER_REGISTRY,
      replayGuard
    }),
    { message: "ARGS_DIGEST_MISMATCH" },
    "Modified command arguments must be rejected with ARGS_DIGEST_MISMATCH"
  );
  console.log("  ✔ Invariant 10: ATTACK refused: Arguments digest mismatch rejected");
}

// ── Invariant 11: ATTACK refused: Inactive / Revoked issuer key ───────────────
{
  const token = createConsentEvidenceToken({
    issuer: "leeway.inactive.carrier.v1",
    keyId: "carrier-inactive-001",
    privateKeyPem: carrierPrivPkcs8,
    requestId: "TURN-20261014-0011",
    deviceId: "samsung-fold6-live",
    platform: "android",
    capability: "device.files.write",
    args: STANDARD_ARGS,
    sessionNonce: "session-nonce-12345678",
    tokenNonce: "token-nonce-00000011"
  });

  assert.throws(
    () => verifyConsentEvidence({
      consentEvidence: token,
      expectedDeviceId: "samsung-fold6-live",
      expectedPlatform: "android",
      expectedCapability: "device.files.write",
      expectedArgsDigest: STANDARD_ARGS_DIGEST,
      trustedIssuerRegistry: TEST_TRUSTED_ISSUER_REGISTRY,
      replayGuard
    }),
    { message: "ISSUER_KEY_INACTIVE" },
    "Revoked issuer key must be rejected with ISSUER_KEY_INACTIVE"
  );
  console.log("  ✔ Invariant 11: ATTACK refused: Inactive / revoked issuer key rejected");
}

// ── Invariant 12: ATTACK refused: Unknown key ID for registered issuer ────────
{
  const token = createConsentEvidenceToken({
    issuer: "leeway.runtime.carrier.v1",
    keyId: "carrier-unregistered-key-999", // Unregistered keyId
    privateKeyPem: carrierPrivPkcs8,
    requestId: "TURN-20261014-0012",
    deviceId: "samsung-fold6-live",
    platform: "android",
    capability: "device.files.write",
    args: STANDARD_ARGS,
    sessionNonce: "session-nonce-12345678",
    tokenNonce: "token-nonce-00000012"
  });

  assert.throws(
    () => verifyConsentEvidence({
      consentEvidence: token,
      expectedDeviceId: "samsung-fold6-live",
      expectedPlatform: "android",
      expectedCapability: "device.files.write",
      expectedArgsDigest: STANDARD_ARGS_DIGEST,
      trustedIssuerRegistry: TEST_TRUSTED_ISSUER_REGISTRY,
      replayGuard
    }),
    { message: "UNTRUSTED_KEY_ID" },
    "Unregistered key ID must be rejected with UNTRUSTED_KEY_ID"
  );
  console.log("  ✔ Invariant 12: ATTACK refused: Unregistered key ID rejected");
}

// ── Invariant 13: Enrolled registry file loads and validates production issuer ─
{
  const { loadTrustedIssuerRegistry } = await import("../operator/trusted-issuer-registry.mjs");
  const enrolledIssuers = loadTrustedIssuerRegistry();
  assert.ok(enrolledIssuers["leeway.runtime.carrier.v1"]);
  assert.equal(enrolledIssuers["leeway.runtime.carrier.v1"].algorithm, "Ed25519");
  assert.equal(enrolledIssuers["leeway.runtime.carrier.v1"].status, "ACTIVE");
  assert.ok(enrolledIssuers["leeway.runtime.carrier.v1"].publicKeySpki.includes("BEGIN PUBLIC KEY"));
  console.log("  ✔ Invariant 13: Enrolled registry file (operator/trusted-issuers.json) loaded and validated");
}

// ── Invariant 14: Missing registry file fails closed ───────────────────────────
{
  const { loadTrustedIssuerRegistry } = await import("../operator/trusted-issuer-registry.mjs");
  assert.throws(
    () => loadTrustedIssuerRegistry("non/existent/path/trusted-issuers.json"),
    { message: /TRUSTED_ISSUER_REGISTRY_NOT_FOUND/ },
    "Missing registry file must fail closed"
  );
  console.log("  ✔ Invariant 14: Missing registry file fails closed (TRUSTED_ISSUER_REGISTRY_NOT_FOUND)");
}

// ── Invariant 15: Persistent Replay Guard blocks replay with NO caller-passed state
{
  const { ConsentReplayGuard, verifyConsentEvidence } = await import("../operator/trusted-issuer-registry.mjs");
  const isolatedReplayGuard = new ConsentReplayGuard({ inMemoryOnly: true });

  const token = createConsentEvidenceToken({
    issuer: "leeway.runtime.carrier.v1",
    keyId: "carrier-ed25519-key-001",
    privateKeyPem: carrierPrivPkcs8,
    requestId: "TURN-20261014-0015",
    deviceId: "samsung-fold6-live",
    platform: "android",
    capability: "device.files.write",
    args: STANDARD_ARGS,
    sessionNonce: "session-nonce-12345678",
    tokenNonce: "token-nonce-guarded-0015"
  });

  // Call 1: SUT passes
  const res1 = verifyConsentEvidence({
    consentEvidence: token,
    expectedDeviceId: "samsung-fold6-live",
    expectedPlatform: "android",
    expectedCapability: "device.files.write",
    expectedArgsDigest: STANDARD_ARGS_DIGEST,
    trustedIssuerRegistry: TEST_TRUSTED_ISSUER_REGISTRY,
    replayGuard: isolatedReplayGuard
  });
  assert.equal(res1.valid, true);

  // Call 2: SUT with same guard must be rejected without caller maintaining any Set
  assert.throws(
    () => verifyConsentEvidence({
      consentEvidence: token,
      expectedDeviceId: "samsung-fold6-live",
      expectedPlatform: "android",
      expectedCapability: "device.files.write",
      expectedArgsDigest: STANDARD_ARGS_DIGEST,
      trustedIssuerRegistry: TEST_TRUSTED_ISSUER_REGISTRY,
      replayGuard: isolatedReplayGuard
    }),
    { message: "TOKEN_NONCE_ALREADY_CONSUMED" },
    "Replayed token must be rejected by persistent replay guard"
  );
  console.log("  ✔ Invariant 15: Replay Guard enforces anti-replay without caller-provided state");
}

// ── Invariant 16: Canonical enrolled carrier key produces tokens verified by enrolled registry
{
  const fs = await import("node:fs");
  const { loadTrustedIssuerRegistry, verifyConsentEvidence, ConsentReplayGuard } = await import("../operator/trusted-issuer-registry.mjs");
  const CANONICAL_CARRIER_KEY_PATH = "E:/LeeWay-Work/runtime-c3-clean-formula-20261007/security/keys/dev-key.pem";
  assert.ok(fs.existsSync(CANONICAL_CARRIER_KEY_PATH), "Canonical carrier private key must exist");
  const canonicalPrivPem = fs.readFileSync(CANONICAL_CARRIER_KEY_PATH, "utf8");

  const enrolledRegistry = loadTrustedIssuerRegistry();

  const token = createConsentEvidenceToken({
    issuer: "leeway.runtime.carrier.v1",
    keyId: "carrier-ed25519-key-001",
    privateKeyPem: canonicalPrivPem,
    requestId: "TURN-20261014-CANONICAL-0001",
    deviceId: "samsung-fold6-live",
    platform: "android",
    capability: "device.files.write",
    args: STANDARD_ARGS,
    sessionNonce: "session-nonce-canonical",
    tokenNonce: "token-nonce-canonical-0001"
  });

  const verification = verifyConsentEvidence({
    consentEvidence: token,
    expectedDeviceId: "samsung-fold6-live",
    expectedPlatform: "android",
    expectedCapability: "device.files.write",
    expectedArgsDigest: STANDARD_ARGS_DIGEST,
    trustedIssuerRegistry: enrolledRegistry,
    replayGuard: new ConsentReplayGuard({ inMemoryOnly: true })
  });

  assert.equal(verification.valid, true);
  assert.equal(verification.issuer, "leeway.runtime.carrier.v1");
  assert.equal(verification.keyId, "carrier-ed25519-key-001");
  console.log("  ✔ Invariant 16: Canonical carrier private key produces authentic consent token verified by enrolled registry");
}

// ── Invariant 17: Attacker key fails verification against enrolled registry file
{
  const { loadTrustedIssuerRegistry, verifyConsentEvidence, ConsentReplayGuard } = await import("../operator/trusted-issuer-registry.mjs");
  const enrolledRegistry = loadTrustedIssuerRegistry();

  const attackerToken = createConsentEvidenceToken({
    issuer: "leeway.runtime.carrier.v1",
    keyId: "carrier-ed25519-key-001",
    privateKeyPem: attackerPrivPkcs8,
    requestId: "TURN-20261014-ATTACK-0001",
    deviceId: "samsung-fold6-live",
    platform: "android",
    capability: "device.files.write",
    args: STANDARD_ARGS,
    sessionNonce: "session-nonce-attack",
    tokenNonce: "token-nonce-attack-0001"
  });

  assert.throws(
    () => verifyConsentEvidence({
      consentEvidence: attackerToken,
      expectedDeviceId: "samsung-fold6-live",
      expectedPlatform: "android",
      expectedCapability: "device.files.write",
      expectedArgsDigest: STANDARD_ARGS_DIGEST,
      trustedIssuerRegistry: enrolledRegistry,
      replayGuard: new ConsentReplayGuard({ inMemoryOnly: true })
    }),
    { message: "INVALID_SIGNATURE" },
    "Attacker key must fail verification against enrolled carrier public key"
  );
  console.log("  ✔ Invariant 17: ATTACK refused: Attacker key signature rejected against enrolled registry file");
}

// ── Invariant 18: Durable restart safety: state reloaded across process instances
{
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  const { ConsentReplayGuard } = await import("../operator/trusted-issuer-registry.mjs");

  const testStateFile = path.join(os.tmpdir(), `leeway-test-replay-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`);

  try {
    // Process 1: instantiate guard and consume token
    const guardProcess1 = new ConsentReplayGuard({ stateFilePath: testStateFile });
    const tokenNonce = "nonce-durable-restart-test-0001";
    const expiresAtMs = Date.now() + 60000;

    const consumed = guardProcess1.consume(tokenNonce, expiresAtMs);
    assert.equal(consumed, true, "First consumption in Process 1 must succeed");
    assert.equal(guardProcess1.has(tokenNonce), true);

    // Verify file was written
    assert.ok(fs.existsSync(testStateFile), "Ledger file must be created on disk");
    const fileContent = fs.readFileSync(testStateFile, "utf8");
    assert.ok(fileContent.includes(tokenNonce), "Ledger file must contain consumed nonce");

    // Process 2: new independent guard instantiated from disk state (simulating process restart)
    const guardProcess2 = new ConsentReplayGuard({ stateFilePath: testStateFile });
    assert.equal(guardProcess2.has(tokenNonce), true, "Process 2 must have restored consumed nonce from disk");

    // Attempting to consume replayed nonce in Process 2 must be rejected
    const replayed = guardProcess2.consume(tokenNonce, expiresAtMs);
    assert.equal(replayed, false, "Replay in restarted Process 2 must be refused");

    console.log("  ✔ Invariant 18: Durable restart safety: consumed token nonces persist across simulated process restart");
  } finally {
    if (fs.existsSync(testStateFile)) {
      fs.unlinkSync(testStateFile);
    }
  }
}

console.log("\nPASS C3 Trusted Issuer Registry & Signed Consent Evidence — 18/18 security invariants verified");
