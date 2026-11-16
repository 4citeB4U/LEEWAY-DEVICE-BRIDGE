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
import { createHash, randomUUID } from 'node:crypto';

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
  const publicKey = record?.publicKey ?? record?.publicKeySpki ?? record?.publicKeyDerBase64;
  const keyBound = typeof publicKey === 'string' && (
    /^ed25519:[a-f0-9]{64}$/i.test(publicKey.trim()) ||
    /^-----BEGIN PUBLIC KEY-----[\s\S]+-----END PUBLIC KEY-----$/.test(publicKey.trim()) ||
    /^[A-Za-z0-9+/]{40,512}={0,2}$/.test(publicKey.trim())
  );
  const tokenBound = typeof record?.meshTokenSha256 === 'string' &&
    /^[a-f0-9]{64}$/i.test(record.meshTokenSha256);
  return trustedDeviceId(record) !== null && record?.identityVerified === true &&
    record?.registrationState === 'TRUSTED_REGISTRY_READ' &&
    record?.registrationAuthority === 'TRUSTED_RUNTIME_DEVICE_REGISTRY' &&
    keyBound && tokenBound;
}

export function meshTokenSha256(token) {
  return createHash('sha256').update(String(token), 'utf8').digest('hex');
}

export function trustedDeviceTokenMatches(record, token) {
  return typeof token === 'string' && token.length >= 16 &&
    typeof record?.meshTokenSha256 === 'string' &&
    meshTokenSha256(token) === record.meshTokenSha256.toLowerCase();
}

export function persistTrustedDeviceEnrollment({
  deviceId,
  publicKey,
  meshToken,
  ownerSubject = 'OIDC_OWNER_VERIFIED',
  platform = 'dynamically-enrolled',
  registryPath = process.env.LEEWAY_TRUSTED_DEVICE_REGISTRY_PATH || DEFAULT_TRUSTED_DEVICE_REGISTRY,
} = {}) {
  if (!trustedDeviceId({ deviceId }) || typeof publicKey !== 'string' || typeof meshToken !== 'string' || meshToken.length < 16) {
    throw new Error('DEVICE_ENROLLMENT_RECORD_INVALID');
  }
  const resolved = path.resolve(registryPath);
  const lockPath = `${resolved}.enrollment.lock`;
  let locked = false;
  for (let attempt = 0; attempt < 100 && !locked; attempt++) {
    try { fs.mkdirSync(lockPath); locked = true; }
    catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      const stale = (() => { try { return Date.now() - fs.statSync(lockPath).mtimeMs > 300_000; } catch { return false; } })();
      if (stale) { try { fs.rmdirSync(lockPath); } catch {} }
      else Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    }
  }
  if (!locked) throw new Error('DEVICE_ENROLLMENT_REGISTRY_LOCK_TIMEOUT');
  try {
  let prior = { devices: [] };
  try { prior = JSON.parse(fs.readFileSync(resolved, 'utf8')); } catch {}
  const devices = records(prior).filter(record => trustedDeviceId(record) !== deviceId);
  const record = {
    deviceId,
    platform,
    publicKey,
    meshTokenSha256: meshTokenSha256(meshToken),
    identityVerified: true,
    registrationState: 'TRUSTED_REGISTRY_READ',
    registrationAuthority: 'TRUSTED_RUNTIME_DEVICE_REGISTRY',
    ownerSubject,
    enrolledUtc: new Date().toISOString(),
  };
  const temp = `${resolved}.${process.pid}.${randomUUID()}.tmp`;
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(temp, `${JSON.stringify({ devices: [...devices, record] }, null, 2)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  fs.renameSync(temp, resolved);
  return Object.freeze(record);
  } finally {
    try { fs.rmdirSync(lockPath); } catch {}
  }
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
