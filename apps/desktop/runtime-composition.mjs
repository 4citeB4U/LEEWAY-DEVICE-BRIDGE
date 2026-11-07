// This object is supplied by trusted host code, never parsed from device or request JSON.
// C3 mode builds the canonical Device Bridge admission gate from existing owner providers;
// direct mode is reserved for a Runtime Fabric callback that already owns that complete gate.
const COMPOSITION_KEYS = new Set([
  'admission', 'receiptSink', 'formulaPreGate', 'veritasPreGate', 'consentProvider',
  'deviceRegistry', 'adapterRegistry', 'trustedIssuerRegistry', 'replayGuard',
  'complianceCardGate', 'complianceCardProvider', 'visionProviders',
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
    !['admission', 'receiptSink', 'complianceCardGate', 'complianceCardProvider', 'visionProviders'].includes(key));
  if (direct === c3 || (direct && directHasProviderFields) ||
      (!direct && !c3) ||
      ['formulaPreGate', 'veritasPreGate', 'consentProvider', 'complianceCardGate', 'complianceCardProvider'].some(key =>
        key in values && typeof values[key] !== 'function')) {
    throw new Error('TRUSTED_RUNTIME_COMPOSITION_REQUIRED');
  }

  return Object.freeze({ ...values, mode: direct ? 'direct' : 'c3' });
}
