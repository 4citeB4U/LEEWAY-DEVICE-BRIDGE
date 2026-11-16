/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.RUST.REGISTRY.ADAPTER
WHAT: Bind the persistent JavaScript relay to the Rust universal registry authority.
WHY: Registry admission must have one source of truth and no device-name enum.
*/
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DEFAULT_TRUSTED_DEVICE_REGISTRY } from './identity/trusted-device-registry.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultBinary = path.join(root, 'target', 'release', process.platform === 'win32' ? 'leeway-core.exe' : 'leeway-core');

export function parseRustRegistryList(raw) {
  const value = JSON.parse(String(raw));
  if (!Array.isArray(value?.devices) || value.devices.length > 4096 ||
    value.devices.some(deviceId => typeof deviceId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(deviceId)) ||
    new Set(value.devices).size !== value.devices.length) throw new Error('RUST_REGISTRY_RESPONSE_INVALID');
  return new Map(value.devices.map(deviceId => [deviceId, Object.freeze({
    deviceId,
    platform: 'registry-declared',
    identityVerified: true,
    registrationState: 'TRUSTED_REGISTRY_READ',
    registrationAuthority: 'TRUSTED_RUNTIME_DEVICE_REGISTRY',
    registryAuthority: 'LEEWAY_RUST_CORE_V2',
  })]));
}

export function loadRustTrustedDeviceRegistry({
  binary = process.env.LEEWAY_CORE_BIN || defaultBinary,
  registryPath = process.env.LEEWAY_TRUSTED_DEVICE_REGISTRY_PATH || DEFAULT_TRUSTED_DEVICE_REGISTRY,
  execute = execFileSync,
} = {}) {
  const output = execute(binary, ['registry-list', '--registry', path.resolve(registryPath)], {
    encoding: 'utf8', timeout: 10_000, windowsHide: true, maxBuffer: 1024 * 1024,
  });
  return parseRustRegistryList(output);
}

