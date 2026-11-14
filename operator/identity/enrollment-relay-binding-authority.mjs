/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY
TAG: LEEWAY.ENROLLMENT.RELAY.BINDING.AUTHORITY.V1
WHAT: Primary-host enrollment authority coordinator.
WHY: A portable device needs one authenticated, owner-bound admission path;
     it must not inherit trust from a hostname, pre-edited registry, or relay.
HOW: Inject pending-state, proof, approval, registry, signer, and receipt
     authorities. This module owns none of those roots and fails closed.
*/

import { createHash } from 'node:crypto';
import { receiptPayloadSha256 } from './receipt-authority-client.mjs';

const PLATFORMS = new Set(['windows', 'macos', 'linux', 'android', 'ios', 'ipados']);
const DEVICE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const THUMBPRINT = /^[A-Za-z0-9_-]{16,256}$/;
const SHA256 = /^[a-f0-9]{64}$/i;
const COMPACT_JWS = /^[A-Za-z0-9_-]{16,2048}\.[A-Za-z0-9_-]{16,4096}\.[A-Za-z0-9_-]{16,1024}$/;

function requireMethod(value, method, code) {
  if (!value || typeof value[method] !== 'function') throw new Error(code);
}

function requiredText(value, code) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(code);
  return value.trim();
}

function normalizeCapabilities(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 256 ||
      value.some(capability => typeof capability !== 'string' || !/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(capability))) {
    throw new Error('ENROLLMENT_CAPABILITIES_INVALID');
  }
  return [...new Set(value)].sort();
}

function normalizeStart(input) {
  const ownerSubject = requiredText(input?.ownerSubject, 'ENROLLMENT_OWNER_SUBJECT_REQUIRED');
  const platform = requiredText(input?.platform, 'ENROLLMENT_PLATFORM_REQUIRED').toLowerCase();
  if (!PLATFORMS.has(platform)) throw new Error('ENROLLMENT_PLATFORM_UNSUPPORTED');
  if (!input?.devicePublicJwk || typeof input.devicePublicJwk !== 'object' || Array.isArray(input.devicePublicJwk)) {
    throw new Error('ENROLLMENT_DEVICE_KEY_REQUIRED');
  }
  const deviceKeyThumbprint = requiredText(input.deviceKeyThumbprint, 'ENROLLMENT_DEVICE_KEY_THUMBPRINT_REQUIRED');
  if (!THUMBPRINT.test(deviceKeyThumbprint)) throw new Error('ENROLLMENT_DEVICE_KEY_THUMBPRINT_INVALID');
  return Object.freeze({
    ownerSubject, platform, devicePublicJwk: Object.freeze({ ...input.devicePublicJwk }), deviceKeyThumbprint,
    requestedCapabilities: Object.freeze(normalizeCapabilities(input.requestedCapabilities)),
    packageIdentity: Object.freeze({ ...input.packageIdentity }),
  });
}

function normalizeRelayPolicy(value, pending, deviceRecord) {
  if (!value || typeof value !== 'object' || value.schema !== 'leeway.device-bridge.relay-binding.v1' ||
      value.ownerSubject !== pending.ownerSubject || value.deviceId !== deviceRecord.deviceId ||
      typeof value.issuer !== 'string' || typeof value.endpoint !== 'string' || typeof value.expiresAt !== 'string') {
    throw new Error('ENROLLMENT_RELAY_POLICY_INVALID');
  }
  let issuer;
  let endpoint;
  const expiresAt = Date.parse(value.expiresAt);
  try { issuer = new URL(value.issuer); endpoint = new URL(value.endpoint); } catch { throw new Error('ENROLLMENT_RELAY_POLICY_INVALID'); }
  if (issuer.protocol !== 'https:' || issuer.username || issuer.password || issuer.search || issuer.hash ||
      endpoint.protocol !== 'wss:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash ||
      endpoint.pathname !== '/api/device-relay' || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw new Error('ENROLLMENT_RELAY_POLICY_INVALID');
  }
  return Object.freeze({
    schema: value.schema, issuer: issuer.toString(), endpoint: endpoint.toString(),
    ownerSubject: pending.ownerSubject, deviceId: deviceRecord.deviceId, expiresAt: new Date(expiresAt).toISOString(),
  });
}

function normalizeActiveRecord(value, pending) {
  if (!value || typeof value !== 'object' || !DEVICE_ID.test(String(value.deviceId || '')) ||
      value.ownerSubject !== pending.ownerSubject || value.platform !== pending.platform || value.status !== 'ACTIVE' ||
      value.deviceKeyThumbprint !== pending.deviceKeyThumbprint || !Number.isInteger(value.capabilityGrantVersion) || value.capabilityGrantVersion < 1) {
    throw new Error('ENROLLMENT_DEVICE_RECORD_INVALID');
  }
  return Object.freeze({ ...value });
}

/**
 * Build the source-side primary authority.  Production must inject persistent,
 * independently protected implementations; test doubles are intentionally kept
 * outside this module.  No key generation, filesystem registry, or fallback
 * endpoint exists here.
 */
export function createEnrollmentRelayBindingAuthority({ pendingEnrollments, deviceProofVerifier, ownerApprovalVerifier, trustedDeviceRegistry, relayBindingPolicy, relayBindingSigner, receiptAuthority } = {}) {
  requireMethod(pendingEnrollments, 'begin', 'ENROLLMENT_PENDING_STORE_REQUIRED');
  requireMethod(pendingEnrollments, 'read', 'ENROLLMENT_PENDING_STORE_REQUIRED');
  requireMethod(pendingEnrollments, 'consume', 'ENROLLMENT_PENDING_STORE_REQUIRED');
  requireMethod(deviceProofVerifier, 'verify', 'ENROLLMENT_DEVICE_PROOF_VERIFIER_REQUIRED');
  requireMethod(ownerApprovalVerifier, 'verify', 'ENROLLMENT_OWNER_APPROVAL_VERIFIER_REQUIRED');
  requireMethod(trustedDeviceRegistry, 'admit', 'ENROLLMENT_TRUSTED_REGISTRY_REQUIRED');
  requireMethod(relayBindingPolicy, 'resolve', 'ENROLLMENT_RELAY_POLICY_PROVIDER_REQUIRED');
  requireMethod(relayBindingSigner, 'sign', 'ENROLLMENT_RELAY_SIGNER_REQUIRED');
  requireMethod(receiptAuthority, 'appendAndReadBack', 'ENROLLMENT_RECEIPT_AUTHORITY_REQUIRED');

  return Object.freeze({
    async beginEnrollment(input) {
      const start = normalizeStart(input);
      const pending = await pendingEnrollments.begin(start);
      if (!pending || !DEVICE_ID.test(String(pending.enrollmentId || '')) || typeof pending.challenge !== 'string' || pending.challenge.length < 16 ||
          !Number.isFinite(Date.parse(pending.expiresAt)) || Date.parse(pending.expiresAt) <= Date.now()) {
        throw new Error('ENROLLMENT_PENDING_RECORD_INVALID');
      }
      return Object.freeze({ enrollmentId: pending.enrollmentId, challenge: pending.challenge, expiresAt: new Date(pending.expiresAt).toISOString() });
    },

    async completeEnrollment({ ownerSubject, enrollmentId, deviceProof, ownerProof } = {}) {
      const authenticatedOwner = requiredText(ownerSubject, 'ENROLLMENT_OWNER_SUBJECT_REQUIRED');
      const id = requiredText(enrollmentId, 'ENROLLMENT_ID_REQUIRED');
      const pending = await pendingEnrollments.read({ enrollmentId: id, ownerSubject: authenticatedOwner });
      if (!pending || pending.ownerSubject !== authenticatedOwner || !Number.isFinite(Date.parse(pending.expiresAt)) || Date.parse(pending.expiresAt) <= Date.now()) {
        throw new Error('ENROLLMENT_PENDING_NOT_ACTIVE');
      }
      if (await deviceProofVerifier.verify({ pending, deviceProof }) !== true) throw new Error('ENROLLMENT_DEVICE_PROOF_REJECTED');
      if (await ownerApprovalVerifier.verify({ pending, ownerProof }) !== true) throw new Error('ENROLLMENT_OWNER_APPROVAL_REJECTED');
      const consumed = await pendingEnrollments.consume({ enrollmentId: id, ownerSubject: authenticatedOwner });
      if (!consumed || consumed.ownerSubject !== pending.ownerSubject || consumed.enrollmentId !== pending.enrollmentId ||
          consumed.deviceKeyThumbprint !== pending.deviceKeyThumbprint) throw new Error('ENROLLMENT_PENDING_NOT_ACTIVE');

      const deviceRecord = normalizeActiveRecord(await trustedDeviceRegistry.admit({ pending }), pending);
      const binding = normalizeRelayPolicy(await relayBindingPolicy.resolve({ pending, deviceRecord }), pending, deviceRecord);
      const relayBindingArtifact = await relayBindingSigner.sign(binding);
      if (!COMPACT_JWS.test(String(relayBindingArtifact || ''))) throw new Error('ENROLLMENT_RELAY_SIGNING_INVALID');

      const evidence = Object.freeze({
        id: `enrollment-${id}`, event: 'DEVICE_ENROLLMENT_ADMITTED', ownerSubject: authenticatedOwner,
        enrollmentId: id, deviceId: deviceRecord.deviceId, deviceKeyThumbprint: deviceRecord.deviceKeyThumbprint,
        relayBindingSha256: createHash('sha256').update(relayBindingArtifact, 'utf8').digest('hex'),
      });
      const receipt = await receiptAuthority.appendAndReadBack(evidence);
      if (!receipt || !SHA256.test(String(receipt.payloadSha256 || '')) || receipt.payloadSha256.toLowerCase() !==
          receiptPayloadSha256(evidence)) {
        throw new Error('ENROLLMENT_RECEIPT_READBACK_INVALID');
      }
      return Object.freeze({ deviceRecord, relayBindingArtifact, enrollmentReceiptSha256: receipt.payloadSha256.toLowerCase() });
    },
  });
}
