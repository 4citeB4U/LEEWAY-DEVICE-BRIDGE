/*
REGION: LeeWay Device Passport Reconciliation Provider
TAG: LEEWAY-PASSPORT-RECONCILIATION-PROVIDER
WHO: Agent Lee / authorized LeeWay runtimes
WHAT: Enforce genuine authenticated native observation before a VERIFIED_DEVICE_PASSPORT is issued.
WHEN: Before any promotion to VERIFIED_DEVICE_PASSPORT authority.
WHERE: 4citeB4U/LEEWAY-DEVICE-BRIDGE/operator
WHY: The JSON schema validates structure only. This provider validates authority:
     a schema-valid reconciliation object constructed without a real device observation
     must not be promotable. Valid data structure != verified device authority.
     Furthermore, an observation must be cryptographically bound to verified device identity
     and non-replayable authenticated ingress session evidence; matching passport contents
     alone cannot qualify without genuine ingress proof.
HOW: Session registry + non-replayable nonce challenge + device identity verification +
     authenticated ingress evidence binding + canonical body hash cross-check.
STATUS: CANDIDATE / PROPOSED RECONCILIATION GATEWAY — NOT APPROVED AS CANONICAL RECONCILIATION
        AUTHORITY UNTIL LIVE DEVELOPER SERVICES, RUNTIME FABRIC, FORMULA, AND VERITAS GATES ARE INTEGRATED.
        C3 GATE REMAINS BLOCKED.
LICENSE: MIT
*/
import { createHash, createHmac } from "node:crypto";

const VALID_NATIVE_AUTHORITIES = new Set([
  "NATIVE_ANDROID_OBSERVED",
  "NATIVE_APPLE_OBSERVED"
]);

const VALID_DEVICE_IDENTITY_AUTHORITIES = new Set([
  "ANDROID_KEYSTORE",
  "APPLE_LOCKDOWN_RECORD"
]);

const VALID_INGRESS_TRANSPORTS = new Set([
  "LOCAL_LOOPBACK",
  "RELAY_WSS",
  "APPLE_USB_LOCKDOWN",
  "CONTROLLER_BRIDGE"
]);

const VALID_RECONCILIATION_STATUSES = new Set(["MATCH", "PARTIAL_MATCH"]);

/**
 * Canonical deterministic hash of an object.
 * Matches digest() in packages/protocol/index.mjs — key-sorted JSON.
 */
function canonicalHash(obj) {
  function canonical(v) {
    if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
    if (v !== null && typeof v === "object")
      return "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + canonical(v[k])).join(",") + "}";
    return JSON.stringify(v);
  }
  return createHash("sha256").update(canonical(obj)).digest("hex");
}

/**
 * Compute cryptographic HMAC-SHA256 proof hash for an authenticated transport challenge.
 * Binds transport, ingressSessionId, sessionNonce, deviceId, and device public key fingerprint.
 */
export function computeTransportProofHash({
  transport,
  ingressSessionId,
  sessionNonce,
  deviceId,
  publicKeyFingerprintSha256,
  transportSecret
}) {
  if (!transportSecret) throw new Error("TRANSPORT_SECRET_REQUIRED");
  return createHmac("sha256", transportSecret)
    .update(`${transport}:${ingressSessionId}:${sessionNonce}:${deviceId}:${publicKeyFingerprintSha256}`)
    .digest("hex");
}

/**
 * The Reconciliation Session Registry is the runtime's single source of truth
 * for bootstrap sessions that are eligible for promotion.
 *
 * It enforces:
 *  1. Bootstrap sessions must be registered with BROWSER_DISCOVERY_ONLY authority,
 *     a non-empty sessionNonce challenge, and an explicit TTL.
 *  2. Native observations must be accompanied by verified device identity and authenticated
 *     ingress evidence (e.g. Android KeyStore attestation, Apple lockdown pairing, loopback/relay auth).
 *  3. Ingress sessionNonce must match the bootstrap session challenge and is single-use (anti-replay).
 *  4. Even if an attacker supplies matching, valid passport contents, promotion is refused
 *     without authentic, unexpired, non-replayed ingress evidence.
 *  5. Transport evidence must be cryptographically verified; self-asserted authenticated: true
 *     with arbitrary proof hashes is strictly rejected.
 */
export class PassportReconciliationProvider {
  /**
   * @param {{
   *   allowPartialMatch?: boolean,
   *   defaultTtlMs?: number,
   *   transportVerifier?: Function,
   *   transportSecret?: string,
   *   requireCryptographicProof?: boolean
   * }} opts
   */
  constructor({
    allowPartialMatch = false,
    defaultTtlMs = 120000,
    transportVerifier = null,
    transportSecret = null,
    requireCryptographicProof = true
  } = {}) {
    if (requireCryptographicProof === false) {
      throw new Error("TRANSPORT_VERIFICATION_MANDATORY");
    }
    this._sessions = new Map();
    this._allowPartialMatch = allowPartialMatch;
    this._defaultTtlMs = defaultTtlMs;
    this._transportVerifier = transportVerifier;
    this._transportSecret = transportSecret;
    this._requireCryptographicProof = true;
  }

  /**
   * Register a browser bootstrap session as eligible for native reconciliation.
   * @param {{ bootstrapSessionId: string, browserAuthority: string, sessionNonce?: string, ttlMs?: number }} params
   */
  registerBootstrap({ bootstrapSessionId, browserAuthority, sessionNonce = "default-nonce-000", ttlMs = this._defaultTtlMs }) {
    if (typeof bootstrapSessionId !== "string" || bootstrapSessionId.length < 1)
      throw new Error("INVALID_BOOTSTRAP_SESSION_ID");
    if (browserAuthority !== "BROWSER_DISCOVERY_ONLY")
      throw new Error("INVALID_BROWSER_AUTHORITY");
    if (typeof sessionNonce !== "string" || sessionNonce.length < 8)
      throw new Error("INVALID_SESSION_NONCE");

    const now = Date.now();
    this._sessions.set(bootstrapSessionId, {
      bootstrapSessionId,
      browserAuthority,
      sessionNonce,
      registeredAt: new Date(now).toISOString(),
      expiresAt: now + ttlMs,
      nonceConsumed: false,
      nativePassportHash: null,
      deviceIdentity: null,
      ingressEvidence: null
    });
  }

  /**
   * Record an authenticated native passport observation against a registered session.
   * Must be called by the native device runtime (Android/Apple) after genuine hardware capture
   * and successful ingress authentication.
   *
   * @param {{
   *   bootstrapSessionId: string,
   *   nativePassport: object,
   *   deviceIdentity?: { deviceId: string, authority: string, publicKeyFingerprintSha256: string },
   *   ingressEvidence?: { transport: string, ingressSessionId: string, authenticated: boolean, sessionNonce: string, timestamp?: string, proofHash: string }
   * }} params
   */
  recordNativeObservation({ bootstrapSessionId, nativePassport, deviceIdentity, ingressEvidence }) {
    const session = this._sessions.get(bootstrapSessionId);
    if (!session) throw new Error("BOOTSTRAP_SESSION_NOT_FOUND");

    const now = Date.now();
    if (now > session.expiresAt) throw new Error("SESSION_EXPIRED");
    if (session.nonceConsumed) throw new Error("SESSION_NONCE_ALREADY_CONSUMED");

    if (typeof nativePassport !== "object" || nativePassport === null)
      throw new Error("INVALID_NATIVE_PASSPORT");
    const authority = nativePassport.authority;
    if (!VALID_NATIVE_AUTHORITIES.has(authority))
      throw new Error("INVALID_NATIVE_AUTHORITY");

    // Gate A: Authenticated ingress evidence is mandatory
    if (!ingressEvidence || typeof ingressEvidence !== "object")
      throw new Error("INGRESS_EVIDENCE_REQUIRED");

    if (
      ingressEvidence.authenticated !== true ||
      !VALID_INGRESS_TRANSPORTS.has(ingressEvidence.transport) ||
      typeof ingressEvidence.ingressSessionId !== "string" ||
      ingressEvidence.ingressSessionId.length < 1 ||
      typeof ingressEvidence.proofHash !== "string" ||
      ingressEvidence.proofHash.length !== 64
    ) {
      throw new Error("INGRESS_AUTHENTICATION_INVALID");
    }

    if (ingressEvidence.sessionNonce !== session.sessionNonce)
      throw new Error("SESSION_NONCE_MISMATCH");

    // Gate B: Verified device identity is mandatory
    if (!deviceIdentity || typeof deviceIdentity !== "object")
      throw new Error("DEVICE_IDENTITY_UNVERIFIED");

    if (
      typeof deviceIdentity.deviceId !== "string" ||
      deviceIdentity.deviceId.length < 1 ||
      !VALID_DEVICE_IDENTITY_AUTHORITIES.has(deviceIdentity.authority) ||
      typeof deviceIdentity.publicKeyFingerprintSha256 !== "string" ||
      deviceIdentity.publicKeyFingerprintSha256.length !== 64
    ) {
      throw new Error("DEVICE_IDENTITY_UNVERIFIED");
    }

    // Cross-check: authority consistency
    if (authority === "NATIVE_ANDROID_OBSERVED" && deviceIdentity.authority !== "ANDROID_KEYSTORE")
      throw new Error("DEVICE_IDENTITY_UNVERIFIED");
    if (authority === "NATIVE_APPLE_OBSERVED" && deviceIdentity.authority !== "APPLE_LOCKDOWN_RECORD")
      throw new Error("DEVICE_IDENTITY_UNVERIFIED");

    // Gate C: Independent cryptographic verification of transport authentication proof
    // Rejects self-declared authenticated: true if cryptographic proof verification fails
    if (this._transportVerifier) {
      const verified = this._transportVerifier({
        transport: ingressEvidence.transport,
        ingressEvidence,
        deviceIdentity,
        sessionNonce: session.sessionNonce
      });
      if (!verified) throw new Error("INGRESS_PROOF_VERIFICATION_FAILED");
    } else if (this._transportSecret) {
      const expectedProof = computeTransportProofHash({
        transport: ingressEvidence.transport,
        ingressSessionId: ingressEvidence.ingressSessionId,
        sessionNonce: session.sessionNonce,
        deviceId: deviceIdentity.deviceId,
        publicKeyFingerprintSha256: deviceIdentity.publicKeyFingerprintSha256,
        transportSecret: this._transportSecret
      });
      if (ingressEvidence.proofHash !== expectedProof) {
        throw new Error("INGRESS_PROOF_VERIFICATION_FAILED");
      }
    } else {
      throw new Error("TRANSPORT_VERIFIER_UNCONFIGURED");
    }

    // Single-use consumption of session challenge to prevent replay
    session.nonceConsumed = true;
    session.nativePassportHash = canonicalHash(nativePassport);
    session.observedAuthority = authority;
    session.deviceIdentity = deviceIdentity;
    session.ingressEvidence = ingressEvidence;
    session.observedAt = new Date().toISOString();
  }

  /**
   * Attempt to promote a candidate passport to VERIFIED_DEVICE_PASSPORT.
   *
   * Enforces:
   *  1. Candidate passport must contain a valid reconciliation block.
   *  2. The reconciliation.reconciliationSessionId must reference a known registered session.
   *  3. The session must have a recorded native passport observation bound to verified ingress evidence.
   *  4. The reconciliation.observedAuthority must match the session's recorded observation.
   *  5. The candidate passport body hash must match the session's recorded nativePassportHash.
   *  6. If candidate includes deviceId, it must match the session's verified deviceIdentity.deviceId.
   *  7. The reconciliation.status must be MATCH (or PARTIAL_MATCH if allowed by policy).
   */
  promote({ candidatePassport }) {
    if (typeof candidatePassport !== "object" || candidatePassport === null)
      return { promoted: false, reason: "INVALID_CANDIDATE" };

    const rec = candidatePassport.reconciliation;
    if (!rec || typeof rec !== "object")
      return { promoted: false, reason: "RECONCILIATION_BLOCK_MISSING" };

    // Gate 1: Session must be registered
    const session = this._sessions.get(rec.reconciliationSessionId);
    if (!session)
      return { promoted: false, reason: "BOOTSTRAP_SESSION_NOT_REGISTERED" };

    // Gate 2: Session must have a real native observation with verified ingress evidence
    if (!session.nativePassportHash || !session.ingressEvidence || !session.deviceIdentity)
      return { promoted: false, reason: "NO_NATIVE_OBSERVATION_RECORDED" };

    // Gate 3: observedAuthority must match what was actually captured
    if (rec.observedAuthority !== session.observedAuthority)
      return { promoted: false, reason: "OBSERVED_AUTHORITY_MISMATCH" };

    // Gate 4: Device identifier must match verified device identity
    if (candidatePassport.deviceId && candidatePassport.deviceId !== session.deviceIdentity.deviceId)
      return { promoted: false, reason: "DEVICE_ID_MISMATCH" };

    // Gate 5: Passport body hash must match the recorded observation
    const { reconciliation: _rec, authority: _auth, ...passportBody } = candidatePassport;
    const candidateHash = canonicalHash({ ...passportBody, authority: session.observedAuthority });
    if (candidateHash !== session.nativePassportHash)
      return { promoted: false, reason: "PASSPORT_BODY_HASH_MISMATCH" };

    // Gate 6: Reconciliation status
    if (!VALID_RECONCILIATION_STATUSES.has(rec.status))
      return { promoted: false, reason: "INVALID_RECONCILIATION_STATUS" };
    if (!this._allowPartialMatch && rec.status === "PARTIAL_MATCH")
      return { promoted: false, reason: "PARTIAL_MATCH_NOT_PERMITTED_BY_POLICY" };

    return {
      promoted: true,
      promotedAuthority: "VERIFIED_DEVICE_PASSPORT",
      sessionId: session.bootstrapSessionId,
      deviceId: session.deviceIdentity.deviceId,
      observedAuthority: session.observedAuthority,
      ingressTransport: session.ingressEvidence.transport,
      promotedAt: new Date().toISOString()
    };
  }
}
