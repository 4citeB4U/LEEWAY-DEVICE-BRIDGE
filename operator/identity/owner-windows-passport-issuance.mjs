/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.IDENTITY.OWNER_PASSPORT_ISSUANCE
TAG: LEEWAY.DEVICE_BRIDGE.WINDOWS_PASSPORT_OWNER_ISSUANCE.V1
5WH:
WHAT = Issue or inspect one signed Windows device passport using existing LeeWay host identity and issuer custody.
WHY = Replace registry-only claims with genuine signature, live-device, owner, and issuer proof.
WHO = Creator-authorized native Device Bridge custodian, outside support source author.
WHERE = LEEWAY-DEVICE-BRIDGE/operator/identity/owner-windows-passport-issuance.mjs
WHEN = 2026-11-22, existing Engineering issue #6 and Device Bridge issue #109.
HOW = Owner-supplied approved signer and issuer registry; fresh CIM; canonical Windows verifier; private local no-overwrite output.
LICENSE = Existing repository terms; no new license asserted.
*/
import { readFile, open, realpath } from 'node:fs/promises';
import { constants } from 'node:fs';
import { basename, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, sign } from 'node:crypto';
import {
  canonicalWindowsPassportPayload,
  readWindowsHostIdentity,
  verifyWindowsPcPrimaryPassport,
  windowsPassportSha256,
} from '../windows-pc-primary.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const MAX_TTL_SECONDS = 7 * 24 * 3600;
const MAX_INPUT_BYTES = 128 * 1024;
const validId = id => typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(id);
const deny = code => { throw new Error(code); };

export function resolveApprovedWindowsIssuer(issuerRegistry, request, now = Date.now()) {
  if (!issuerRegistry || typeof issuerRegistry !== 'object' || Array.isArray(issuerRegistry)) deny('ISSUER_REGISTRY_REQUIRED');
  if (!request || typeof request !== 'object' || Array.isArray(request)) deny('ENROLLMENT_REQUEST_REQUIRED');
  if (!validId(request.deviceId)) deny('DEVICE_ID_INVALID');
  if (!validId(request.issuerId) || !validId(request.keyId)) deny('ISSUER_OR_KEY_ID_INVALID');
  if (typeof request.ownerSubject !== 'string' || !request.ownerSubject.trim() || request.ownerSubject.length > 256) deny('OWNER_SUBJECT_REQUIRED');
  const ttl = request.ttlSeconds ?? 86400;
  if (!Number.isInteger(ttl) || ttl < 60 || ttl > MAX_TTL_SECONDS) deny('ENROLLMENT_TTL_INVALID');
  const issuers = issuerRegistry.issuers;
  const issuer = issuers && typeof issuers === 'object' && !Array.isArray(issuers) ? issuers[request.issuerId] : null;
  if (!issuer || issuer.issuerId !== request.issuerId || issuer.keyId !== request.keyId || issuer.algorithm !== 'Ed25519' || issuer.status !== 'ACTIVE' || typeof issuer.publicKeySpki !== 'string') deny('ISSUER_NOT_APPROVED');
  const expires = Date.parse(issuer.validUntil);
  if (!Number.isFinite(expires) || expires <= now + ttl * 1000) deny('ISSUER_EXPIRES_BEFORE_PASSPORT');
  if (issuer.ownerSubject && issuer.ownerSubject !== request.ownerSubject) deny('ISSUER_OWNER_MISMATCH');
  const matches = Object.values(issuers).filter(v => v?.keyId === request.keyId && v?.status === 'ACTIVE');
  if (matches.length !== 1) deny('ISSUER_KEY_AMBIGUOUS');
  return { issuer, ttl };
}

export function createOwnerSignedWindowsPassport({
  request, issuerRegistry, observedIdentity, signedBytes, now = Date.now(), enrollmentId = randomUUID(),
}) {
  const { issuer, ttl } = resolveApprovedWindowsIssuer(issuerRegistry, request, now);
  if (!observedIdentity || observedIdentity.platform !== 'windows' ||
      !['computerUuid', 'biosSerialNumber', 'manufacturer', 'model'].every(k => typeof observedIdentity[k] === 'string' && observedIdentity[k].trim())) deny('FRESH_WINDOWS_IDENTITY_REQUIRED');
  if (typeof signedBytes !== 'function') deny('APPROVED_SIGNER_REQUIRED');
  const unsigned = {
    schemaVersion: '1.0.0',
    authority: 'OWNER_SIGNED_WINDOWS_PASSPORT',
    platform: 'windows',
    deviceId: request.deviceId,
    ownerSubject: request.ownerSubject,
    issuerId: request.issuerId,
    keyId: request.keyId,
    enrollmentId,
    computerUuid: observedIdentity.computerUuid,
    biosSerialNumber: observedIdentity.biosSerialNumber,
    manufacturer: observedIdentity.manufacturer,
    model: observedIdentity.model,
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttl * 1000).toISOString(),
  };
  const data = Buffer.from(canonicalWindowsPassportPayload(unsigned), 'utf8');
  const signature = signedBytes(data);
  if (!Buffer.isBuffer(signature) || signature.length === 0) deny('SIGNING_PROVIDER_FAILED');
  const passport = { ...unsigned, signature: signature.toString('base64url') };
  // Use the original CIM-bound adapter verifier, not the distinct legacy hardwareUid format.
  const verified = verifyWindowsPcPrimaryPassport({
    passport,
    observedIdentity,
    ownerSubject: request.ownerSubject,
    trustRegistry: { [request.keyId]: issuer },
    clock: () => now,
  });
  if (verified.identityVerified !== true) deny('PASSPORT_VERIFICATION_FAILED');
  return { passport, passportSha256: windowsPassportSha256(passport), verified };
}

async function readJson(path) {
  const bytes = await readFile(path);
  if (bytes.length < 2 || bytes.length > MAX_INPUT_BYTES) deny('ENROLLMENT_INPUT_SIZE_INVALID');
  try { return JSON.parse(bytes.toString('utf8')); }
  catch { deny('ENROLLMENT_JSON_INVALID'); }
}

function parseArgs(argv) {
  const opts = {};
  if (argv.length % 2) deny('ISSUANCE_ARGUMENTS_INVALID');
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i], val = argv[i + 1];
    if (!['--request', '--issuer-registry', '--signer-file', '--output'].includes(key) ||
      typeof val !== 'string' || !val.trim() || key in opts) deny('ISSUANCE_ARGUMENTS_INVALID');
    opts[key] = val;
  }
  if (!['--request', '--issuer-registry', '--signer-file', '--output'].every(k => opts[k])) deny('ISSUANCE_ARGUMENTS_REQUIRED');
  return opts;
}

function isUnder(candidate, root) {
  const c = resolve(candidate), r = resolve(root);
  return process.platform === 'win32' ? (c.toLowerCase() === r.toLowerCase() || c.toLowerCase().startsWith(r.toLowerCase() + sep))
    : (c === r || c.startsWith(r + sep));
}

/**
 * Native-owner-only issuance. No key generation, network call, configuration mutation,
 * startup, remote enrollment, receipt fabrication, or publication is performed.
 * The signer file is an approved local custodian input, never a development default.
 */
export async function issueOwnerWindowsPassport(argv = process.argv.slice(2), { hostProbe = readWindowsHostIdentity } = {}) {
  if (process.platform !== 'win32' && hostProbe === readWindowsHostIdentity) deny('WINDOWS_HOST_REQUIRED');
  const args = parseArgs(argv);
  const output = resolve(args['--output']);
  const parent = await realpath(dirname(output));
  if (isUnder(parent, ROOT)) deny('PASSPORT_OUTPUT_MUST_BE_OUTSIDE_SOURCE_REPOSITORY');
  const [request, issuerRegistry] = await Promise.all([
    readJson(args['--request']), readJson(args['--issuer-registry']),
  ]);
  const now = Date.now();
  resolveApprovedWindowsIssuer(issuerRegistry, request, now);
  const observedIdentity = await hostProbe();
  // Reject signer material inside source worktrees or obviously development-named artifacts.
  let signerPath;
  try { signerPath = await realpath(args['--signer-file']); }
  catch (error) { if (error?.code === 'ENOENT') deny('OWNER_APPROVED_SIGNER_FILE_NOT_FOUND'); throw error; }
  if (isUnder(signerPath, ROOT) || /(?:^|[._-])(dev|development|test|fixture)(?:[._-]|$)/i.test(basename(signerPath))) {
    deny('UNAPPROVED_SIGNER_PATH');
  }
  // Import approved signer bytes only in native process memory; zero the input buffer.
  const signerPem = await readFile(signerPath);
  let passportResult;
  try {
    passportResult = createOwnerSignedWindowsPassport({
      request, issuerRegistry, observedIdentity, now,
      signedBytes: payload => sign(null, payload, signerPem),
    });
  } finally { signerPem.fill(0); }
  const flags = constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY |
    (constants.O_NOFOLLOW ?? 0);
  const handle = await open(output, flags, 0o600);
  try {
    await handle.writeFile(JSON.stringify(passportResult.passport, null, 2) + '\n', 'utf8');
    await handle.sync();
  } finally { await handle.close(); }
  return {
    status: 'SIGNED_PASSPORT_CREATED_LOCAL',
    artifactPath: output,
    artifactFilename: basename(output),
    deviceId: passportResult.passport.deviceId,
    issuerId: passportResult.passport.issuerId,
    keyId: passportResult.passport.keyId,
    passportSha256: passportResult.passportSha256,
    signatureVerification: 'PASSED_WITH_EXISTING_WINDOWS_ADAPTER',
    runtimeRegistration: 'NOT_PERFORMED',
    productionQualified: false,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  issueOwnerWindowsPassport().then(result => {
    process.stdout.write(JSON.stringify(result) + '\n');
  }).catch(error => {
    // Never print raw exception details, local file contents or private signing material.
    process.stderr.write('PASSPORT_ISSUANCE_DENIED: ' +
      (/^[A-Z0-9_]+$/.test(error.message) ? error.message : 'LOCAL_AUTHORITY_OR_IO_FAILURE') + '\n');
    process.exitCode = 1;
  });
}
