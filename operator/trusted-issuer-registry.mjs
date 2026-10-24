/*
REGION: LeeWay C3 Trusted Issuer Registry & Consent Evidence Verifier
TAG: LEEWAY-C3-TRUSTED-ISSUER-REGISTRY
WHO: Agent Lee / authorized LeeWay runtimes
WHAT: Canonical public-key trust registry, persistent replay guard, and cryptographic verification for request-bound consent tokens (leeway.consent-evidence.v1).
WHEN: Before executing consequential device operations (MUTATE / ADMIN).
WHERE: 4citeB4U/LEEWAY-DEVICE-BRIDGE/operator
WHY: Prevent forged, expired, replayed, wrong-target, or unverified claims from granting execution authority.
     Distinguishes development keys from enrolled issuer identities; ensures anti-replay across independent invocations.
HOW: Key lookup in trusted issuer registry -> canonical serialization -> Node crypto.verify(Ed25519) -> ConsentReplayGuard anti-replay -> TTL & target binding.
LICENSE: MIT
*/
import { createHash, verify, sign } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Enrolled Trusted Issuer Registry Loader.
 * Reads operator/trusted-issuers.json by default and verifies schema integrity.
 */
export function loadTrustedIssuerRegistry(registryPath = path.join(__dirname, "trusted-issuers.json")) {
  if (!fs.existsSync(registryPath)) {
    throw new Error(`TRUSTED_ISSUER_REGISTRY_NOT_FOUND: ${registryPath}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  } catch (err) {
    throw new Error(`TRUSTED_ISSUER_REGISTRY_CORRUPT: ${err.message}`);
  }

  if (!parsed || typeof parsed.issuers !== "object" || parsed.issuers === null) {
    throw new Error("TRUSTED_ISSUER_REGISTRY_INVALID: Missing issuers block");
  }

  // Validate each enrolled issuer
  for (const [id, record] of Object.entries(parsed.issuers)) {
    if (!record.issuerId || record.issuerId !== id) {
      throw new Error(`TRUSTED_ISSUER_REGISTRY_INVALID: Issuer ID mismatch for ${id}`);
    }
    if (!record.publicKeySpki || !record.publicKeySpki.includes("BEGIN PUBLIC KEY")) {
      throw new Error(`TRUSTED_ISSUER_REGISTRY_INVALID: Missing or invalid SPKI key for ${id}`);
    }
    if (record.algorithm !== "Ed25519") {
      throw new Error(`TRUSTED_ISSUER_REGISTRY_INVALID: Unsupported algorithm ${record.algorithm} for ${id}`);
    }
  }

  return parsed.issuers;
}

/**
 * Pinned fallback for offline/isolated tests if file is unavailable.
 */
export const CANONICAL_TRUSTED_ISSUERS = {
  "leeway.runtime.carrier.v1": {
    issuerId: "leeway.runtime.carrier.v1",
    displayName: "LeeWay Canonical Runtime Fabric Carrier",
    keyId: "carrier-ed25519-key-001",
    algorithm: "Ed25519",
    publicKeySpki: "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAVZ7KX4QCfpId1dtpHK866vZhCL1jY1k/mzPcYsft7yE=\n-----END PUBLIC KEY-----\n",
    status: "ACTIVE",
    validUntil: "2027-01-01T00:00:00.000Z"
  }
};

/**
 * Durable Restart-Safe Replay Guard.
 * Tracks consumed token nonces both in-memory and persisted to a durable append-only JSONL ledger file.
 * Bound to token expiration timestamps with automatic pruning of stale entries.
 * Survives process restarts and prevents replay across independent runtime lifetimes.
 */
export class ConsentReplayGuard {
  constructor({
    stateFilePath = path.join(__dirname, "../state/consent-replay-ledger.jsonl"),
    stateDirPath = null,
    maxEntries = 10000,
    pruneIntervalMs = 60000,
    inMemoryOnly = false
  } = {}) {
    this._consumedNonces = new Map(); // tokenNonce -> expiresAt timestamp
    this._maxEntries = maxEntries;
    this._pruneIntervalMs = pruneIntervalMs;
    this._lastPrune = Date.now();
    this._inMemoryOnly = inMemoryOnly;
    this._stateFilePath = inMemoryOnly ? null : stateFilePath;
    this._stateDirPath = inMemoryOnly ? null : (stateDirPath || (stateFilePath ? `${stateFilePath}.locks` : null));

    if (this._stateDirPath && !fs.existsSync(this._stateDirPath)) {
      try { fs.mkdirSync(this._stateDirPath, { recursive: true }); } catch {}
    }

    if (this._stateFilePath) {
      this._loadFromDisk();
    }
  }

  _lockPathFor(nonce) {
    if (!this._stateDirPath) return null;
    const safeNonce = encodeURIComponent(nonce);
    return path.join(this._stateDirPath, `${safeNonce}.lock`);
  }

  _loadFromDisk() {
    if (!this._stateFilePath || !fs.existsSync(this._stateFilePath)) {
      return;
    }
    const now = Date.now();
    try {
      const content = fs.readFileSync(this._stateFilePath, "utf8");
      const lines = content.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const record = JSON.parse(trimmed);
          if (record.nonce && typeof record.expiresAtMs === "number" && record.expiresAtMs > now) {
            this._consumedNonces.set(record.nonce, record.expiresAtMs);
          }
        } catch {
          // ignore malformed lines
        }
      }
    } catch {
      // ignore read error
    }

    if (this._stateDirPath && fs.existsSync(this._stateDirPath)) {
      try {
        const files = fs.readdirSync(this._stateDirPath);
        for (const file of files) {
          if (!file.endsWith(".lock")) continue;
          const fp = path.join(this._stateDirPath, file);
          try {
            const data = JSON.parse(fs.readFileSync(fp, "utf8"));
            if (data.nonce && typeof data.expiresAtMs === "number") {
              if (data.expiresAtMs > now) {
                this._consumedNonces.set(data.nonce, data.expiresAtMs);
              } else {
                try { fs.unlinkSync(fp); } catch {}
              }
            }
          } catch {}
        }
      } catch {}
    }
  }

  has(nonce) {
    this._maybePrune();
    if (this._consumedNonces.has(nonce)) return true;
    const lockPath = this._lockPathFor(nonce);
    if (lockPath && fs.existsSync(lockPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(lockPath, "utf8"));
        if (Date.now() > data.expiresAtMs) {
          try { fs.unlinkSync(lockPath); } catch {}
          return false;
        }
        this._consumedNonces.set(nonce, data.expiresAtMs);
        return true;
      } catch {
        return true;
      }
    }
    return false;
  }

  consume(nonce, expiresAtMs) {
    if (!nonce || typeof nonce !== "string") {
      throw new Error("NONCE_REQUIRED");
    }
    this._maybePrune();

    const now = Date.now();
    if (now > expiresAtMs) {
      return false;
    }

    if (this._consumedNonces.has(nonce)) {
      return false;
    }

    const lockPath = this._lockPathFor(nonce);
    let fd = null;
    if (lockPath) {
      try {
        fd = fs.openSync(lockPath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_RDWR, 0o600);
      } catch (err) {
        if (err.code === "EEXIST") {
          this._consumedNonces.set(nonce, expiresAtMs);
          return false;
        }
        throw new Error(`LOCK_ACQUISITION_FAILED: ${err.message}`);
      }

      try {
        const record = {
          nonce,
          expiresAtMs,
          consumedAt: new Date(now).toISOString(),
          pid: process.pid
        };
        fs.writeFileSync(fd, JSON.stringify(record) + "\n", "utf8");
      } finally {
        try { fs.closeSync(fd); } catch {}
      }
    }

    if (this._consumedNonces.size >= this._maxEntries) {
      this.prune();
    }

    if (this._stateFilePath) {
      try {
        const dir = path.dirname(this._stateFilePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const entry = JSON.stringify({
          nonce,
          expiresAtMs,
          consumedAt: new Date(now).toISOString(),
          pid: process.pid
        }) + "\n";
        fs.appendFileSync(this._stateFilePath, entry, "utf8");
      } catch (err) {
        if (lockPath) {
          try { fs.unlinkSync(lockPath); } catch {}
        }
        throw new Error(`REPLAY_LEDGER_WRITE_FAILED: ${err.message}`);
      }
    }

    this._consumedNonces.set(nonce, expiresAtMs);
    return true;
  }

  prune() {
    const now = Date.now();
    let prunedCount = 0;
    for (const [nonce, expiresAtMs] of this._consumedNonces.entries()) {
      if (now > expiresAtMs) {
        this._consumedNonces.delete(nonce);
        prunedCount++;
        const lockPath = this._lockPathFor(nonce);
        if (lockPath && fs.existsSync(lockPath)) {
          try { fs.unlinkSync(lockPath); } catch {}
        }
      }
    }
    this._lastPrune = now;

    if (this._stateDirPath && fs.existsSync(this._stateDirPath)) {
      try {
        const files = fs.readdirSync(this._stateDirPath);
        for (const file of files) {
          if (!file.endsWith(".lock")) continue;
          const fp = path.join(this._stateDirPath, file);
          try {
            const data = JSON.parse(fs.readFileSync(fp, "utf8"));
            if (now > data.expiresAtMs) {
              fs.unlinkSync(fp);
            }
          } catch {}
        }
      } catch {}
    }

    if (prunedCount > 0 && this._stateFilePath && fs.existsSync(this._stateFilePath)) {
      try {
        const lines = [];
        for (const [nonce, expiresAtMs] of this._consumedNonces.entries()) {
          lines.push(JSON.stringify({ nonce, expiresAtMs, compactedAt: new Date().toISOString() }));
        }
        const tmpPath = this._stateFilePath + ".tmp." + Date.now();
        fs.writeFileSync(tmpPath, lines.join("\n") + (lines.length > 0 ? "\n" : ""), "utf8");
        fs.renameSync(tmpPath, this._stateFilePath);
      } catch {
      }
    }
  }

  _maybePrune() {
    if (Date.now() - this._lastPrune > this._pruneIntervalMs) {
      this.prune();
    }
  }

  get size() {
    return this._consumedNonces.size;
  }

  clear() {
    this._consumedNonces.clear();
    if (this._stateFilePath && fs.existsSync(this._stateFilePath)) {
      try {
        fs.unlinkSync(this._stateFilePath);
      } catch {
        // ignore
      }
    }
    if (this._stateDirPath && fs.existsSync(this._stateDirPath)) {
      try {
        const files = fs.readdirSync(this._stateDirPath);
        for (const file of files) {
          try { fs.unlinkSync(path.join(this._stateDirPath, file)); } catch {}
        }
        fs.rmdirSync(this._stateDirPath);
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Default process-wide singleton replay guard.
 * Guarantees that token replay is prevented across separate invocations and process restarts.
 */
export const DEFAULT_REPLAY_GUARD = new ConsentReplayGuard();

/**
 * Deterministic JSON stringifier (key-sorted).
 */
export function canonicalJson(obj) {
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalJson).join(",") + "]";
  }
  if (obj !== null && typeof obj === "object") {
    return "{" + Object.keys(obj).sort().map(k => JSON.stringify(k) + ":" + canonicalJson(obj[k])).join(",") + "}";
  }
  return JSON.stringify(obj);
}

/**
 * Extract canonical signed payload fields from a consent evidence token.
 */
export function canonicalConsentPayload(token) {
  return canonicalJson({
    schema: token.schema || "leeway.consent-evidence.v1",
    issuer: token.issuer,
    keyId: token.keyId,
    requestId: token.requestId,
    deviceId: token.deviceId,
    platform: token.platform,
    capability: token.capability,
    argsDigest: token.argsDigest,
    sessionNonce: token.sessionNonce,
    tokenNonce: token.tokenNonce,
    issuedAt: token.issuedAt,
    expiresAt: token.expiresAt
  });
}

/**
 * Compute SHA-256 digest of command arguments.
 */
export function computeArgsDigest(args = {}) {
  return createHash("sha256").update(canonicalJson(args)).digest("hex");
}

/**
 * Create a signed leeway.consent-evidence.v1 token.
 * Used exclusively by authorized Runtime Fabric carriers.
 */
export function createConsentEvidenceToken({
  issuer = "leeway.runtime.carrier.v1",
  keyId = "carrier-ed25519-key-001",
  privateKeyPem,
  requestId,
  deviceId,
  platform,
  capability,
  args = {},
  sessionNonce,
  tokenNonce,
  issuedAt = new Date().toISOString(),
  ttlMs = 120000
}) {
  if (!privateKeyPem) throw new Error("PRIVATE_KEY_REQUIRED");
  if (!requestId) throw new Error("REQUEST_ID_REQUIRED");
  if (!deviceId) throw new Error("DEVICE_ID_REQUIRED");
  if (!platform) throw new Error("PLATFORM_REQUIRED");
  if (!capability) throw new Error("CAPABILITY_REQUIRED");
  if (!sessionNonce) throw new Error("SESSION_NONCE_REQUIRED");
  if (!tokenNonce) throw new Error("TOKEN_NONCE_REQUIRED");

  const expiresAt = new Date(Date.parse(issuedAt) + ttlMs).toISOString();
  const argsDigest = computeArgsDigest(args);

  const unsignedToken = {
    schema: "leeway.consent-evidence.v1",
    issuer,
    keyId,
    requestId,
    deviceId,
    platform,
    capability,
    argsDigest,
    sessionNonce,
    tokenNonce,
    issuedAt,
    expiresAt
  };

  const payloadBytes = Buffer.from(canonicalConsentPayload(unsignedToken), "utf8");
  const signature = sign(null, payloadBytes, privateKeyPem).toString("base64");

  return {
    ...unsignedToken,
    signature
  };
}

export function getEnrolledRegistry() {
  try {
    return loadTrustedIssuerRegistry();
  } catch {
    return CANONICAL_TRUSTED_ISSUERS;
  }
}

/**
 * Verify a leeway.consent-evidence.v1 token against the Trusted Issuer Registry.
 *
 * @param {object} params
 * @param {object} params.consentEvidence - The consent token to verify
 * @param {string} params.expectedDeviceId - Expected target deviceId
 * @param {string} params.expectedPlatform - Expected target platform
 * @param {string} params.expectedCapability - Expected target capability
 * @param {string} [params.expectedArgsDigest] - Expected arguments digest
 * @param {object} [params.trustedIssuerRegistry] - Public key trust registry, defaults to enrolled registry
 * @param {ConsentReplayGuard|Set<string>} [params.replayGuard] - Persistent anti-replay state manager
 * @param {number} [params.maxAgeMs=120000] - Maximum token validity in ms
 * @returns {{ valid: boolean, issuer: string, keyId: string }}
 */
export function verifyConsentEvidence({
  consentEvidence,
  expectedDeviceId,
  expectedPlatform,
  expectedCapability,
  expectedArgsDigest,
  trustedIssuerRegistry = getEnrolledRegistry(),
  replayGuard = DEFAULT_REPLAY_GUARD,
  maxAgeMs = 120000
}) {
  if (!replayGuard) {
    throw new Error("REPLAY_GUARD_REQUIRED");
  }
  if (!consentEvidence || typeof consentEvidence !== "object") {
    throw new Error("CONSENT_EVIDENCE_MISSING");
  }

  if (consentEvidence.schema !== "leeway.consent-evidence.v1") {
    throw new Error("INVALID_CONSENT_SCHEMA");
  }

  // 1. Issuer Registry Validation
  const issuerRecord = trustedIssuerRegistry[consentEvidence.issuer];
  if (!issuerRecord) {
    throw new Error("UNTRUSTED_ISSUER");
  }

  if (consentEvidence.keyId !== issuerRecord.keyId) {
    throw new Error("UNTRUSTED_KEY_ID");
  }

  if (issuerRecord.status !== "ACTIVE") {
    throw new Error("ISSUER_KEY_INACTIVE");
  }

  const now = Date.now();
  if (issuerRecord.validUntil && now > Date.parse(issuerRecord.validUntil)) {
    throw new Error("ISSUER_KEY_EXPIRED");
  }

  // 2. Freshness and Expiry Validation
  const tokenExpiresAt = Date.parse(consentEvidence.expiresAt);
  const tokenIssuedAt = Date.parse(consentEvidence.issuedAt);

  if (isNaN(tokenExpiresAt) || isNaN(tokenIssuedAt)) {
    throw new Error("INVALID_TIMESTAMP_FORMAT");
  }

  if (now > tokenExpiresAt) {
    throw new Error("CONSENT_EXPIRED");
  }

  if (now - tokenIssuedAt > maxAgeMs) {
    throw new Error("CONSENT_STALE");
  }

  // 3. Anti-Replay: Token Nonce Check via Persistent Replay Guard
  const nonce = consentEvidence.tokenNonce;
  if (!nonce || typeof nonce !== "string" || nonce.length < 8) {
    throw new Error("INVALID_TOKEN_NONCE");
  }

  if (replayGuard instanceof Set) {
    if (replayGuard.has(nonce)) {
      throw new Error("TOKEN_NONCE_ALREADY_CONSUMED");
    }
  } else if (replayGuard && typeof replayGuard.has === "function") {
    if (replayGuard.has(nonce)) {
      throw new Error("TOKEN_NONCE_ALREADY_CONSUMED");
    }
  } else {
    throw new Error("REPLAY_GUARD_REQUIRED");
  }

  // 4. Target and Capability Binding
  if (consentEvidence.deviceId !== expectedDeviceId) {
    throw new Error("DEVICE_ID_MISMATCH");
  }

  if (consentEvidence.platform !== expectedPlatform) {
    throw new Error("PLATFORM_MISMATCH");
  }

  if (consentEvidence.capability !== expectedCapability) {
    throw new Error("CAPABILITY_MISMATCH");
  }

  if (expectedArgsDigest && consentEvidence.argsDigest !== expectedArgsDigest) {
    throw new Error("ARGS_DIGEST_MISMATCH");
  }

  // 5. Cryptographic Signature Verification
  if (!consentEvidence.signature || typeof consentEvidence.signature !== "string") {
    throw new Error("SIGNATURE_MISSING");
  }

  const canonicalBytes = Buffer.from(canonicalConsentPayload(consentEvidence), "utf8");
  let signatureValid = false;
  try {
    signatureValid = verify(
      null,
      canonicalBytes,
      issuerRecord.publicKeySpki,
      Buffer.from(consentEvidence.signature, "base64")
    );
  } catch (err) {
    throw new Error("SIGNATURE_VERIFICATION_ERROR: " + err.message);
  }

  if (!signatureValid) {
    throw new Error("INVALID_SIGNATURE");
  }

  // Consume token nonce in replay guard
  if (replayGuard instanceof Set) {
    replayGuard.add(nonce);
  } else if (replayGuard && typeof replayGuard.consume === "function") {
    const consumed = replayGuard.consume(nonce, tokenExpiresAt);
    if (!consumed) {
      throw new Error("TOKEN_NONCE_ALREADY_CONSUMED");
    }
  } else {
    throw new Error("REPLAY_GUARD_REQUIRED");
  }

  return {
    valid: true,
    issuer: issuerRecord.issuerId,
    keyId: issuerRecord.keyId,
    tokenNonce: nonce,
    sessionNonce: consentEvidence.sessionNonce
  };
}
