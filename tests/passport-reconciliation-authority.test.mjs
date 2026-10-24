/*
REGION: LeeWay Device Passport Reconciliation Authority Test
TAG: LEEWAY-PASSPORT-RECONCILIATION-AUTHORITY-TEST
WHO: Veritas / CI / Agent Lee
WHAT: Prove that VERIFIED_DEVICE_PASSPORT can only be issued after genuine authenticated device
      observation bound to verified device identity and session evidence, and that a forged but
      correctly formatted observation cannot be promoted—even when an attacker supplies matching passport contents.
WHEN: Every repository test run.
WHERE: 4citeB4U/LEEWAY-DEVICE-BRIDGE/tests
WHY: JSON schema validates data structure only. This test validates authority:
     the difference between a valid data structure and verified device authority.
     A forged or unauthenticated observation must not be promotable, even with identical passport data.
HOW: Exercise PassportReconciliationProvider against genuine ingress and matching-content attacks;
     assert strict refusal reasons.
LICENSE: MIT
*/
import assert from "node:assert/strict";
import { PassportReconciliationProvider, computeTransportProofHash } from "../operator/passport-reconciliation.mjs";

// ── Shared test fixtures ──────────────────────────────────────────────────────

const TEST_TRANSPORT_SECRET = "production-transport-secret-999";

const REAL_ANDROID_PASSPORT = {
  schemaVersion: "0.1.0",
  authority: "NATIVE_ANDROID_OBSERVED",
  manufacturer: "samsung",
  model: "SM-F956U1",
  device: "q6q",
  product: "q6quew",
  hardware: "qcom",
  androidRelease: "14",
  sdkInt: 34,
  securityPatch: "2026-08-01",
  supportedAbis: ["arm64-v8a", "armeabi-v7a", "armeabi"]
};

const REAL_APPLE_PASSPORT = {
  schemaVersion: "0.1.0",
  authority: "NATIVE_APPLE_OBSERVED",
  manufacturer: "Apple",
  model: "iPhone 11",
  device: "iPhone12,1",
  product: "iPhone12,1",
  osVersion: "17.6.1",
  buildNumber: "21G93",
  applePlatform: "ios"
};

const LEGITIMATE_APPLE_IDENTITY = {
  deviceId: "iPhone12,1-00008030-001234567890",
  authority: "APPLE_LOCKDOWN_RECORD",
  publicKeyFingerprintSha256: "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90"
};

const LEGITIMATE_APPLE_PROOF_HASH = computeTransportProofHash({
  transport: "APPLE_USB_LOCKDOWN",
  ingressSessionId: "lockdown-sess-001",
  sessionNonce: "apple-auth-nonce-12345678",
  deviceId: LEGITIMATE_APPLE_IDENTITY.deviceId,
  publicKeyFingerprintSha256: LEGITIMATE_APPLE_IDENTITY.publicKeyFingerprintSha256,
  transportSecret: TEST_TRANSPORT_SECRET
});

const LEGITIMATE_APPLE_INGRESS = {
  transport: "APPLE_USB_LOCKDOWN",
  ingressSessionId: "lockdown-sess-001",
  authenticated: true,
  sessionNonce: "apple-auth-nonce-12345678",
  proofHash: LEGITIMATE_APPLE_PROOF_HASH
};

const LEGITIMATE_ANDROID_IDENTITY = {
  deviceId: "LDB-550e8400-e29b-41d4-a716-446655440000",
  authority: "ANDROID_KEYSTORE",
  publicKeyFingerprintSha256: "b2c3d4e5f6a10718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90"
};

const LEGITIMATE_ANDROID_PROOF_HASH = computeTransportProofHash({
  transport: "LOCAL_LOOPBACK",
  ingressSessionId: "loopback-sess-001",
  sessionNonce: "android-auth-nonce-12345678",
  deviceId: LEGITIMATE_ANDROID_IDENTITY.deviceId,
  publicKeyFingerprintSha256: LEGITIMATE_ANDROID_IDENTITY.publicKeyFingerprintSha256,
  transportSecret: TEST_TRANSPORT_SECRET
});

const LEGITIMATE_ANDROID_INGRESS = {
  transport: "LOCAL_LOOPBACK",
  ingressSessionId: "loopback-sess-001",
  authenticated: true,
  sessionNonce: "android-auth-nonce-12345678",
  proofHash: LEGITIMATE_ANDROID_PROOF_HASH
};

function createTestProvider(opts = {}) {
  return new PassportReconciliationProvider({
    transportSecret: TEST_TRANSPORT_SECRET,
    ...opts
  });
}

// ── Invariant 1: Legitimate Apple path with verified ingress MUST succeed ────
{
  const provider = createTestProvider();
  provider.registerBootstrap({
    bootstrapSessionId: "bs-apple-legit",
    browserAuthority: "BROWSER_DISCOVERY_ONLY",
    sessionNonce: "apple-auth-nonce-12345678"
  });
  provider.recordNativeObservation({
    bootstrapSessionId: "bs-apple-legit",
    nativePassport: REAL_APPLE_PASSPORT,
    deviceIdentity: LEGITIMATE_APPLE_IDENTITY,
    ingressEvidence: LEGITIMATE_APPLE_INGRESS
  });

  const candidate = {
    ...REAL_APPLE_PASSPORT,
    authority: "VERIFIED_DEVICE_PASSPORT",
    reconciliation: {
      reconciliationSessionId: "bs-apple-legit",
      observedAuthority: "NATIVE_APPLE_OBSERVED",
      reconciledAt: new Date().toISOString(),
      status: "MATCH"
    }
  };
  const result = provider.promote({ candidatePassport: candidate });
  assert.equal(result.promoted, true, "Legitimate Apple passport must promote to VERIFIED_DEVICE_PASSPORT");
  assert.equal(result.promotedAuthority, "VERIFIED_DEVICE_PASSPORT");
  assert.equal(result.observedAuthority, "NATIVE_APPLE_OBSERVED");
  assert.equal(result.ingressTransport, "APPLE_USB_LOCKDOWN");
  console.log("  ✔ Invariant 1: Legitimate Apple promotion with verified ingress succeeds");
}

// ── Invariant 2: Legitimate Android path with verified ingress MUST succeed ──
{
  const provider = createTestProvider();
  provider.registerBootstrap({
    bootstrapSessionId: "bs-android-legit",
    browserAuthority: "BROWSER_DISCOVERY_ONLY",
    sessionNonce: "android-auth-nonce-12345678"
  });
  provider.recordNativeObservation({
    bootstrapSessionId: "bs-android-legit",
    nativePassport: REAL_ANDROID_PASSPORT,
    deviceIdentity: LEGITIMATE_ANDROID_IDENTITY,
    ingressEvidence: LEGITIMATE_ANDROID_INGRESS
  });

  const candidate = {
    ...REAL_ANDROID_PASSPORT,
    authority: "VERIFIED_DEVICE_PASSPORT",
    reconciliation: {
      reconciliationSessionId: "bs-android-legit",
      observedAuthority: "NATIVE_ANDROID_OBSERVED",
      reconciledAt: new Date().toISOString(),
      status: "MATCH"
    }
  };
  const result = provider.promote({ candidatePassport: candidate });
  assert.equal(result.promoted, true, "Legitimate Android passport must promote");
  assert.equal(result.promotedAuthority, "VERIFIED_DEVICE_PASSPORT");
  assert.equal(result.observedAuthority, "NATIVE_ANDROID_OBSERVED");
  assert.equal(result.ingressTransport, "LOCAL_LOOPBACK");
  console.log("  ✔ Invariant 2: Legitimate Android promotion with verified loopback ingress succeeds");
}

// ── Invariant 3: ATTACK — Matching passport contents, but NO ingress evidence ─
{
  const provider = createTestProvider();
  provider.registerBootstrap({
    bootstrapSessionId: "bs-attack-no-ingress",
    browserAuthority: "BROWSER_DISCOVERY_ONLY",
    sessionNonce: "attack-nonce-12345678"
  });

  // Attacker supplies REAL_APPLE_PASSPORT (matching contents), but no ingress evidence
  assert.throws(
    () => provider.recordNativeObservation({
      bootstrapSessionId: "bs-attack-no-ingress",
      nativePassport: REAL_APPLE_PASSPORT
      // ingressEvidence and deviceIdentity omitted
    }),
    { message: "INGRESS_EVIDENCE_REQUIRED" },
    "Matching passport without ingress evidence must be refused"
  );
  console.log("  ✔ Invariant 3: ATTACK refused: Matching passport without ingress evidence");
}

// ── Invariant 4: ATTACK — Matching passport contents, but forged device identity
{
  const provider = createTestProvider();
  provider.registerBootstrap({
    bootstrapSessionId: "bs-attack-fake-identity",
    browserAuthority: "BROWSER_DISCOVERY_ONLY",
    sessionNonce: "apple-auth-nonce-12345678"
  });

  const forgedIdentity = {
    deviceId: "iPhone12,1-forged",
    authority: "SELF_SIGNED_IDENTITY", // NOT a recognized authority
    publicKeyFingerprintSha256: "0000000000000000000000000000000000000000000000000000000000000000"
  };

  assert.throws(
    () => provider.recordNativeObservation({
      bootstrapSessionId: "bs-attack-fake-identity",
      nativePassport: REAL_APPLE_PASSPORT,
      deviceIdentity: forgedIdentity,
      ingressEvidence: LEGITIMATE_APPLE_INGRESS
    }),
    { message: "DEVICE_IDENTITY_UNVERIFIED" },
    "Matching passport with forged/unverified device identity must be refused"
  );
  console.log("  ✔ Invariant 4: ATTACK refused: Matching passport with unverified device identity");
}

// ── Invariant 5: ATTACK — Matching passport contents, but unauthenticated ingress
{
  const provider = createTestProvider();
  provider.registerBootstrap({
    bootstrapSessionId: "bs-attack-unauth-ingress",
    browserAuthority: "BROWSER_DISCOVERY_ONLY",
    sessionNonce: "attack-nonce-12345678"
  });

  const unauthIngress = {
    transport: "APPLE_USB_LOCKDOWN",
    ingressSessionId: "fake-sess",
    authenticated: false, // Ingress handshake did NOT succeed
    sessionNonce: "attack-nonce-12345678",
    proofHash: "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff"
  };

  assert.throws(
    () => provider.recordNativeObservation({
      bootstrapSessionId: "bs-attack-unauth-ingress",
      nativePassport: REAL_APPLE_PASSPORT,
      deviceIdentity: LEGITIMATE_APPLE_IDENTITY,
      ingressEvidence: unauthIngress
    }),
    { message: "INGRESS_AUTHENTICATION_INVALID" },
    "Matching passport with unauthenticated ingress must be refused"
  );
  console.log("  ✔ Invariant 5: ATTACK refused: Matching passport with unauthenticated ingress");
}

// ── Invariant 6: ATTACK — Matching passport contents, but session nonce mismatch
{
  const provider = createTestProvider();
  provider.registerBootstrap({
    bootstrapSessionId: "bs-attack-nonce-mismatch",
    browserAuthority: "BROWSER_DISCOVERY_ONLY",
    sessionNonce: "expected-challenge-nonce-1"
  });

  const mismatchedNonceIngress = {
    ...LEGITIMATE_APPLE_INGRESS,
    sessionNonce: "attacker-substituted-nonce-9" // Does not match session
  };

  assert.throws(
    () => provider.recordNativeObservation({
      bootstrapSessionId: "bs-attack-nonce-mismatch",
      nativePassport: REAL_APPLE_PASSPORT,
      deviceIdentity: LEGITIMATE_APPLE_IDENTITY,
      ingressEvidence: mismatchedNonceIngress
    }),
    { message: "SESSION_NONCE_MISMATCH" },
    "Matching passport with mismatched session nonce must be refused"
  );
  console.log("  ✔ Invariant 6: ATTACK refused: Matching passport with mismatched session nonce");
}

// ── Invariant 7: ATTACK — Matching passport contents, but expired session TTL ─
{
  const provider = createTestProvider();
  // Register session with 1ms TTL
  provider.registerBootstrap({
    bootstrapSessionId: "bs-attack-expired",
    browserAuthority: "BROWSER_DISCOVERY_ONLY",
    sessionNonce: "apple-auth-nonce-12345678",
    ttlMs: -1 // Already expired
  });

  assert.throws(
    () => provider.recordNativeObservation({
      bootstrapSessionId: "bs-attack-expired",
      nativePassport: REAL_APPLE_PASSPORT,
      deviceIdentity: LEGITIMATE_APPLE_IDENTITY,
      ingressEvidence: LEGITIMATE_APPLE_INGRESS
    }),
    { message: "SESSION_EXPIRED" },
    "Matching passport on expired session must be refused"
  );
  console.log("  ✔ Invariant 7: ATTACK refused: Matching passport on expired session");
}

// ── Invariant 8: ATTACK — Matching passport contents, but replayed nonce ───────
{
  const provider = createTestProvider();
  provider.registerBootstrap({
    bootstrapSessionId: "bs-attack-replay",
    browserAuthority: "BROWSER_DISCOVERY_ONLY",
    sessionNonce: "apple-auth-nonce-12345678"
  });

  // First observation consumes the nonce
  provider.recordNativeObservation({
    bootstrapSessionId: "bs-attack-replay",
    nativePassport: REAL_APPLE_PASSPORT,
    deviceIdentity: LEGITIMATE_APPLE_IDENTITY,
    ingressEvidence: LEGITIMATE_APPLE_INGRESS
  });

  // Second observation attempts to reuse the same consumed nonce (replay attack)
  assert.throws(
    () => provider.recordNativeObservation({
      bootstrapSessionId: "bs-attack-replay",
      nativePassport: REAL_APPLE_PASSPORT,
      deviceIdentity: LEGITIMATE_APPLE_IDENTITY,
      ingressEvidence: LEGITIMATE_APPLE_INGRESS
    }),
    { message: "SESSION_NONCE_ALREADY_CONSUMED" },
    "Replayed session nonce must be refused"
  );
  console.log("  ✔ Invariant 8: ATTACK refused: Replayed session nonce");
}

// ── Invariant 9: ATTACK — Device ID substitution in candidate passport ────────
{
  const provider = createTestProvider();
  provider.registerBootstrap({
    bootstrapSessionId: "bs-attack-subst",
    browserAuthority: "BROWSER_DISCOVERY_ONLY",
    sessionNonce: "apple-auth-nonce-12345678"
  });
  provider.recordNativeObservation({
    bootstrapSessionId: "bs-attack-subst",
    nativePassport: REAL_APPLE_PASSPORT,
    deviceIdentity: LEGITIMATE_APPLE_IDENTITY, // deviceId: iPhone12,1-00008030-001234567890
    ingressEvidence: LEGITIMATE_APPLE_INGRESS
  });

  const substitutedCandidate = {
    ...REAL_APPLE_PASSPORT,
    deviceId: "different-device-substituted", // Substituted deviceId
    authority: "VERIFIED_DEVICE_PASSPORT",
    reconciliation: {
      reconciliationSessionId: "bs-attack-subst",
      observedAuthority: "NATIVE_APPLE_OBSERVED",
      reconciledAt: new Date().toISOString(),
      status: "MATCH"
    }
  };
  const result = provider.promote({ candidatePassport: substitutedCandidate });
  assert.equal(result.promoted, false);
  assert.equal(result.reason, "DEVICE_ID_MISMATCH");
  console.log("  ✔ Invariant 9: ATTACK refused: Candidate deviceId substitution:", result.reason);
}

// ── Invariant 10: Forged unregistered session refused ─────────────────────────
{
  const provider = createTestProvider();
  const forged = {
    ...REAL_APPLE_PASSPORT,
    authority: "VERIFIED_DEVICE_PASSPORT",
    reconciliation: {
      reconciliationSessionId: "unregistered-session-id",
      observedAuthority: "NATIVE_APPLE_OBSERVED",
      reconciledAt: "2026-10-14T15:00:00.000Z",
      status: "MATCH"
    }
  };
  const result = provider.promote({ candidatePassport: forged });
  assert.equal(result.promoted, false);
  assert.equal(result.reason, "BOOTSTRAP_SESSION_NOT_REGISTERED");
  console.log("  ✔ Invariant 10: Unregistered session refused:", result.reason);
}

// ── Invariant 11: Session registered but no native observation recorded ───────
{
  const provider = createTestProvider();
  provider.registerBootstrap({
    bootstrapSessionId: "bs-no-obs",
    browserAuthority: "BROWSER_DISCOVERY_ONLY",
    sessionNonce: "apple-auth-nonce-12345678"
  });
  const forged = {
    ...REAL_APPLE_PASSPORT,
    authority: "VERIFIED_DEVICE_PASSPORT",
    reconciliation: {
      reconciliationSessionId: "bs-no-obs",
      observedAuthority: "NATIVE_APPLE_OBSERVED",
      reconciledAt: "2026-10-14T15:00:00.000Z",
      status: "MATCH"
    }
  };
  const result = provider.promote({ candidatePassport: forged });
  assert.equal(result.promoted, false);
  assert.equal(result.reason, "NO_NATIVE_OBSERVATION_RECORDED");
  console.log("  ✔ Invariant 11: Session without observation refused:", result.reason);
}

// ── Invariant 12: Mismatched observedAuthority claimed in reconciliation block ─
{
  const provider = createTestProvider();
  provider.registerBootstrap({
    bootstrapSessionId: "bs-auth-mismatch",
    browserAuthority: "BROWSER_DISCOVERY_ONLY",
    sessionNonce: "android-auth-nonce-12345678"
  });
  provider.recordNativeObservation({
    bootstrapSessionId: "bs-auth-mismatch",
    nativePassport: REAL_ANDROID_PASSPORT,
    deviceIdentity: LEGITIMATE_ANDROID_IDENTITY,
    ingressEvidence: LEGITIMATE_ANDROID_INGRESS
  });

  const forged = {
    ...REAL_ANDROID_PASSPORT,
    authority: "VERIFIED_DEVICE_PASSPORT",
    reconciliation: {
      reconciliationSessionId: "bs-auth-mismatch",
      observedAuthority: "NATIVE_APPLE_OBSERVED", // Mismatch
      reconciledAt: "2026-10-14T15:00:00.000Z",
      status: "MATCH"
    }
  };
  const result = provider.promote({ candidatePassport: forged });
  assert.equal(result.promoted, false);
  assert.equal(result.reason, "OBSERVED_AUTHORITY_MISMATCH");
  console.log("  ✔ Invariant 12: Observed authority mismatch refused:", result.reason);
}

// ── Invariant 13: Mutated passport body hash mismatch ────────────────────────
{
  const provider = createTestProvider();
  provider.registerBootstrap({
    bootstrapSessionId: "bs-body-hash-mismatch",
    browserAuthority: "BROWSER_DISCOVERY_ONLY",
    sessionNonce: "apple-auth-nonce-12345678"
  });
  provider.recordNativeObservation({
    bootstrapSessionId: "bs-body-hash-mismatch",
    nativePassport: REAL_APPLE_PASSPORT,
    deviceIdentity: LEGITIMATE_APPLE_IDENTITY,
    ingressEvidence: LEGITIMATE_APPLE_INGRESS
  });

  const tampered = {
    ...REAL_APPLE_PASSPORT,
    model: "iPhone 15 Pro", // Mutated
    authority: "VERIFIED_DEVICE_PASSPORT",
    reconciliation: {
      reconciliationSessionId: "bs-body-hash-mismatch",
      observedAuthority: "NATIVE_APPLE_OBSERVED",
      reconciledAt: "2026-10-14T15:00:00.000Z",
      status: "MATCH"
    }
  };
  const result = provider.promote({ candidatePassport: tampered });
  assert.equal(result.promoted, false);
  assert.equal(result.reason, "PASSPORT_BODY_HASH_MISMATCH");
  console.log("  ✔ Invariant 13: Mutated passport body refused:", result.reason);
}

// ── Invariant 14: MISMATCH status refused ─────────────────────────────────────
{
  const provider = createTestProvider();
  provider.registerBootstrap({
    bootstrapSessionId: "bs-mismatch-status",
    browserAuthority: "BROWSER_DISCOVERY_ONLY",
    sessionNonce: "apple-auth-nonce-12345678"
  });
  provider.recordNativeObservation({
    bootstrapSessionId: "bs-mismatch-status",
    nativePassport: REAL_APPLE_PASSPORT,
    deviceIdentity: LEGITIMATE_APPLE_IDENTITY,
    ingressEvidence: LEGITIMATE_APPLE_INGRESS
  });

  const candidate = {
    ...REAL_APPLE_PASSPORT,
    authority: "VERIFIED_DEVICE_PASSPORT",
    reconciliation: {
      reconciliationSessionId: "bs-mismatch-status",
      observedAuthority: "NATIVE_APPLE_OBSERVED",
      reconciledAt: new Date().toISOString(),
      status: "MISMATCH"
    }
  };
  const result = provider.promote({ candidatePassport: candidate });
  assert.equal(result.promoted, false);
  assert.equal(result.reason, "INVALID_RECONCILIATION_STATUS");
  console.log("  ✔ Invariant 14: MISMATCH status refused:", result.reason);
}

// ── Invariant 15: Invalid browser authority rejected at intake ────────────────
{
  const provider = new PassportReconciliationProvider();
  assert.throws(
    () => provider.registerBootstrap({
      bootstrapSessionId: "bs-fake",
      browserAuthority: "NATIVE_ANDROID_OBSERVED",
      sessionNonce: "apple-auth-nonce-12345678"
    }),
    { message: "INVALID_BROWSER_AUTHORITY" },
    "Browser bootstrap with non-BROWSER_DISCOVERY_ONLY authority must be rejected at intake"
  );
  console.log("  ✔ Invariant 15: Invalid browser authority rejected at intake");
}

// ── Invariant 16: ATTACK refused: Fabricated authenticated: true with dummy proofHash fails cryptographic verification
{
  const transportSecret = "production-transport-secret-999";
  const provider = new PassportReconciliationProvider({ transportSecret });
  provider.registerBootstrap({
    bootstrapSessionId: "bs-apple-fabricated-proof",
    browserAuthority: "BROWSER_DISCOVERY_ONLY",
    sessionNonce: "apple-auth-nonce-12345678"
  });

  // Attacker supplies valid syntax, valid transport enum, matching nonce, and authenticated: true,
  // but a fabricated 64-char proofHash that was not cryptographically computed with the transport secret
  const fabricatedIngress = {
    transport: "APPLE_USB_LOCKDOWN",
    ingressSessionId: "lockdown-sess-001",
    authenticated: true,
    sessionNonce: "apple-auth-nonce-12345678",
    proofHash: "deadbeefcafebabe11223344556677889900aabbccddeeffdeadbeefcafebabe"
  };

  assert.throws(
    () => provider.recordNativeObservation({
      bootstrapSessionId: "bs-apple-fabricated-proof",
      nativePassport: REAL_APPLE_PASSPORT,
      deviceIdentity: LEGITIMATE_APPLE_IDENTITY,
      ingressEvidence: fabricatedIngress
    }),
    { message: "INGRESS_PROOF_VERIFICATION_FAILED" },
    "Reconciliation provider must reject fabricated authenticated: true evidence with invalid proofHash"
  );
  console.log("  ✔ Invariant 16: ATTACK refused: Fabricated authenticated: true evidence fails cryptographic verification");
}

// ── Invariant 17: Genuine cryptographic transport proof succeeds ───────────────
{
  import("../operator/passport-reconciliation.mjs").then(({ computeTransportProofHash }) => {
    // verified in standalone execution
  });
  const transportSecret = "production-transport-secret-999";
  const provider = new PassportReconciliationProvider({ transportSecret });
  provider.registerBootstrap({
    bootstrapSessionId: "bs-apple-genuine-crypto",
    browserAuthority: "BROWSER_DISCOVERY_ONLY",
    sessionNonce: "apple-auth-nonce-12345678"
  });

  const { computeTransportProofHash } = await import("../operator/passport-reconciliation.mjs");
  const genuineProofHash = computeTransportProofHash({
    transport: "APPLE_USB_LOCKDOWN",
    ingressSessionId: "lockdown-sess-001",
    sessionNonce: "apple-auth-nonce-12345678",
    deviceId: LEGITIMATE_APPLE_IDENTITY.deviceId,
    publicKeyFingerprintSha256: LEGITIMATE_APPLE_IDENTITY.publicKeyFingerprintSha256,
    transportSecret
  });

  const genuineIngress = {
    transport: "APPLE_USB_LOCKDOWN",
    ingressSessionId: "lockdown-sess-001",
    authenticated: true,
    sessionNonce: "apple-auth-nonce-12345678",
    proofHash: genuineProofHash
  };

  provider.recordNativeObservation({
    bootstrapSessionId: "bs-apple-genuine-crypto",
    nativePassport: REAL_APPLE_PASSPORT,
    deviceIdentity: LEGITIMATE_APPLE_IDENTITY,
    ingressEvidence: genuineIngress
  });

  const candidate = {
    ...REAL_APPLE_PASSPORT,
    authority: "VERIFIED_DEVICE_PASSPORT",
    reconciliation: {
      reconciliationSessionId: "bs-apple-genuine-crypto",
      observedAuthority: "NATIVE_APPLE_OBSERVED",
      reconciledAt: new Date().toISOString(),
      status: "MATCH"
    }
  };

  const result = provider.promote({ candidatePassport: candidate });
  assert.equal(result.promoted, true);
  console.log("  ✔ Invariant 17: Genuine cryptographic transport proof succeeds and promotes to VERIFIED_DEVICE_PASSPORT");
}

// ── Invariant 18: Unconfigured transport verification fails closed ─────────────
{
  const unconfiguredProvider = new PassportReconciliationProvider();
  unconfiguredProvider.registerBootstrap({
    bootstrapSessionId: "bs-apple-unconfigured",
    browserAuthority: "BROWSER_DISCOVERY_ONLY",
    sessionNonce: "apple-auth-nonce-12345678"
  });

  assert.throws(
    () => unconfiguredProvider.recordNativeObservation({
      bootstrapSessionId: "bs-apple-unconfigured",
      nativePassport: REAL_APPLE_PASSPORT,
      deviceIdentity: LEGITIMATE_APPLE_IDENTITY,
      ingressEvidence: LEGITIMATE_APPLE_INGRESS
    }),
    { message: "TRANSPORT_VERIFIER_UNCONFIGURED" },
    "Unconfigured transport verifier must fail closed (mandatory transport verification)"
  );
  console.log("  ✔ Invariant 18: Unconfigured transport verifier fails closed (mandatory transport verification)");
}

// ── Invariant 19: Disabling transport verification is strictly forbidden ──────
{
  assert.throws(
    () => new PassportReconciliationProvider({ requireCryptographicProof: false }),
    { message: "TRANSPORT_VERIFICATION_MANDATORY" },
    "Attempting to disable cryptographic transport proof must fail closed"
  );
  console.log("  ✔ Invariant 19: Disabling transport verification is strictly forbidden (TRANSPORT_VERIFICATION_MANDATORY)");
}

console.log("\nPASS passport reconciliation authority — genuine ingress binding enforced; matching-content and fabricated observations refused");
