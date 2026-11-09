// This object is supplied by trusted host code, never parsed from device or request JSON.
// C3 mode builds the canonical Device Bridge admission gate from existing owner providers;
// direct mode is reserved for a Runtime Fabric callback that already owns that complete gate.
const COMPOSITION_KEYS = new Set([
  'admission', 'receiptSink', 'formulaPreGate', 'veritasPreGate', 'consentProvider',
  'deviceRegistry', 'adapterRegistry', 'trustedIssuerRegistry', 'replayGuard',
  'complianceCardGate', 'complianceCardProvider', 'visionProviders', 'visionClientId',
]);

const HOST_INJECTED_C3_KEYS = Object.freeze([
  'deviceRegistry',
  'adapterRegistry',
  'formulaPreGate',
  'veritasPreGate',
  'receiptSink',
  'trustedIssuerRegistry',
  'replayGuard',
  'consentProvider',
]);

function ownDataValue(input, key) {
  const descriptor = Object.getOwnPropertyDescriptor(input, key);
  if (!descriptor) return undefined;
  if (!Object.hasOwn(descriptor, 'value')) throw new Error('TRUSTED_RUNTIME_COMPOSITION_INVALID');
  return descriptor.value;
}

export function requireTrustedRuntimeComposition(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Reflect.ownKeys(input).some(key => typeof key !== 'string' || !COMPOSITION_KEYS.has(key))) {
    throw new Error('TRUSTED_RUNTIME_COMPOSITION_INVALID');
  }

  const values = Object.fromEntries([...COMPOSITION_KEYS]
    .filter(key => Object.hasOwn(input, key))
    .map(key => [key, ownDataValue(input, key)]));
  if (typeof values.receiptSink !== 'function') {
    throw new Error('TRUSTED_RUNTIME_COMPOSITION_REQUIRED');
  }
  if (values.visionClientId !== undefined &&
      (typeof values.visionClientId !== 'string' || !values.visionClientId.trim() || values.visionClientId.length > 128)) {
    throw new Error('TRUSTED_VISION_CLIENT_ID_INVALID');
  }
  if (values.visionProviders !== undefined &&
      (!(values.visionProviders instanceof Map) ||
       [...values.visionProviders].some(([deviceId, provider]) =>
         typeof deviceId !== 'string' || !deviceId.trim() ||
         !provider || ['execute', 'describe', 'health'].some(method => typeof provider[method] !== 'function')))) {
    throw new Error('TRUSTED_VISION_PROVIDER_CONFIGURATION_INVALID');
  }
  if (values.complianceCardProvider && typeof values.complianceCardGate !== 'function') {
    throw new Error('TRUSTED_RUNTIME_COMPOSITION_REQUIRED');
  }

  const direct = typeof values.admission === 'function';
  const c3 = typeof values.formulaPreGate === 'function' && typeof values.veritasPreGate === 'function';
  const directHasProviderFields = Object.keys(values).some(key =>
    !['admission', 'receiptSink', 'complianceCardGate', 'complianceCardProvider', 'visionProviders', 'visionClientId'].includes(key));
  if (direct === c3 || (direct && directHasProviderFields) ||
      (!direct && !c3) ||
      ['formulaPreGate', 'veritasPreGate', 'consentProvider', 'complianceCardGate', 'complianceCardProvider'].some(key =>
        key in values && typeof values[key] !== 'function')) {
    throw new Error('TRUSTED_RUNTIME_COMPOSITION_REQUIRED');
  }

  return Object.freeze({ ...values, mode: direct ? 'direct' : 'c3' });
}

function isRegistryObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    (Array.isArray(value.adapters) || (value.adapters !== null && typeof value.adapters === 'object'));
}

function isDeviceRegistry(value) {
  if (value instanceof Map) {
    return value.size > 0 && [...value.entries()].every(([id, record]) =>
      typeof id === 'string' && id.length > 0 && record !== null && typeof record === 'object' &&
      typeof record.platform === 'string' && record.platform.trim().length > 0);
  }
  return Array.isArray(value) && value.length > 0 && value.every(record =>
    record !== null && typeof record === 'object' &&
    typeof (record.id ?? record.deviceId) === 'string' &&
    (record.id ?? record.deviceId).length > 0 &&
    typeof record.platform === 'string' && record.platform.trim().length > 0);
}

function isTrustedIssuerRegistry(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length > 0;
}

function isReplayGuard(value) {
  return value !== null && typeof value === 'object' &&
    typeof value.has === 'function' && typeof value.consume === 'function';
}

/**
 * Validate the candidate-only bridge seam used by trusted host startup.
 *
 * This is intentionally stricter than requireTrustedRuntimeComposition().
 * Discovery and legacy test fixtures may use the broader validator, but an
 * execution-capable Runtime-to-Device-Bridge seam must receive every C3
 * dependency from host code. Config JSON and MCP requests cannot fill any of
 * these slots, and a direct callback cannot substitute for the C3 providers.
 */
export function requireHostInjectedC3Composition(input = {}) {
  const composition = requireTrustedRuntimeComposition(input);
  if (composition.mode !== 'c3') {
    throw new Error('TRUSTED_RUNTIME_C3_COMPOSITION_REQUIRED');
  }

  const missing = HOST_INJECTED_C3_KEYS.filter(key => !Object.hasOwn(composition, key));
  if (missing.length > 0) {
    throw new Error(`TRUSTED_RUNTIME_C3_DEPENDENCIES_REQUIRED:${missing.join(',')}`);
  }
  if (!isDeviceRegistry(composition.deviceRegistry)) {
    throw new Error('TRUSTED_RUNTIME_DEVICE_REGISTRY_REQUIRED');
  }
  if (!isRegistryObject(composition.adapterRegistry)) {
    throw new Error('TRUSTED_RUNTIME_ADAPTER_REGISTRY_REQUIRED');
  }
  if (!isTrustedIssuerRegistry(composition.trustedIssuerRegistry)) {
    throw new Error('TRUSTED_RUNTIME_ISSUER_REGISTRY_REQUIRED');
  }
  if (!isReplayGuard(composition.replayGuard)) {
    throw new Error('TRUSTED_RUNTIME_REPLAY_GUARD_REQUIRED');
  }
  for (const key of ['formulaPreGate', 'veritasPreGate', 'consentProvider', 'receiptSink']) {
    if (typeof composition[key] !== 'function') {
      throw new Error(`TRUSTED_RUNTIME_${key.replace(/[A-Z]/g, letter => '_' + letter).toUpperCase()}_REQUIRED`);
    }
  }

  return composition;
}
