/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.WINDOWS.IDENTITY
TAG: LEEWAY.WINDOWS.PC_PRIMARY.PASSPORT_ADAPTER_V1
WHO: LeeWay Industries / owner-authorized Device Bridge maintainers
WHAT: Read-only source-bound Windows pc-primary identity observation.
WHY: A configured desktop name must not become a verified execution target.
HOW: Windows CIM/BIOS observation + owner-signed passport + injected trust record.
AUTHORITY: Candidate adapter; no enrollment, Veritas decision or production root.
LICENSE: MIT
*/
import { createHash, createPublicKey, verify as verifySignature } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const WINDOWS_DEVICE_ID = 'pc-primary';
const WINDOWS_PLATFORM = 'windows';
const WINDOWS_PASSPORT_AUTHORITY = 'OWNER_SIGNED_WINDOWS_PASSPORT';
const WINDOWS_IDENTITY_SOURCE = 'WINDOWS_CIM_READONLY';
const WINDOWS_REGISTRATION_STATE = 'TRUSTED_REGISTRY_READ';
const PLACEHOLDER_VALUES = new Set([
  '', 'default string', 'none', 'unknown', 'not specified',
  'to be filled by o.e.m.', 'to be filled by oem',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
]);

function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function normalized(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function comparable(value) {
  return normalized(value).toLowerCase();
}

function isRealIdentityValue(value) {
  return !PLACEHOLDER_VALUES.has(comparable(value));
}

function getField(value, ...names) {
  if (!value || typeof value !== 'object') return '';
  for (const name of names) {
    const found = value[name];
    if (typeof found === 'string' && found.trim()) return found.trim();
  }
  return '';
}

/**
 * Normalize only fields returned by the Windows read-only host probe.
 * Missing, placeholder and ambiguous identity fields are rejected.
 */
export function normalizeWindowsHostIdentity(raw) {
  const product = raw?.computerSystemProduct ?? raw?.ComputerSystemProduct ?? {};
  const bios = raw?.bios ?? raw?.BIOS ?? {};
  const computer = raw?.computerSystem ?? raw?.ComputerSystem ?? {};
  const operatingSystem = raw?.operatingSystem ?? raw?.OperatingSystem ?? {};
  const identity = {
    platform: WINDOWS_PLATFORM,
    computerUuid: getField(product, 'UUID', 'Uuid', 'uuid'),
    biosSerialNumber: getField(bios, 'SerialNumber', 'serialNumber', 'Serial'),
    manufacturer: getField(computer, 'Manufacturer', 'manufacturer') || getField(product, 'Vendor', 'vendor'),
    model: getField(computer, 'Model', 'model') || getField(product, 'Name', 'name'),
    osVersion: getField(operatingSystem, 'Version', 'version'),
    osCaption: getField(operatingSystem, 'Caption', 'caption'),
    osBuild: getField(operatingSystem, 'BuildNumber', 'buildNumber'),
  };

  if (!isRealIdentityValue(identity.computerUuid) ||
      !isRealIdentityValue(identity.biosSerialNumber) ||
      !isRealIdentityValue(identity.manufacturer) ||
      !isRealIdentityValue(identity.model)) {
    throw new Error('WINDOWS_HOST_IDENTITY_UNQUALIFIED');
  }
  return Object.freeze(identity);
}

const WINDOWS_CIM_PROBE = String.raw`
$product = Get-CimInstance Win32_ComputerSystemProduct -ErrorAction Stop |
  Select-Object UUID, Vendor, Name, Version, IdentifyingNumber
$bios = Get-CimInstance Win32_BIOS -ErrorAction Stop |
  Select-Object SerialNumber, Manufacturer, SMBIOSBIOSVersion
$computer = Get-CimInstance Win32_ComputerSystem -ErrorAction Stop |
  Select-Object Manufacturer, Model
$os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop |
  Select-Object Caption, Version, BuildNumber
[pscustomobject]@{
  computerSystemProduct = $product
  bios = $bios
  computerSystem = $computer
  operatingSystem = $os
} | ConvertTo-Json -Compress -Depth 4
`;

export async function readWindowsHostIdentity({
  commandRunner = execFileAsync,
  hostPlatform = process.platform,
  timeoutMs = 15000,
} = {}) {
  if (hostPlatform !== 'win32') throw new Error('WINDOWS_HOST_REQUIRED');
  let response;
  try {
    response = await commandRunner('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-Command', WINDOWS_CIM_PROBE,
    ], { timeout: timeoutMs, windowsHide: true });
  } catch {
    throw new Error('WINDOWS_HOST_IDENTITY_PROBE_FAILED');
  }
  let parsed;
  try {
    parsed = JSON.parse(normalized(response?.stdout));
  } catch {
    throw new Error('WINDOWS_HOST_IDENTITY_OUTPUT_INVALID');
  }
  return normalizeWindowsHostIdentity(parsed);
}

function passportBody(passport) {
  const { signature, ...body } = passport ?? {};
  return body;
}

// Canonicalization is exported for test-only signing fixtures and does not
// create, enroll or trust a production passport.
export function canonicalWindowsPassportPayload(passport) {
  return canonical(passportBody(passport));
}

export function windowsPassportSha256(passport) {
  return createHash('sha256').update(canonical(passport)).digest('hex');
}

function trustRecordFor(registry, keyId) {
  if (registry instanceof Map) return registry.get(keyId) ?? null;
  if (!registry || typeof registry !== 'object') return null;
  return registry[keyId] ?? registry.issuers?.[keyId] ?? null;
}

function nowValue(clock) {
  const value = typeof clock === 'function' ? clock() : clock;
  return Number.isFinite(value) ? value : Date.now();
}

/**
 * Verify an owner-signed Windows passport against fresh host evidence.
 * No default trust registry, owner subject, credential or enrollment is used.
 */
export function verifyWindowsPcPrimaryPassport({
  passport,
  observedIdentity,
  ownerSubject,
  trustRegistry,
  clock = Date.now,
  clockSkewMs = 30000,
} = {}) {
  if (!passport || typeof passport !== 'object') throw new Error('WINDOWS_PASSPORT_REQUIRED');
  if (passport.schemaVersion !== '1.0.0' ||
      passport.authority !== WINDOWS_PASSPORT_AUTHORITY ||
      passport.platform !== WINDOWS_PLATFORM ||
      passport.deviceId !== WINDOWS_DEVICE_ID ||
      typeof passport.ownerSubject !== 'string' ||
      typeof passport.keyId !== 'string' ||
      typeof passport.signature !== 'string') {
    throw new Error('WINDOWS_PASSPORT_SCHEMA_INVALID');
  }
  if (typeof ownerSubject !== 'string' || ownerSubject.length === 0 || passport.ownerSubject !== ownerSubject) {
    throw new Error('WINDOWS_PASSPORT_OWNER_MISMATCH');
  }

  const trust = trustRecordFor(trustRegistry, passport.keyId);
  if (!trust || trust.status !== 'ACTIVE' || typeof trust.publicKeySpki !== 'string' ||
      (trust.ownerSubject && trust.ownerSubject !== ownerSubject)) {
    throw new Error('WINDOWS_PASSPORT_ISSUER_UNTRUSTED');
  }

  const now = nowValue(clock);
  const issuedAtMs = Date.parse(passport.issuedAt);
  const expiresAtMs = Date.parse(passport.expiresAt);
  const trustValidUntilMs = trust.validUntil ? Date.parse(trust.validUntil) : Infinity;
  if (!Number.isFinite(issuedAtMs) || !Number.isFinite(expiresAtMs) || expiresAtMs <= issuedAtMs ||
      now + clockSkewMs < issuedAtMs || now - clockSkewMs > expiresAtMs ||
      (Number.isFinite(trustValidUntilMs) && now > trustValidUntilMs)) {
    throw new Error('WINDOWS_PASSPORT_EXPIRED_OR_NOT_YET_VALID');
  }
  if (!isRealIdentityValue(passport.computerUuid) || !isRealIdentityValue(passport.biosSerialNumber) ||
      !isRealIdentityValue(passport.manufacturer) || !isRealIdentityValue(passport.model)) {
    throw new Error('WINDOWS_PASSPORT_IDENTITY_FIELDS_INVALID');
  }
  if (!observedIdentity || observedIdentity.platform !== WINDOWS_PLATFORM ||
      comparable(passport.computerUuid) !== comparable(observedIdentity.computerUuid) ||
      comparable(passport.biosSerialNumber) !== comparable(observedIdentity.biosSerialNumber) ||
      comparable(passport.manufacturer) !== comparable(observedIdentity.manufacturer) ||
      comparable(passport.model) !== comparable(observedIdentity.model)) {
    throw new Error('WINDOWS_PASSPORT_HOST_MISMATCH');
  }

  let publicKey;
  try {
    publicKey = createPublicKey(trust.publicKeySpki);
  } catch {
    throw new Error('WINDOWS_PASSPORT_ISSUER_KEY_INVALID');
  }
  let validSignature = false;
  try {
    validSignature = verifySignature(
      null,
      Buffer.from(canonicalWindowsPassportPayload(passport), 'utf8'),
      publicKey,
      Buffer.from(passport.signature, 'base64url'),
    );
  } catch {
    validSignature = false;
  }
  if (!validSignature) throw new Error('WINDOWS_PASSPORT_SIGNATURE_INVALID');

  return Object.freeze({
    identityVerified: true,
    registrationState: WINDOWS_REGISTRATION_STATE,
    identitySource: WINDOWS_IDENTITY_SOURCE,
    passportAuthority: WINDOWS_PASSPORT_AUTHORITY,
    ownerSubject,
    passportSha256: windowsPassportSha256(passport),
    verifiedAt: new Date(now).toISOString(),
  });
}

/**
 * Read-only adapter for the owner-enrolled primary Windows workstation.
 * It exposes only health/info and requires fresh host evidence on every call.
 */
export class WindowsPcPrimaryAdapter {
  constructor({
    passport,
    ownerSubject,
    trustRegistry,
    deviceId = WINDOWS_DEVICE_ID,
    hostPlatform = process.platform,
    probe = readWindowsHostIdentity,
    clock = Date.now,
    timeoutMs = 15000,
  } = {}) {
    if (deviceId !== WINDOWS_DEVICE_ID) throw new Error('WINDOWS_PC_PRIMARY_DEVICE_REQUIRED');
    if (hostPlatform !== 'win32') throw new Error('WINDOWS_HOST_REQUIRED');
    if (!passport) throw new Error('WINDOWS_PASSPORT_REQUIRED');
    if (typeof ownerSubject !== 'string' || ownerSubject.length === 0) throw new Error('WINDOWS_OWNER_SUBJECT_REQUIRED');
    if (!trustRecordFor(trustRegistry, passport.keyId)) throw new Error('WINDOWS_PASSPORT_ISSUER_UNTRUSTED');
    this.passport = passport;
    this.ownerSubject = ownerSubject;
    this.trustRegistry = trustRegistry;
    this.deviceId = deviceId;
    this.hostPlatform = hostPlatform;
    this.probe = probe;
    this.clock = clock;
    this.timeoutMs = timeoutMs;
  }

  async discover() {
    return ['device.health', 'device.info'];
  }

  async execute(capability) {
    if (!['device.health', 'device.info'].includes(capability)) {
      throw new Error('CAPABILITY_UNAVAILABLE');
    }
    const observed = await this.probe({ hostPlatform: this.hostPlatform, timeoutMs: this.timeoutMs });
    const verification = verifyWindowsPcPrimaryPassport({
      passport: this.passport,
      observedIdentity: observed,
      ownerSubject: this.ownerSubject,
      trustRegistry: this.trustRegistry,
      clock: this.clock,
    });
    const base = {
      ok: true,
      deviceId: this.deviceId,
      platform: WINDOWS_PLATFORM,
      transport: 'WINDOWS_CIM_READONLY',
      executionTier: 'WINDOWS_HOST_IDENTITY_OBSERVATION_ONLY',
      identityVerified: verification.identityVerified,
      registrationState: verification.registrationState,
      identitySource: verification.identitySource,
      passportAuthority: verification.passportAuthority,
      ownerSubject: verification.ownerSubject,
      passportSha256: verification.passportSha256,
      manufacturer: observed.manufacturer,
      model: observed.model,
      computerUuid: observed.computerUuid,
      biosSerialNumber: observed.biosSerialNumber,
      osVersion: observed.osVersion,
      osCaption: observed.osCaption,
      osBuild: observed.osBuild,
      observedAt: verification.verifiedAt,
      readOnly: true,
    };
    return capability === 'device.health'
      ? { ...base, status: 'ONLINE' }
      : base;
  }
}

/**
 * Convert an adapter's verified observation into the host registry record.
 * The helper accepts only the adapter's explicit verified result and never
 * creates identity evidence from a configured device name.
 */
export function createTrustedWindowsRegistryRecord(observation) {
  if (!observation || observation.deviceId !== WINDOWS_DEVICE_ID ||
      observation.platform !== WINDOWS_PLATFORM || observation.identityVerified !== true ||
      observation.registrationState !== WINDOWS_REGISTRATION_STATE ||
      observation.identitySource !== WINDOWS_IDENTITY_SOURCE ||
      observation.passportAuthority !== WINDOWS_PASSPORT_AUTHORITY ||
      !/^[a-f0-9]{64}$/i.test(observation.passportSha256 || '') ||
      typeof observation.ownerSubject !== 'string' || observation.ownerSubject.length === 0) {
    throw new Error('WINDOWS_REGISTRY_OBSERVATION_NOT_VERIFIED');
  }
  return Object.freeze({
    platform: WINDOWS_PLATFORM,
    identityVerified: true,
    registrationState: WINDOWS_REGISTRATION_STATE,
    identitySource: WINDOWS_IDENTITY_SOURCE,
    passportAuthority: WINDOWS_PASSPORT_AUTHORITY,
    passportSha256: observation.passportSha256,
    ownerSubject: observation.ownerSubject,
  });
}

export const WINDOWS_PC_PRIMARY_CONSTANTS = Object.freeze({
  deviceId: WINDOWS_DEVICE_ID,
  platform: WINDOWS_PLATFORM,
  passportAuthority: WINDOWS_PASSPORT_AUTHORITY,
  identitySource: WINDOWS_IDENTITY_SOURCE,
  registrationState: WINDOWS_REGISTRATION_STATE,
});
