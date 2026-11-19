/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.PROTOCOL
TAG: LEEWAY.AGENT_DEVICE_GRANT.GATE.V1
5WH:
WHAT: Validate a Runtime-issued, owner-approved agent grant before a named client may request a device capability.
WHY: Permit accountable Agent Lee and helper access without turning every LLM or browser client into a device administrator.
WHO: Runtime Fabric grant verifier and Device Bridge protocol consumer; not a grant issuer or device adapter.
WHERE: packages/protocol/agent-device-grant.mjs.
WHEN: 2026-11-19.
HOW: Require externally verified grant identity, agent/device/owner/capability binding and a short expiry; fail closed otherwise.
LICENSE: MIT.
*/
const ID = /^[A-Za-z0-9._:@-]{3,160}$/;
const CAPABILITY = /^[a-z][a-z0-9]*(?:[.-][a-z][a-z0-9]*)+$/;
const APPLE_PLATFORM_DENIED = new Set([
  'device.ui.pointer.cross-app',
  'device.apps.control.cross-app',
  'device.screen.observe.cross-app'
]);

export function validateAgentDeviceGrant(grant, { agentId, ownerSubject, deviceId, capability, now = Date.now() } = {}) {
  if (!grant || typeof grant !== 'object' || Array.isArray(grant)) throw new Error('AGENT_DEVICE_GRANT_REQUIRED');
  if (grant.version !== 1 || !ID.test(grant.grantId || '') || !ID.test(grant.issuerId || '') || !ID.test(agentId || '') || !ID.test(ownerSubject || '') || !ID.test(deviceId || '') || !CAPABILITY.test(capability || '')) throw new Error('AGENT_DEVICE_GRANT_SCHEMA_INVALID');
  if (grant.agentId !== agentId || grant.ownerSubject !== ownerSubject || grant.deviceId !== deviceId) throw new Error('AGENT_DEVICE_GRANT_BINDING_MISMATCH');
  if (!Array.isArray(grant.capabilities) || grant.capabilities.length === 0 || grant.capabilities.length > 32 || !grant.capabilities.every(value => typeof value === 'string' && CAPABILITY.test(value))) throw new Error('AGENT_DEVICE_GRANT_CAPABILITIES_INVALID');
  if (!grant.capabilities.includes(capability)) throw new Error('AGENT_DEVICE_CAPABILITY_DENIED');
  if (APPLE_PLATFORM_DENIED.has(capability)) throw new Error('APPLE_PLATFORM_CAPABILITY_DENIED');
  const expiry = Date.parse(grant.expiresAt);
  if (!Number.isFinite(expiry) || expiry <= now || expiry - now > 15 * 60 * 1000) throw new Error('AGENT_DEVICE_GRANT_EXPIRED_OR_INVALID');
  if (typeof grant.signature !== 'string' || grant.signature.length < 32) throw new Error('AGENT_DEVICE_GRANT_SIGNATURE_MISSING');
  return Object.freeze({ grantId: grant.grantId, issuerId: grant.issuerId, agentId, ownerSubject, deviceId, capability, expiresAt: grant.expiresAt });
}

/**
 * The verifier is supplied by Runtime Fabric. The Bridge neither generates
 * keys nor treats this structural check as a signature verification.
 */
export function createAgentDeviceGrantGate({ verifyGrant, now = () => Date.now() } = {}) {
  return async ({ agentGrant, agentId, ownerSubject, deviceId, capability } = {}) => {
    const validated = validateAgentDeviceGrant(agentGrant, { agentId, ownerSubject, deviceId, capability, now: now() });
    if (typeof verifyGrant !== 'function') throw new Error('AGENT_DEVICE_GRANT_VERIFIER_UNBOUND');
    const verified = await verifyGrant({ grant: agentGrant, validated });
    if (verified !== true) throw new Error('AGENT_DEVICE_GRANT_UNVERIFIED');
    return validated;
  };
}
