/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.REGISTRY
TAG: LEEWAY.TRUSTED.DEVICE.REGISTRY.V1
WHAT: Load portable trusted device identities for relay and Continuum admission.
WHY: Device admission belongs to verified registry state, never a source-coded device-name list.
HOW: Read an owner-selected registry path or the packaged registry and normalize supported record shapes.
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_TRUSTED_DEVICE_REGISTRY = path.resolve(here, '../../registry/trusted-device-registry.json');

function records(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.devices)) return value.devices;
  if (value && typeof value === 'object' && (value.deviceId || value.id)) return [value];
  return [];
}

export function trustedDeviceId(record) {
  const value = record?.deviceId ?? record?.id;
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value) ? value : null;
}

export function isTrustedDeviceRecord(record) {
  return trustedDeviceId(record) !== null && record?.identityVerified === true &&
    record?.registrationState === 'TRUSTED_REGISTRY_READ' &&
    record?.registrationAuthority === 'TRUSTED_RUNTIME_DEVICE_REGISTRY';
}

export function normalizeTrustedDeviceRegistry(value) {
  const registry = new Map();
  for (const record of records(value)) {
    const deviceId = trustedDeviceId(record);
    if (deviceId && isTrustedDeviceRecord(record)) registry.set(deviceId, Object.freeze({ ...record, deviceId }));
  }
  return registry;
}

export function loadTrustedDeviceRegistry({
  registryPath = process.env.LEEWAY_TRUSTED_DEVICE_REGISTRY_PATH || DEFAULT_TRUSTED_DEVICE_REGISTRY,
  readFile = fs.readFileSync,
} = {}) {
  try {
    return normalizeTrustedDeviceRegistry(JSON.parse(readFile(path.resolve(registryPath), 'utf8')));
  } catch {
    return new Map();
  }
}
