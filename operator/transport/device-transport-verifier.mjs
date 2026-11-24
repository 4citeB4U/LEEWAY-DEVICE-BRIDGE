/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.TRANSPORT.VERIFIER
TAG: LEEWAY.DEVICE.TRANSPORT.POP_V1
5WH:
WHAT = Gateway-side verification of a device transport credential and challenge-bound hello.
WHY  = Owner and device identity must be proven before any command is issued, without a shared
       static token and without trusting a device-supplied claim.
WHO  = Canonical managed gateway; owner-approved issuer authority.
WHERE= operator/transport/device-transport-verifier.mjs
WHEN = 2026-11-23
HOW  = Trusted-issuer signature over the short-lived credential, then device-key signature over a
       server-issued single-use challenge; registry binding, revocation, TTL and replay checks.
AUTHORITY = Authentication only. Verification never confers execution admission or registry authority.
LICENSE = MIT
*/

import { createPublicKey, verify as verifySignature } from 'node:crypto';
import {
  TRANSPORT_DENIAL, TRANSPORT_LIMITS,
  CREDENTIAL_FIELDS, HELLO_FIELDS,
  TRANSPORT_CREDENTIAL_SCHEMA, TRANSPORT_HELLO_SCHEMA,
  assertExactFields, canonicalCredentialPayload, canonicalHelloTranscript, deny,
  isBase64url, isCapability, isDeviceId, isOwnerSubject, isPlatform, isRegistryDigest,
  parseInstant, randomChallenge, sha256Hex,
} from './device-transport-contract.mjs';

/**
 * Single-use challenge issuer. A challenge is bound to nothing but itself and a short
 * lifetime: the hello that answers it must independently prove audience and owner.
 */
export function createChallengeIssuer({
  ttlMs = TRANSPORT_LIMITS.challengeTtlMs,
  now = Date.now,
  random = randomChallenge,
  maxPending = 4096,
} = {}) {
  if (!Number.isInteger(ttlMs) || ttlMs <= 0 || ttlMs > 5 * 60 * 1000) deny(TRANSPORT_DENIAL.INVALID_INPUT);
  const issued = new Map();
  const consumed = new Set();

  function sweep(at) {
    for (const [challenge, record] of issued) {
      if (record.expiresAt <= at) issued.delete(challenge);
    }
    if (consumed.size > 8192) consumed.clear();
  }

  return Object.freeze({
    issue() {
      const at = now();
      sweep(at);
      if (issued.size >= maxPending) deny(TRANSPORT_DENIAL.INVALID_INPUT);
      let challenge;
      do { challenge = random(); } while (issued.has(challenge));
      const record = Object.freeze({ challenge, issuedAt: at, expiresAt: at + ttlMs });
      issued.set(challenge, record);
      return record;
    },
    /** Consume exactly once. A previously consumed challenge reports a replay, not an
     *  unknown value, so an operator can distinguish an attack from a lost challenge. */
    consume(challenge) {
      const at = now();
      const record = issued.get(challenge);
      if (!record) {
        return consumed.has(challenge)
          ? TRANSPORT_DENIAL.CHALLENGE_REPLAYED
          : TRANSPORT_DENIAL.CHALLENGE_UNKNOWN;
      }
      issued.delete(challenge);
      consumed.add(challenge);
      if (record.expiresAt <= at) return TRANSPORT_DENIAL.CHALLENGE_EXPIRED;
      return null;
    },
    pendingCount() { return issued.size; },
  });
}

function verifyEd25519({ signature, spkiPem, bytes, denial }) {
  if (!isBase64url(signature, { min: 43, max: 172 })) deny(denial);
  let publicKey;
  try {
    publicKey = createPublicKey(spkiPem);
  } catch {
    deny(denial);
  }
  let valid = false;
  try {
    valid = verifySignature(null, Buffer.from(bytes, 'utf8'), publicKey,
      Buffer.from(signature, 'base64url'));
  } catch {
    valid = false;
  }
  if (valid !== true) deny(denial);
}

function issuerRecordFor(trustedIssuerRegistry, issuerId, keyId) {
  if (!trustedIssuerRegistry || typeof trustedIssuerRegistry !== 'object') {
    deny(TRANSPORT_DENIAL.ISSUER_NOT_TRUSTED);
  }
  const record = trustedIssuerRegistry[issuerId];
  if (!record || record.issuerId !== issuerId || record.keyId !== keyId) {
    deny(TRANSPORT_DENIAL.ISSUER_NOT_TRUSTED);
  }
  if (record.algorithm !== 'Ed25519' || record.status !== 'ACTIVE' ||
      typeof record.publicKeySpki !== 'string' || record.publicKeySpki.length === 0) {
    deny(TRANSPORT_DENIAL.ISSUER_NOT_TRUSTED);
  }
  return record;
}

/**
 * Verify the short-lived device transport credential against the existing trusted issuer
 * registry. The credential binds device id, platform, owner, audience and the device's
 * public key; it is NOT proof of possession on its own.
 */
export function verifyTransportCredential(credential, {
  trustedIssuerRegistry,
  expectedAudience,
  expectedOwnerSubject,
  now = Date.now(),
  maxTtlMs = TRANSPORT_LIMITS.maxCredentialTtlMs,
  clockSkewMs = TRANSPORT_LIMITS.clockSkewMs,
} = {}) {
  assertExactFields(credential, CREDENTIAL_FIELDS, TRANSPORT_DENIAL.CREDENTIAL_SCHEMA);
  if (credential.schema !== TRANSPORT_CREDENTIAL_SCHEMA) deny(TRANSPORT_DENIAL.CREDENTIAL_SCHEMA);
  if (!isDeviceId(credential.deviceId)) deny(TRANSPORT_DENIAL.CREDENTIAL_SCHEMA);
  if (!isPlatform(credential.platform)) deny(TRANSPORT_DENIAL.CREDENTIAL_SCHEMA);
  if (!isOwnerSubject(credential.ownerSubject)) deny(TRANSPORT_DENIAL.CREDENTIAL_SCHEMA);
  if (!isRegistryDigest(credential.registrationDigest)) deny(TRANSPORT_DENIAL.CREDENTIAL_SCHEMA);
  if (typeof credential.audience !== 'string' || credential.audience.length === 0 ||
      credential.audience.length > TRANSPORT_LIMITS.maxAudienceLength) {
    deny(TRANSPORT_DENIAL.CREDENTIAL_SCHEMA);
  }
  if (typeof credential.devicePublicKeySpki !== 'string' || credential.devicePublicKeySpki.length > 4096) {
    deny(TRANSPORT_DENIAL.CREDENTIAL_SCHEMA);
  }

  // Audience is exact and mandatory: a credential minted for one gateway is unusable on another.
  if (typeof expectedAudience !== 'string' || expectedAudience.length === 0 ||
      credential.audience !== expectedAudience) {
    deny(TRANSPORT_DENIAL.AUDIENCE_MISMATCH);
  }
  // Owner is exact and mandatory: no default owner and no "first enrolled" fallback.
  if (typeof expectedOwnerSubject !== 'string' || expectedOwnerSubject.length === 0 ||
      credential.ownerSubject !== expectedOwnerSubject) {
    deny(TRANSPORT_DENIAL.OWNER_MISMATCH);
  }

  const issuer = issuerRecordFor(trustedIssuerRegistry, credential.issuerId, credential.keyId);
  if (issuer.ownerSubject !== undefined && issuer.ownerSubject !== credential.ownerSubject) {
    deny(TRANSPORT_DENIAL.ISSUER_OWNER_MISMATCH);
  }

  const issuedAt = parseInstant(credential.issuedAt);
  const expiresAt = parseInstant(credential.expiresAt);
  if (issuedAt === null || expiresAt === null) deny(TRANSPORT_DENIAL.CREDENTIAL_SCHEMA);
  if (expiresAt <= issuedAt) deny(TRANSPORT_DENIAL.CREDENTIAL_SCHEMA);
  if (expiresAt - issuedAt > maxTtlMs) deny(TRANSPORT_DENIAL.CREDENTIAL_TTL_EXCEEDED);
  if (issuedAt - now > clockSkewMs) deny(TRANSPORT_DENIAL.CREDENTIAL_SCHEMA);
  if (expiresAt <= now) deny(TRANSPORT_DENIAL.CREDENTIAL_EXPIRED);

  verifyEd25519({
    signature: credential.signature,
    spkiPem: issuer.publicKeySpki,
    bytes: canonicalCredentialPayload(credential),
    denial: TRANSPORT_DENIAL.CREDENTIAL_SIGNATURE,
  });

  return Object.freeze({
    deviceId: credential.deviceId,
    platform: credential.platform,
    ownerSubject: credential.ownerSubject,
    issuerId: credential.issuerId,
    keyId: credential.keyId,
    audience: credential.audience,
    registrationDigest: credential.registrationDigest,
    devicePublicKeySpki: credential.devicePublicKeySpki,
    issuedAt: new Date(issuedAt).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
    credentialDigest: sha256Hex(canonicalCredentialPayload(credential)),
  });
}

function registryEntryFor(trustedDeviceRegistry, deviceId) {
  if (trustedDeviceRegistry instanceof Map) {
    const record = trustedDeviceRegistry.get(deviceId);
    return record ? [deviceId, record] : null;
  }
  if (Array.isArray(trustedDeviceRegistry)) {
    const record = trustedDeviceRegistry.find(entry => (entry?.id ?? entry?.deviceId) === deviceId);
    return record ? [deviceId, record] : null;
  }
  return null;
}

/**
 * Verify a challenge-bound hello. Returns a frozen session that later command and result
 * steps must reference; it carries no capability grant and no admission.
 */
export function verifyDeviceHello(hello, {
  verifiedCredential,
  challengeIssuer,
  trustedDeviceRegistry,
  expectedAudience,
  expectedOwnerSubject,
  expectedDeviceId = null,
  revokedDeviceIds = [],
  now = Date.now(),
  clockSkewMs = TRANSPORT_LIMITS.clockSkewMs,
  maxTtlMs = TRANSPORT_LIMITS.maxCredentialTtlMs,
} = {}) {
  assertExactFields(hello, HELLO_FIELDS, TRANSPORT_DENIAL.HELLO_SCHEMA);
  if (hello.schema !== TRANSPORT_HELLO_SCHEMA) deny(TRANSPORT_DENIAL.HELLO_SCHEMA);
  if (!isDeviceId(hello.deviceId)) deny(TRANSPORT_DENIAL.HELLO_SCHEMA);
  if (!isPlatform(hello.platform)) deny(TRANSPORT_DENIAL.HELLO_SCHEMA);
  if (!isOwnerSubject(hello.ownerSubject)) deny(TRANSPORT_DENIAL.HELLO_SCHEMA);
  if (!isRegistryDigest(hello.registrationDigest)) deny(TRANSPORT_DENIAL.HELLO_SCHEMA);
  if (typeof hello.keyId !== 'string' || hello.keyId.length === 0 || hello.keyId.length > 128) {
    deny(TRANSPORT_DENIAL.HELLO_SCHEMA);
  }
  if (!isBase64url(hello.challenge, { min: 16, max: TRANSPORT_LIMITS.maxChallengeLength })) {
    deny(TRANSPORT_DENIAL.CHALLENGE_REQUIRED);
  }
  if (!isBase64url(hello.nonce, { min: 16, max: TRANSPORT_LIMITS.maxNonceLength })) {
    deny(TRANSPORT_DENIAL.HELLO_SCHEMA);
  }
  if (typeof hello.audience !== 'string' || hello.audience !== expectedAudience) {
    deny(TRANSPORT_DENIAL.AUDIENCE_MISMATCH);
  }
  if (typeof hello.ownerSubject !== 'string' || hello.ownerSubject !== expectedOwnerSubject) {
    deny(TRANSPORT_DENIAL.OWNER_MISMATCH);
  }

  // The hello must describe exactly the device the credential was minted for.
  if (!verifiedCredential || typeof verifiedCredential !== 'object' ||
      typeof verifiedCredential.devicePublicKeySpki !== 'string' ||
      verifiedCredential.devicePublicKeySpki.length === 0) {
    deny(TRANSPORT_DENIAL.CREDENTIAL_SCHEMA);
  }
  if (hello.deviceId !== verifiedCredential.deviceId) {
    deny(TRANSPORT_DENIAL.DEVICE_ID_SUBSTITUTION);
  }
  if (hello.platform !== verifiedCredential.platform ||
      hello.registrationDigest !== verifiedCredential.registrationDigest ||
      hello.audience !== verifiedCredential.audience ||
      hello.ownerSubject !== verifiedCredential.ownerSubject) {
    deny(TRANSPORT_DENIAL.REGISTRATION_MISMATCH);
  }
  if (expectedDeviceId !== null && hello.deviceId !== expectedDeviceId) {
    deny(TRANSPORT_DENIAL.DEVICE_ID_SUBSTITUTION);
  }

  const issuedAt = parseInstant(hello.issuedAt);
  const expiresAt = parseInstant(hello.expiresAt);
  if (issuedAt === null || expiresAt === null) deny(TRANSPORT_DENIAL.HELLO_SCHEMA);
  if (expiresAt - issuedAt > maxTtlMs) deny(TRANSPORT_DENIAL.CREDENTIAL_TTL_EXCEEDED);
  if (issuedAt - now > clockSkewMs) deny(TRANSPORT_DENIAL.HELLO_SCHEMA);
  if (expiresAt <= now) deny(TRANSPORT_DENIAL.CREDENTIAL_EXPIRED);

  // Registry authority: enrollment must already exist and be identity-verified.
  const entry = registryEntryFor(trustedDeviceRegistry, hello.deviceId);
  if (!entry) deny(TRANSPORT_DENIAL.DEVICE_UNKNOWN);
  const [, record] = entry;
  if (Array.isArray(revokedDeviceIds) && revokedDeviceIds.includes(hello.deviceId)) {
    deny(TRANSPORT_DENIAL.DEVICE_REVOKED);
  }
  if (!record || record.identityVerified !== true) deny(TRANSPORT_DENIAL.DEVICE_UNVERIFIED);
  if (typeof record.ownerSubject !== 'string' || record.ownerSubject !== hello.ownerSubject) {
    deny(TRANSPORT_DENIAL.OWNER_MISMATCH);
  }
  if (!isRegistryDigest(record.passportSha256) || record.passportSha256 !== hello.registrationDigest) {
    deny(TRANSPORT_DENIAL.REGISTRATION_MISMATCH);
  }
  if (typeof record.platform === 'string' && record.platform.trim().length > 0 &&
      record.platform !== hello.platform) {
    deny(TRANSPORT_DENIAL.REGISTRATION_MISMATCH);
  }

  if (!challengeIssuer || typeof challengeIssuer.consume !== 'function') {
    deny(TRANSPORT_DENIAL.CHALLENGE_REQUIRED);
  }

  return Object.freeze({
    deviceId: hello.deviceId,
    platform: hello.platform,
    ownerSubject: hello.ownerSubject,
    audience: hello.audience,
    keyId: hello.keyId,
    registrationDigest: hello.registrationDigest,
    nonce: hello.nonce,
    challenge: hello.challenge,
    devicePublicKeySpki: verifiedCredential.devicePublicKeySpki,
    credentialDigest: verifiedCredential.credentialDigest,
    issuedAt: new Date(issuedAt).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
  });
}

/**
 * Verify the hello signature (device key possession) and then burn the challenge exactly
 * once. Split from verifyDeviceHello so the caller can perform cheap denials first, and so
 * a forged signature never consumes a legitimate challenge.
 */
export function verifyHelloProof(hello, session, { challengeIssuer, now = Date.now() } = {}) {
  if (!session || session.deviceId !== hello.deviceId) deny(TRANSPORT_DENIAL.DEVICE_ID_SUBSTITUTION);
  if (session.challenge !== hello.challenge) deny(TRANSPORT_DENIAL.CHALLENGE_MISMATCH);

  verifyEd25519({
    signature: hello.signature,
    spkiPem: session.devicePublicKeySpki,
    bytes: canonicalHelloTranscript(hello),
    denial: TRANSPORT_DENIAL.PROOF_SIGNATURE,
  });

  const denial = challengeIssuer.consume(hello.challenge);
  if (denial) deny(denial);

  return Object.freeze({ ...session, verifiedAt: new Date(now).toISOString() });
}

export function isGrantedCapability(capability) {
  return isCapability(capability);
}
