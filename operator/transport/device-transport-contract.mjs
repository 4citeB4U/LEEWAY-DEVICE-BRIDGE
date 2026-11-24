/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.TRANSPORT.CONTRACT
TAG: LEEWAY.DEVICE.TRANSPORT.AUTH_CONTRACT.V1
5WH:
WHAT = Canonical, portable authentication contract for the outbound device transport.
WHY  = The existing relay authenticates a device with one static shared token; the universal
       gateway needs an audience-scoped, device-bound, short-lived credential plus proof of
       possession, with no shared secret and no workstation assumption.
WHO  = LeeWay Industries; authenticated owner devices and the canonical managed gateway.
WHERE= operator/transport/device-transport-contract.mjs
WHEN = 2026-11-23
HOW  = Pure data contract: canonical transcript, portable platform vocabulary, error taxonomy.
AUTHORITY = Authentication contract only. It grants no execution, Formula, Veritas or receipt
       admission, and holds no private key material.
LICENSE = MIT
*/

import { createHash, randomBytes } from 'node:crypto';

export const TRANSPORT_HELLO_SCHEMA = 'leeway.device-transport.hello.v1';
export const TRANSPORT_CREDENTIAL_SCHEMA = 'leeway.device-transport.credential.v1';
export const TRANSPORT_PROTOCOL = 'LEEWAY_DEVICE_TRANSPORT_POP_WEBSOCKET_V1';

/** Logical platforms. A device must declare one explicitly; nothing is inferred from the
 *  process, the hostname or an OS probe, and there is no default. */
export const TRANSPORT_PLATFORMS = Object.freeze([
  'windows', 'linux', 'android', 'apple', 'freebsd', 'other',
]);

export const TRANSPORT_LIMITS = Object.freeze({
  maxDeviceIdLength: 128,
  maxOwnerSubjectLength: 256,
  maxKeyIdLength: 128,
  maxAudienceLength: 256,
  maxChallengeLength: 128,
  maxNonceLength: 128,
  /** A credential must be short-lived. Anything longer is refused, not clamped. */
  maxCredentialTtlMs: 15 * 60 * 1000,
  /** Server-issued challenge lifetime. */
  challengeTtlMs: 60 * 1000,
  /** Tolerated clock skew for issuedAt. */
  clockSkewMs: 5 * 1000,
});

export const TRANSPORT_DENIAL = Object.freeze({
  INVALID_INPUT: 'TRANSPORT_INPUT_INVALID',
  CREDENTIAL_SCHEMA: 'TRANSPORT_CREDENTIAL_SCHEMA_INVALID',
  CREDENTIAL_SIGNATURE: 'TRANSPORT_CREDENTIAL_SIGNATURE_INVALID',
  ISSUER_NOT_TRUSTED: 'TRANSPORT_ISSUER_NOT_TRUSTED',
  ISSUER_OWNER_MISMATCH: 'TRANSPORT_ISSUER_OWNER_MISMATCH',
  AUDIENCE_MISMATCH: 'TRANSPORT_AUDIENCE_MISMATCH',
  OWNER_MISMATCH: 'TRANSPORT_OWNER_MISMATCH',
  CREDENTIAL_EXPIRED: 'TRANSPORT_CREDENTIAL_EXPIRED',
  CREDENTIAL_TTL_EXCEEDED: 'TRANSPORT_CREDENTIAL_TTL_EXCEEDED',
  CHALLENGE_REQUIRED: 'TRANSPORT_CHALLENGE_REQUIRED',
  CHALLENGE_UNKNOWN: 'TRANSPORT_CHALLENGE_UNKNOWN',
  CHALLENGE_EXPIRED: 'TRANSPORT_CHALLENGE_EXPIRED',
  CHALLENGE_REPLAYED: 'TRANSPORT_CHALLENGE_REPLAYED',
  CHALLENGE_MISMATCH: 'TRANSPORT_CHALLENGE_MISMATCH',
  PROOF_SIGNATURE: 'TRANSPORT_PROOF_SIGNATURE_INVALID',
  DEVICE_UNKNOWN: 'TRANSPORT_DEVICE_UNKNOWN',
  DEVICE_UNVERIFIED: 'TRANSPORT_DEVICE_UNVERIFIED',
  DEVICE_REVOKED: 'TRANSPORT_DEVICE_REVOKED',
  REGISTRATION_MISMATCH: 'TRANSPORT_REGISTRATION_MISMATCH',
  HELLO_SCHEMA: 'TRANSPORT_HELLO_SCHEMA_INVALID',
  OPERATION_NOT_GRANTED: 'TRANSPORT_OPERATION_NOT_GRANTED',
  CONSENT_REQUIRED: 'TRANSPORT_CONSENT_REQUIRED',
  UNKNOWN_COMMAND: 'TRANSPORT_UNKNOWN_COMMAND',
  RESULT_MISMATCH: 'TRANSPORT_RESULT_MISMATCH',
  RESULT_TAMPERED: 'TRANSPORT_RESULT_TAMPERED',
  DEVICE_ID_SUBSTITUTION: 'TRANSPORT_DEVICE_ID_SUBSTITUTION',
});

const DEVICE_ID_GRAMMAR = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const CAPABILITY_GRAMMAR = /^[a-z][a-z0-9]*(?:[.-][a-z][a-z0-9]*)+$/;
const BASE64URL_GRAMMAR = /^[A-Za-z0-9_-]+$/;
const HEX_64_GRAMMAR = /^[a-f0-9]{64}$/i;

/** Typed denial. Callers switch on `.code`; no free-form message reaches a client. */
export class TransportDenied extends Error {
  constructor(code) {
    super(code);
    this.name = 'TransportDenied';
    this.code = code;
  }
}

export function deny(code) {
  throw new TransportDenied(code);
}

/** Deterministic JSON with sorted keys. Signatures cover exactly these bytes. */
export function canonicalize(value) {
  if (value === null || typeof value !== 'object') {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) deny(TRANSPORT_DENIAL.INVALID_INPUT);
    return serialized;
  }
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys.map(key => JSON.stringify(key) + ':' + canonicalize(value[key])).join(',') + '}';
}

function withoutSignature(document) {
  if (!document || typeof document !== 'object' || Array.isArray(document)) deny(TRANSPORT_DENIAL.INVALID_INPUT);
  const { signature: _ignored, ...body } = document;
  return body;
}

export function canonicalHelloTranscript(hello) {
  const { signature: _ignored, ...body } = withoutSignature(hello);
  return canonicalize(body);
}

export function canonicalCredentialPayload(credential) {
  return canonicalize(withoutSignature(credential));
}

export function sha256Hex(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function transportDigest(document) {
  return sha256Hex(canonicalize(document));
}

export function randomChallenge() {
  return randomBytes(24).toString('base64url');
}

export function isDeviceId(value) {
  return typeof value === 'string' && value.length <= TRANSPORT_LIMITS.maxDeviceIdLength &&
    DEVICE_ID_GRAMMAR.test(value);
}

export function isCapability(value) {
  return typeof value === 'string' && value.length <= 128 && CAPABILITY_GRAMMAR.test(value);
}

export function isPlatform(value) {
  return typeof value === 'string' && TRANSPORT_PLATFORMS.includes(value);
}

export function isOwnerSubject(value) {
  return typeof value === 'string' && value.trim().length > 0 &&
    value.length <= TRANSPORT_LIMITS.maxOwnerSubjectLength;
}

export function isBase64url(value, { min = 16, max = 512 } = {}) {
  return typeof value === 'string' && value.length >= min && value.length <= max &&
    BASE64URL_GRAMMAR.test(value);
}

export function isRegistryDigest(value) {
  return typeof value === 'string' && HEX_64_GRAMMAR.test(value);
}

/** Strict ISO-8601 instant to epoch milliseconds, or null. */
export function parseInstant(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 40) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** The exact fields a signed hello must carry. Extra fields are refused, not ignored. */
export const HELLO_FIELDS = Object.freeze([
  'schema', 'deviceId', 'platform', 'ownerSubject', 'audience', 'keyId',
  'registrationDigest', 'issuerId', 'challenge', 'nonce', 'issuedAt', 'expiresAt', 'signature',
]);

export const CREDENTIAL_FIELDS = Object.freeze([
  'schema', 'issuerId', 'keyId', 'deviceId', 'platform', 'ownerSubject', 'audience',
  'registrationDigest', 'devicePublicKeySpki', 'issuedAt', 'expiresAt', 'signature',
]);

/**
 * Refuse unknown or missing fields. A transport document is never extended by a
 * caller, so a new field cannot be smuggled past an older verifier.
 */
export function assertExactFields(document, allowed, denial) {
  if (!document || typeof document !== 'object' || Array.isArray(document)) deny(denial);
  const keys = Object.keys(document);
  if (keys.length !== allowed.length) deny(denial);
  for (const key of allowed) {
    if (!Object.hasOwn(document, key)) deny(denial);
  }
  for (const key of keys) {
    if (!allowed.includes(key)) deny(denial);
  }
}
