/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.ENTITLEMENT
TAG: LEEWAY.PORTABLE.SERVICE.ENTITLEMENT.V1
WHAT: Portable account and device entitlement decision contract.
WHY: Installation must be adapter-led; login should be the only recurring
     customer step, while a paid service lease never takes custody of data.
HOW: Evaluate an authority-issued entitlement against a stable OIDC subject,
     product grant, device ceiling, and requested service action.
AUTHORITY: Pure policy evaluator. It does not process payments, retain cards,
           authenticate a login, issue entitlements, or delete user data.
*/

const PRODUCT_ID = 'leeway.device-bridge';
const ACTIVE_STATUSES = new Set(['ACTIVE', 'GRACE']);
const SUSPENDED_STATUSES = new Set(['PAST_DUE', 'SUSPENDED', 'CANCELED', 'REVOKED', 'EXPIRED']);
const SUBJECT = /^[A-Za-z0-9._:@/-]{3,256}$/;
const DEVICE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;

function invalid(reason) {
  return Object.freeze({
    serviceEnabled: false,
    enrollmentAllowed: false,
    reason,
    // Commercial access never transfers ownership of customer-held data.
    localCustody: Object.freeze({ dataPreserved: true, localRead: true, localExport: true, remoteControl: false }),
  });
}

function validDate(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function validAccount(account) {
  return account && typeof account === 'object' && account.identityVerified === true && SUBJECT.test(String(account.subject || '')) &&
    typeof account.issuer === 'string' && /^https:\/\//.test(account.issuer);
}

/**
 * Evaluate a narrow service entitlement supplied by the authenticated account
 * authority. `account.subject` is a durable identity key; a login email stays
 * with the identity provider and is intentionally not accepted here. The
 * upstream OIDC verifier must mark the identity as verified before this gate.
 */
export function evaluateBridgeEntitlement({ account, entitlement, deviceId, registeredDeviceCount = 0, enrolledDeviceIds = [], now = new Date() } = {}) {
  if (!validAccount(account)) return invalid('ACCOUNT_SUBJECT_REQUIRED');
  if (!DEVICE_ID.test(String(deviceId || ''))) return invalid('DEVICE_ID_INVALID');
  if (!entitlement || typeof entitlement !== 'object') return invalid('ENTITLEMENT_REQUIRED');
  if (entitlement.productId !== PRODUCT_ID || entitlement.subject !== account.subject || entitlement.issuer !== account.issuer) {
    return invalid('ENTITLEMENT_ACCOUNT_OR_PRODUCT_MISMATCH');
  }
  if (!Number.isInteger(entitlement.deviceLimit) || entitlement.deviceLimit < 1 || entitlement.deviceLimit > 1000000) {
    return invalid('ENTITLEMENT_DEVICE_LIMIT_INVALID');
  }
  if (!Number.isInteger(registeredDeviceCount) || registeredDeviceCount < 0) return invalid('REGISTERED_DEVICE_COUNT_INVALID');
  const expiresAt = entitlement.licenseMode === 'PERPETUAL' ? null : validDate(entitlement.validUntil);
  if (entitlement.licenseMode !== 'PERPETUAL' && !expiresAt) return invalid('ENTITLEMENT_EXPIRY_INVALID');
  if (expiresAt && expiresAt.getTime() <= new Date(now).getTime()) return invalid('ENTITLEMENT_EXPIRED');
  if (SUSPENDED_STATUSES.has(entitlement.status)) return invalid('SERVICE_ENTITLEMENT_SUSPENDED');
  if (!ACTIVE_STATUSES.has(entitlement.status)) return invalid('ENTITLEMENT_STATUS_INVALID');

  const existingDevice = Array.isArray(enrolledDeviceIds) && enrolledDeviceIds.includes(deviceId);
  if (!existingDevice && registeredDeviceCount >= entitlement.deviceLimit) return invalid('DEVICE_LIMIT_REACHED');

  return Object.freeze({
    serviceEnabled: true,
    enrollmentAllowed: true,
    state: entitlement.status === 'GRACE' ? 'SERVICE_GRACE_ACTIVE' : 'SERVICE_ACTIVE',
    productId: PRODUCT_ID,
    subject: account.subject,
    deviceId,
    deviceLimit: entitlement.deviceLimit,
    localCustody: Object.freeze({ dataPreserved: true, localRead: true, localExport: true, remoteControl: true }),
  });
}

export { PRODUCT_ID };
