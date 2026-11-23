/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.OPERATOR.OS_FAMILY
TAG: LEEWAY.BRIDGE.UNIVERSAL.OS_FAMILY.V1
5WH:
WHAT = Normalize source-reported operating systems into four Creator-defined families.
WHY = Device Bridge discovery must distinguish Linux, Apple, Microsoft and Android without depending on Windows.
WHO = LeeWay Device Bridge; owner-admitted Runtime device registry.
WHERE = operator/device-os-family.mjs.
WHEN = 2026-11-23.
HOW = Exact aliases, explicit registry identity and configured adapter type; no device probing or identity enrollment.
AUTHORITY = Informational discovery metadata only; not a signature, reachability check or execution grant.
LICENSE = MIT
*/

export const DEVICE_OS_FAMILIES = Object.freeze(['Microsoft','Linux','Apple','Android']);

const ALIASES = Object.freeze({
  windows: 'Microsoft',
  win32: 'Microsoft',
  microsoft: 'Microsoft',
  'microsoft windows': 'Microsoft',
  linux: 'Linux',
  gnu_linux: 'Linux',
  'gnu/linux': 'Linux',
  android: 'Android',
  apple: 'Apple',
  macos: 'Apple',
  'mac os': 'Apple',
  darwin: 'Apple',
  ios: 'Apple',
  ipados: 'Apple',
  iphoneos: 'Apple',
});

const SUPPORTED_ADAPTER_TYPES = new Set(['desktop','relay','physical-android','physical-apple']);

export function classifyDeviceOS(platform) {
  if (typeof platform !== 'string') return null;
  const key = platform.trim().toLowerCase();
  return Object.hasOwn(ALIASES,key) ? ALIASES[key] : null;
}

export function hostDeviceOS(platform = process.platform) {
  return classifyDeviceOS(platform);
}

/**
 * Source fields may describe the device, but the transport type must be
 * consistent with the device OS and the registered adapter configuration.
 * A remote relay may represent any OS. A local desktop adapter does not imply
 * that the managed cloud process owns any particular device.
 */
export function deviceOSDescriptor({deviceId,record,configuredAdapter}={}) {
  if (typeof deviceId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(deviceId)) return null;
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null;
  const nativePlatform = typeof record.platform === 'string' ? record.platform.trim().toLowerCase() : '';
  const osFamily = classifyDeviceOS(nativePlatform);
  if (!osFamily) return null;
  const adapterType = configuredAdapter?.type;
  if (adapterType !== undefined && !SUPPORTED_ADAPTER_TYPES.has(adapterType)) return null;
  if (adapterType === 'physical-android' && osFamily !== 'Android') return null;
  if (adapterType === 'physical-apple' && osFamily !== 'Apple') return null;
  const configuredPlatform = configuredAdapter?.platform;
  if (typeof configuredPlatform === 'string') {
    const declaredFamily = classifyDeviceOS(configuredPlatform);
    if (declaredFamily === null || declaredFamily !== osFamily) return null;
  }
  return Object.freeze({
    deviceId,
    osFamily,
    platform: nativePlatform,
    adapterType: SUPPORTED_ADAPTER_TYPES.has(adapterType) ? adapterType : 'UNSPECIFIED',
    reachability: 'NOT_PROBED',
    executionAdmission: 'NOT_CONFERRED_BY_DISCOVERY'
  });
}
