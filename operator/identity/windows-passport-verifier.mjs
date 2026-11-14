/*
REGION: LeeWay Windows Device Passport & Hardware Authority Verifier
TAG: LEEWAY-WINDOWS-PASSPORT-VERIFIER
WHO: Agent Lee / authorized LeeWay runtimes
WHAT: Cryptographic verification, owner binding, and registration derivation for Windows device passports (pc-primary and authorized workstations).
WHEN: During device admission, registration discovery, and C3 boundary qualification.
WHERE: 4citeB4U/LEEWAY-DEVICE-BRIDGE/operator/identity
WHY: Enforce genuine platform identity and owner-authorized hardware admission without synthetic TRUSTED flags or second control planes.
HOW: Validates hardware attributes -> enforces owner binding (4citeB4U) -> validates TTL & anti-replay -> cryptographically verifies Ed25519 signature against trusted carrier registry.
LICENSE: MIT
*/
import { verify, sign, createHash } from "node:crypto";
import { getEnrolledRegistry, DEFAULT_REPLAY_GUARD } from "../trusted-issuer-registry.mjs";

export const CANONICAL_OWNER_ID = "4citeB4U";
export const CANONICAL_WINDOWS_PASSPORT_SCHEMA = "1.0.0";

/**
 * Deterministic canonical JSON representation (key-sorted).
 */
export function canonicalWindowsPassportPayload(passport) {
  function canonicalize(v) {
    if (v === null || typeof v !== "object") return JSON.stringify(v);
    if (Array.isArray(v)) return "[" + v.map(canonicalize).join(",") + "]";
    const keys = Object.keys(v).sort();
    return "{" + keys.map(k => JSON.stringify(k) + ":" + canonicalize(v[k])).join(",") + "}";
  }

  // Omit signature for signing payload
  const { signature: _sig, ...body } = passport;
  return canonicalize(body);
}

/**
 * Create a signed Windows Device Passport.
 * Bound to exact platform, architecture, hardwareUid, and owner.
 */
export function createSignedWindowsPassport({
  privateKeyPem,
  deviceId = "pc-primary",
  platform = "windows",
  manufacturer = "LeeWay Industries",
  model = "PC-Workstation-Primary",
  device = "pc-primary",
  product = "LeeWay Workstation",
  architecture = "x64",
  osVersion = "10.0.26100",
  hostname = "LEEWAY-PC-PRIMARY",
  hardwareUid,
  ownerId = CANONICAL_OWNER_ID,
  ownerName = "The Creator",
  sessionNonce,
  tokenNonce,
  issuedAt = new Date().toISOString(),
  ttlMs = 120000,
  issuer = "leeway.runtime.carrier.v1",
  keyId = "carrier-ed25519-key-001"
}) {
  if (!privateKeyPem) throw new Error("PRIVATE_KEY_REQUIRED");
  if (!deviceId) throw new Error("DEVICE_ID_REQUIRED");
  if (!hardwareUid) throw new Error("HARDWARE_UID_REQUIRED");
  if (!sessionNonce) throw new Error("SESSION_NONCE_REQUIRED");
  if (!tokenNonce) throw new Error("TOKEN_NONCE_REQUIRED");

  const expiresAt = new Date(Date.parse(issuedAt) + ttlMs).toISOString();

  const unsignedPassport = {
    schemaVersion: CANONICAL_WINDOWS_PASSPORT_SCHEMA,
    authority: "NATIVE_WINDOWS_OBSERVED",
    deviceId,
    platform,
    manufacturer,
    model,
    device,
    product,
    architecture,
    osVersion,
    hostname,
    hardwareUid,
    owner: {
      ownerId,
      ownerName
    },
    sessionNonce,
    tokenNonce,
    issuedAt,
    expiresAt,
    issuer,
    keyId
  };

  const payloadBytes = Buffer.from(canonicalWindowsPassportPayload(unsignedPassport), "utf8");
  const signature = sign(null, payloadBytes, privateKeyPem).toString("base64");

  return {
    ...unsignedPassport,
    signature
  };
}

/**
 * Verify a Windows Device Passport and derive an admitted runtime registry record.
 *
 * @param {object} passport
 * @param {object} [options]
 * @param {string} [options.expectedDeviceId]
 * @param {string} [options.expectedOwnerId=CANONICAL_OWNER_ID]
 * @param {object} [options.trustedIssuerRegistry]
 * @param {ConsentReplayGuard|object} [options.replayGuard=DEFAULT_REPLAY_GUARD]
 * @param {number} [options.clockToleranceMs=60000]
 * @returns {{ valid: boolean, record?: object, error?: string }}
 */
export function verifyWindowsPassport(passport, {
  expectedDeviceId = null,
  expectedOwnerId = CANONICAL_OWNER_ID,
  trustedIssuerRegistry = getEnrolledRegistry(),
  replayGuard = DEFAULT_REPLAY_GUARD,
  clockToleranceMs = 60000
} = {}) {
  if (!passport || typeof passport !== "object") {
    return { valid: false, error: "INVALID_PASSPORT_OBJECT" };
  }

  // 1. Schema version and authority
  if (passport.schemaVersion !== CANONICAL_WINDOWS_PASSPORT_SCHEMA) {
    return { valid: false, error: "UNSUPPORTED_SCHEMA_VERSION" };
  }
  if (!["NATIVE_WINDOWS_OBSERVED", "VERIFIED_DEVICE_PASSPORT"].includes(passport.authority)) {
    return { valid: false, error: "INVALID_AUTHORITY" };
  }

  // 2. Platform verification: must be windows or win32
  if (!["windows", "win32"].includes(passport.platform)) {
    return { valid: false, error: "PLATFORM_MISMATCH" };
  }

  // 3. Hardware identifiers
  if (!passport.deviceId || typeof passport.deviceId !== "string") {
    return { valid: false, error: "DEVICE_ID_REQUIRED" };
  }
  if (expectedDeviceId && passport.deviceId !== expectedDeviceId) {
    return { valid: false, error: "DEVICE_ID_MISMATCH" };
  }
  if (!passport.hardwareUid || typeof passport.hardwareUid !== "string" || passport.hardwareUid.trim().length === 0) {
    return { valid: false, error: "HARDWARE_IDENTITY_REQUIRED" };
  }
  if (!passport.architecture || !["x64", "arm64", "ia32"].includes(passport.architecture)) {
    return { valid: false, error: "INVALID_ARCHITECTURE" };
  }

  // 4. Owner binding
  const ownerId = passport.owner?.ownerId;
  if (!ownerId || typeof ownerId !== "string") {
    return { valid: false, error: "OWNER_REQUIRED" };
  }
  if (expectedOwnerId && ownerId !== expectedOwnerId) {
    return { valid: false, error: "OWNER_MISMATCH" };
  }

  // 5. Freshness and Expiration
  const now = Date.now();
  const issuedAt = Date.parse(passport.issuedAt);
  const expiresAt = Date.parse(passport.expiresAt);

  if (Number.isNaN(issuedAt) || Number.isNaN(expiresAt)) {
    return { valid: false, error: "INVALID_TIMESTAMPS" };
  }
  if (issuedAt > expiresAt) {
    return { valid: false, error: "INVALID_LIFESPAN" };
  }
  if (now > expiresAt + clockToleranceMs) {
    return { valid: false, error: "PASSPORT_EXPIRED" };
  }
  if (issuedAt > now + clockToleranceMs) {
    return { valid: false, error: "PASSPORT_NOT_YET_VALID" };
  }

  // 6. Check anti-replay state before crypto work, but do not consume the
  // nonce until the passport has passed signature verification. An attacker
  // must not be able to burn a valid passport's nonce with a forged signature.
  const nonce = passport.tokenNonce;
  if (!nonce || typeof nonce !== "string" || nonce.trim().length === 0) {
    return { valid: false, error: "TOKEN_NONCE_REQUIRED" };
  }
  if (replayGuard) {
    if (typeof replayGuard.has === "function" && replayGuard.has(nonce)) {
      return { valid: false, error: "NONCE_REPLAYED" };
    }
  }

  // 7. Cryptographic signature verification
  const issuerId = passport.issuer;
  if (!issuerId || !trustedIssuerRegistry?.[issuerId]) {
    return { valid: false, error: "UNTRUSTED_ISSUER" };
  }
  const issuerRecord = trustedIssuerRegistry[issuerId];
  if (issuerRecord.status !== "ACTIVE") {
    return { valid: false, error: "ISSUER_INACTIVE" };
  }
  if (Date.now() > Date.parse(issuerRecord.validUntil)) {
    return { valid: false, error: "ISSUER_KEY_EXPIRED" };
  }

  const signature = passport.signature;
  if (!signature || typeof signature !== "string") {
    return { valid: false, error: "SIGNATURE_REQUIRED" };
  }

  try {
    const payloadBytes = Buffer.from(canonicalWindowsPassportPayload(passport), "utf8");
    const sigBytes = Buffer.from(signature, "base64");
    const verified = verify(null, payloadBytes, issuerRecord.publicKeySpki, sigBytes);
    if (!verified) {
      return { valid: false, error: "SIGNATURE_INVALID" };
    }
  } catch {
    return { valid: false, error: "SIGNATURE_INVALID" };
  }

  // 8. Commit nonce consumption only after all cryptographic checks passed.
  if (replayGuard) {
    if (typeof replayGuard.consume === "function") {
      try {
        const consumed = replayGuard.consume(nonce, expiresAt);
        if (!consumed) return { valid: false, error: "NONCE_REPLAYED" };
      } catch (err) {
        return { valid: false, error: `REPLAY_CHECK_FAILED: ${err.message}` };
      }
    } else if (typeof replayGuard.add === "function") {
      replayGuard.add(nonce);
    }
  }

  // 9. Derive trusted registration record
  const passportSha256 = createHash("sha256")
    .update(canonicalWindowsPassportPayload(passport))
    .digest("hex");

  const record = {
    id: passport.deviceId,
    deviceId: passport.deviceId,
    platform: "windows",
    identityVerified: true,
    registrationState: "TRUSTED_REGISTRY_READ",
    identitySource: "WINDOWS_CIM_READONLY",
    passportAuthority: "OWNER_SIGNED_WINDOWS_PASSPORT",
    ownerSubject: ownerId,
    ownerId,
    ownerName: passport.owner?.ownerName ?? null,
    trustStatus: "TRUSTED",
    hardwareUid: passport.hardwareUid,
    architecture: passport.architecture,
    osVersion: passport.osVersion,
    hostname: passport.hostname,
    registrationAuthority: "TRUSTED_RUNTIME_DEVICE_REGISTRY",
    passportSha256,
    verifiedAt: new Date().toISOString()
  };

  return {
    valid: true,
    record
  };
}

/**
 * Helper to populate or update a deviceRegistry Map or Array with a verified Windows passport.
 */
export function registerVerifiedWindowsDevice(deviceRegistry, passport, options = {}) {
  const result = verifyWindowsPassport(passport, options);
  if (!result.valid) {
    throw new Error(`WINDOWS_DEVICE_REGISTRATION_FAILED: ${result.error}`);
  }
  if (deviceRegistry instanceof Map) {
    deviceRegistry.set(result.record.id, result.record);
  } else if (Array.isArray(deviceRegistry)) {
    const existingIndex = deviceRegistry.findIndex(d => (d?.id ?? d?.deviceId) === result.record.id);
    if (existingIndex >= 0) {
      deviceRegistry[existingIndex] = result.record;
    } else {
      deviceRegistry.push(result.record);
    }
  } else {
    throw new Error("DEVICE_REGISTRY_MAP_OR_ARRAY_REQUIRED");
  }
  return result.record;
}
