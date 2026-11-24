/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.TRANSPORT.GATEWAY
TAG: LEEWAY.DEVICE.TRANSPORT.CORRELATED_ADMISSION.V1
5WH:
WHAT = Per-device correlated command issuance and result acceptance for the authenticated transport.
WHY  = Every request and response must bind to one verified device, one grant and one command id,
       and an altered or substituted result must be refused.
WHO  = Canonical managed gateway.
WHERE= operator/transport/device-transport-gateway.mjs
WHEN = 2026-11-23
HOW  = Grant + consent gate per operation, command id correlation, request/result digests.
AUTHORITY = Admission bookkeeping for transport only. Formula, Veritas, Receipt Authority and C3
       remain the execution gates and are never replaced here.
LICENSE = MIT
*/

import { randomUUID, timingSafeEqual } from 'node:crypto';
import {
  TRANSPORT_DENIAL, canonicalize, deny, isCapability, isDeviceId, parseInstant, sha256Hex,
} from './device-transport-contract.mjs';

const MAX_PENDING = 256;
const MAX_COMPLETED = 256;

function digestEquals(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Create the per-connection correlation state for one verified device session.
 * Nothing here is shared between devices: a command id belongs to one device only.
 */
export function createTransportCorrelation(session) {
  if (!session || !isDeviceId(session.deviceId)) deny(TRANSPORT_DENIAL.INVALID_INPUT);
  const pending = new Map();
  const completed = new Set();
  return Object.freeze({
    deviceId: session.deviceId,
    ownerSubject: session.ownerSubject,
    audience: session.audience,
    pending,
    completed,
    pendingCount: () => pending.size,
  });
}

function grantSet(grants) {
  if (grants instanceof Set) return new Set(grants);
  if (Array.isArray(grants)) return new Set(grants);
  if (grants && typeof grants === 'object') {
    return new Set(Object.entries(grants).filter(([, value]) => value === true).map(([key]) => key));
  }
  return new Set();
}

function requireConsent({ consent, deviceId, ownerSubject, capability, now }) {
  if (!consent || typeof consent !== 'object' || Array.isArray(consent)) {
    deny(TRANSPORT_DENIAL.CONSENT_REQUIRED);
  }
  if (consent.granted !== true) deny(TRANSPORT_DENIAL.CONSENT_REQUIRED);
  if (consent.deviceId !== deviceId) deny(TRANSPORT_DENIAL.DEVICE_ID_SUBSTITUTION);
  if (consent.capability !== capability) deny(TRANSPORT_DENIAL.OPERATION_NOT_GRANTED);
  const expiresAt = parseInstant(consent.expiresAt);
  if (expiresAt === null || expiresAt <= now) deny(TRANSPORT_DENIAL.CONSENT_REQUIRED);
  if (typeof consent.ownerSubject !== 'string' || consent.ownerSubject !== ownerSubject) {
    deny(TRANSPORT_DENIAL.OWNER_MISMATCH);
  }
}

/**
 * Issue one correlated command. Refuses an unenrolled target, an ungranted capability, a
 * missing or expired consent, and a device-id substitution attempt.
 */
export function issueCommand({ correlation, capability, arguments: args = {}, grants, consent, targetDeviceId = null, now = Date.now() } = {}) {
  if (!correlation || typeof correlation.deviceId !== 'string') deny(TRANSPORT_DENIAL.INVALID_INPUT);
  if (!isCapability(capability)) deny(TRANSPORT_DENIAL.INVALID_INPUT);
  if (args === null || typeof args !== 'object' || Array.isArray(args)) deny(TRANSPORT_DENIAL.INVALID_INPUT);
  // Never silently retarget the device the session proved.
  if (targetDeviceId !== null && targetDeviceId !== correlation.deviceId) {
    deny(TRANSPORT_DENIAL.DEVICE_ID_SUBSTITUTION);
  }
  if (typeof args.deviceId === 'string' && args.deviceId !== correlation.deviceId) {
    deny(TRANSPORT_DENIAL.DEVICE_ID_SUBSTITUTION);
  }
  if (!grantSet(grants).has(capability)) deny(TRANSPORT_DENIAL.OPERATION_NOT_GRANTED);

  requireConsent({
    consent,
    deviceId: correlation.deviceId,
    ownerSubject: correlation.ownerSubject,
    capability,
    now,
  });

  if (correlation.pending.size >= MAX_PENDING) deny(TRANSPORT_DENIAL.INVALID_INPUT);

  const commandId = randomUUID();
  const requestDigest = sha256Hex(canonicalize({
    deviceId: correlation.deviceId,
    commandId,
    capability,
    arguments: args,
  }));
  correlation.pending.set(commandId, Object.freeze({
    commandId, deviceId: correlation.deviceId, capability, requestDigest, issuedAt: now,
  }));
  return Object.freeze({ commandId, deviceId: correlation.deviceId, capability, requestDigest });
}

/**
 * Accept a device result only when it answers an outstanding command for this exact device,
 * with an intact result digest. An altered payload is refused rather than repaired.
 */
export function acceptDeviceResult({ correlation, message, now = Date.now() } = {}) {
  if (!correlation || typeof correlation.deviceId !== 'string') deny(TRANSPORT_DENIAL.INVALID_INPUT);
  if (!message || typeof message !== 'object' || Array.isArray(message)) deny(TRANSPORT_DENIAL.INVALID_INPUT);
  if (message.type !== 'result') deny(TRANSPORT_DENIAL.INVALID_INPUT);

  const commandId = typeof message.commandId === 'string' ? message.commandId : null;
  if (commandId === null || commandId.length === 0 || commandId.length > 128) {
    deny(TRANSPORT_DENIAL.UNKNOWN_COMMAND);
  }
  // The responding device must be the device the command was issued to.
  if (typeof message.deviceId === 'string' && message.deviceId !== correlation.deviceId) {
    deny(TRANSPORT_DENIAL.DEVICE_ID_SUBSTITUTION);
  }
  const pending = correlation.pending.get(commandId);
  if (!pending) {
    deny(correlation.completed.has(commandId)
      ? TRANSPORT_DENIAL.CHALLENGE_REPLAYED
      : TRANSPORT_DENIAL.UNKNOWN_COMMAND);
  }
  if (pending.deviceId !== correlation.deviceId) deny(TRANSPORT_DENIAL.DEVICE_ID_SUBSTITUTION);
  if (message.capability !== pending.capability) deny(TRANSPORT_DENIAL.RESULT_MISMATCH);

  const expected = sha256Hex(canonicalize({
    deviceId: correlation.deviceId,
    commandId,
    capability: pending.capability,
    ok: message.ok === true,
    result: message.ok === true ? (message.result ?? null) : (message.error ?? null),
  }));
  if (!digestEquals(message.resultDigest, expected)) deny(TRANSPORT_DENIAL.RESULT_TAMPERED);

  correlation.pending.delete(commandId);
  correlation.completed.add(commandId);
  if (correlation.completed.size > MAX_COMPLETED) {
    correlation.completed.delete(correlation.completed.values().next().value);
  }

  return Object.freeze({
    commandId,
    deviceId: correlation.deviceId,
    capability: pending.capability,
    ok: message.ok === true,
    result: message.ok === true ? (message.result ?? null) : null,
    error: message.ok === true ? null : (message.error ?? 'REMOTE_COMMAND_FAILED'),
    requestDigest: pending.requestDigest,
    resultDigest: message.resultDigest,
    acceptedAt: new Date(now).toISOString(),
  });
}

/** Digest a device result so the gateway can detect any post-execution alteration. */
export function deviceResultDigest({ deviceId, commandId, capability, ok, result, error }) {
  return sha256Hex(canonicalize({
    deviceId, commandId, capability, ok: ok === true,
    result: ok === true ? (result ?? null) : (error ?? null),
  }));
}

/** Fail closed when the device reports it cannot serve: the gateway must not invent a result. */
export function offlineDeviceResult({ deviceId, commandId, capability }) {
  if (!isDeviceId(deviceId)) deny(TRANSPORT_DENIAL.INVALID_INPUT);
  return Object.freeze({
    deviceId, commandId, capability, ok: false, error: 'DEVICE_OFFLINE',
  });
}
