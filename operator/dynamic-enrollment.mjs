/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.ENROLLMENT
TAG: LEEWAY.DYNAMIC.SOVEREIGN.ENROLLMENT.V1
WHAT: Provider-bound, portable device enrollment lifecycle.
WHY: A fresh device must enroll through owner approval and device-key proof,
     not a hostname, mesh token, static registry edit, or relay connection.
HOW: Native key provider -> Runtime challenge -> owner approval -> proof ->
     canonical record -> local custody -> capability negotiation -> runtime start.
AUTHORITY: This coordinator never acts as an issuer, attestation authority,
           Runtime registry, Formula evaluator, Veritas authority, or receipt custodian.
*/

const PLATFORMS = new Set(['windows', 'macos', 'linux', 'android', 'ios', 'ipados']);
const DEVICE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const THUMBPRINT = /^[A-Za-z0-9_-]{16,256}$/;

function requiredProvider(value, method, code) {
  if (!value || typeof value[method] !== 'function') throw new Error(code);
}

function requiredText(value, code) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(code);
  return value.trim();
}

function normalizeCapabilities(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 256 ||
      value.some(item => typeof item !== 'string' || !/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(item))) {
    throw new Error('ENROLLMENT_CAPABILITIES_INVALID');
  }
  return [...new Set(value)].sort();
}

function normalizePackageIdentity(value) {
  if (!value || typeof value !== 'object' ||
      !/^[A-Za-z0-9._-]{1,160}$/.test(String(value.packageId || '')) ||
      !/^[A-Za-z0-9._+-]{1,80}$/.test(String(value.version || '')) ||
      !/^[a-f0-9]{64}$/i.test(String(value.artifactSha256 || ''))) {
    throw new Error('ENROLLMENT_PACKAGE_IDENTITY_INVALID');
  }
  return Object.freeze({
    packageId: value.packageId,
    version: value.version,
    artifactSha256: value.artifactSha256.toLowerCase(),
  });
}

function validateCompletedEnrollment(value, { platform, keyThumbprint }) {
  const record = value?.deviceRecord;
  if (!record || typeof record !== 'object' || !DEVICE_ID.test(String(record.deviceId || '')) ||
      record.platform !== platform || record.status !== 'ACTIVE' ||
      record.deviceKeyThumbprint !== keyThumbprint ||
      typeof record.ownerSubject !== 'string' || !record.ownerSubject.trim() ||
      !Number.isInteger(record.capabilityGrantVersion) || record.capabilityGrantVersion < 1 ||
      !/^[a-f0-9]{64}$/i.test(String(value?.enrollmentReceiptSha256 || ''))) {
    throw new Error('ENROLLMENT_COMPLETION_INVALID');
  }
  if (typeof value.accessToken !== 'string' || value.accessToken.length < 16) {
    throw new Error('ENROLLMENT_ACCESS_TOKEN_MISSING');
  }
  return Object.freeze({
    deviceRecord: Object.freeze({ ...record }),
    accessToken: value.accessToken,
    enrollmentReceiptSha256: value.enrollmentReceiptSha256.toLowerCase(),
  });
}

/**
 * Compose real platform and Runtime providers into one portable onboarding
 * lifecycle. Every consequential provider is injected by the owning runtime.
 */
export function createDynamicEnrollment({ keyProvider, enrollmentAuthority, ownerApproval, localCustody, runtimeStarter, capabilityProbe } = {}) {
  requiredProvider(keyProvider, 'loadOrCreate', 'DEVICE_KEY_PROVIDER_REQUIRED');
  requiredProvider(keyProvider, 'signChallenge', 'DEVICE_KEY_SIGNER_REQUIRED');
  requiredProvider(enrollmentAuthority, 'beginEnrollment', 'ENROLLMENT_AUTHORITY_REQUIRED');
  requiredProvider(enrollmentAuthority, 'completeEnrollment', 'ENROLLMENT_AUTHORITY_REQUIRED');
  requiredProvider(ownerApproval, 'approveEnrollment', 'OWNER_APPROVAL_PROVIDER_REQUIRED');
  requiredProvider(localCustody, 'saveEnrollment', 'LOCAL_ENROLLMENT_CUSTODY_REQUIRED');
  requiredProvider(runtimeStarter, 'startEnrolledRuntime', 'ENROLLED_RUNTIME_STARTER_REQUIRED');
  requiredProvider(capabilityProbe, 'probeCapabilities', 'CAPABILITY_PROBE_REQUIRED');

  return Object.freeze({
    async enroll({ platform, packageIdentity, requestedCapabilities }) {
      const normalizedPlatform = requiredText(platform, 'ENROLLMENT_PLATFORM_REQUIRED').toLowerCase();
      if (!PLATFORMS.has(normalizedPlatform)) throw new Error('ENROLLMENT_PLATFORM_UNSUPPORTED');
      const packageIdentityValue = normalizePackageIdentity(packageIdentity);
      const capabilities = normalizeCapabilities(requestedCapabilities);

      const key = await keyProvider.loadOrCreate({ platform: normalizedPlatform });
      if (!key || typeof key.publicJwk !== 'object' || !THUMBPRINT.test(String(key.thumbprint || ''))) {
        throw new Error('DEVICE_KEY_PROVISIONING_INVALID');
      }

      const pending = await enrollmentAuthority.beginEnrollment({
        platform: normalizedPlatform,
        devicePublicJwk: key.publicJwk,
        deviceKeyThumbprint: key.thumbprint,
        packageIdentity: packageIdentityValue,
        requestedCapabilities: capabilities,
      });
      if (!pending || !requiredText(pending.enrollmentId, 'ENROLLMENT_ID_MISSING') ||
          !requiredText(pending.challenge, 'ENROLLMENT_CHALLENGE_MISSING') ||
          !requiredText(pending.expiresAt, 'ENROLLMENT_EXPIRY_MISSING')) {
        throw new Error('ENROLLMENT_CHALLENGE_INVALID');
      }

      const approval = await ownerApproval.approveEnrollment({
        enrollmentId: pending.enrollmentId,
        platform: normalizedPlatform,
        requestedCapabilities: capabilities,
        packageIdentity: packageIdentityValue,
        deviceKeyThumbprint: key.thumbprint,
      });
      if (!approval || approval.approved !== true || typeof approval.ownerProof !== 'string' || approval.ownerProof.length < 16) {
        throw new Error('OWNER_ENROLLMENT_APPROVAL_REQUIRED');
      }

      const deviceProof = await keyProvider.signChallenge({
        enrollmentId: pending.enrollmentId,
        challenge: pending.challenge,
        expiresAt: pending.expiresAt,
      });
      if (typeof deviceProof !== 'string' || deviceProof.length < 16) throw new Error('DEVICE_KEY_PROOF_INVALID');

      const completed = validateCompletedEnrollment(await enrollmentAuthority.completeEnrollment({
        enrollmentId: pending.enrollmentId,
        deviceProof,
        ownerProof: approval.ownerProof,
      }), { platform: normalizedPlatform, keyThumbprint: key.thumbprint });

      const measuredCapabilities = await capabilityProbe.probeCapabilities({
        platform: normalizedPlatform,
        deviceRecord: completed.deviceRecord,
        requestedCapabilities: capabilities,
      });
      if (!Array.isArray(measuredCapabilities)) throw new Error('CAPABILITY_PROBE_INVALID');

      await localCustody.saveEnrollment({
        deviceRecord: completed.deviceRecord,
        enrollmentReceiptSha256: completed.enrollmentReceiptSha256,
        keyReference: key.reference ?? null,
      });
      const runtime = await runtimeStarter.startEnrolledRuntime({
        deviceRecord: completed.deviceRecord,
        accessToken: completed.accessToken,
        measuredCapabilities,
      });
      if (!runtime || runtime.started !== true) throw new Error('ENROLLED_RUNTIME_START_FAILED');

      return Object.freeze({
        state: 'ACTIVE',
        deviceId: completed.deviceRecord.deviceId,
        deviceRecord: completed.deviceRecord,
        enrollmentReceiptSha256: completed.enrollmentReceiptSha256,
        measuredCapabilities,
        runtime,
      });
    },
  });
}
