/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.SOURCE_PINS
TAG: LEEWAY.ZITADEL.HOST_SOURCE_PIN_VERIFIER.V1
WHO: LeeWay Industries / owner-authorized release reviewers
WHAT: Compute and verify canonical SHA-256 pins for ZITADEL host-composition and Gate 1 relay/MCP sources
WHY: Ensure host wrappers detect drift or retired Pocket ID files before starting local or relay services
HOW: Deterministic SHA-256 over LF-normalized UTF-8 source bytes plus retired artifact absence check
AUTHORITY: Source verification only; does not mutate workstation host directories or restart live services
LICENSE: MIT
*/
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZITADEL_HOST_PINNED_MODULES } from '../operator/identity/zitadel-host-composition-template.mjs';

const RETIRED_ARTIFACTS = Object.freeze([
  `operator/identity/${['pocket', 'id', 'access'].join('-')}.mjs`,
  `operator/identity/create-${['pocket', 'id', 'mcp', 'server'].join('-')}.mjs`,
  `operator/identity/create-${['pocket', 'id', 'universal', 'handler'].join('-')}.mjs`,
  `operator/identity/start-${['pocket', 'id', 'mcp'].join('-')}.mjs`,
  `operator/identity/start-universal-${['pocket', 'id', 'mcp'].join('-')}.mjs`,
  `operator/identity/${['pocket', 'id'].join('-')}.compose.yml`,
  `operator/identity/deploy-existing-${['pocket', 'id'].join('-')}.ps1`,
  `operator/identity/continuum-${['pocket', 'id', 'backup'].join('-')}.mjs`,
]);

export function sha256NormalizedFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

export function buildZitadelHostSourcePins({ rootDir = path.resolve('.') } = {}) {
  const absRoot = path.resolve(rootDir);
  const pins = {};
  for (const relPath of ZITADEL_HOST_PINNED_MODULES) {
    const absPath = path.join(absRoot, relPath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`PINNED_SOURCE_MISSING:${relPath}`);
    }
    pins[relPath] = sha256NormalizedFile(absPath);
  }
  return {
    schema: 'leeway.zitadel.host-source-pins.v1',
    provider: 'ZITADEL',
    normalization: 'LF_UTF8_SHA256',
    pins,
  };
}

export function verifyZitadelHostSourcePins({
  rootDir = path.resolve('.'),
  pinManifestPath = path.join(path.resolve(rootDir), 'config/zitadel-host-pins.v1.json'),
} = {}) {
  const absRoot = path.resolve(rootDir);
  const failures = [];

  for (const relPath of RETIRED_ARTIFACTS) {
    if (fs.existsSync(path.join(absRoot, relPath))) {
      failures.push({ code: 'RETIRED_IDENTITY_ARTIFACT_PRESENT', path: relPath });
    }
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(pinManifestPath, 'utf8'));
  } catch {
    return { status: 'FAIL', reason: 'PIN_MANIFEST_UNREADABLE', failures };
  }

  if (manifest?.schema !== 'leeway.zitadel.host-source-pins.v1' || manifest?.provider !== 'ZITADEL') {
    failures.push({ code: 'PIN_MANIFEST_SCHEMA_INVALID', path: pinManifestPath });
  }

  const expectedPins = manifest?.pins || {};
  for (const relPath of ZITADEL_HOST_PINNED_MODULES) {
    const expected = expectedPins[relPath];
    const absPath = path.join(absRoot, relPath);
    if (!expected || typeof expected !== 'string') {
      failures.push({ code: 'PIN_ENTRY_MISSING', path: relPath });
      continue;
    }
    if (!fs.existsSync(absPath)) {
      failures.push({ code: 'PINNED_SOURCE_MISSING', path: relPath });
      continue;
    }
    const actual = sha256NormalizedFile(absPath);
    if (actual !== expected) {
      failures.push({ code: 'PIN_SHA256_MISMATCH', path: relPath, expected, actual });
    }
  }

  return {
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    provider: 'ZITADEL',
    pinnedCount: ZITADEL_HOST_PINNED_MODULES.length,
    failureCount: failures.length,
    failures,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const writeMode = process.argv.includes('--write');
  const rootArgIndex = process.argv.indexOf('--root');
  const rootDir = rootArgIndex >= 0 && process.argv[rootArgIndex + 1]
    ? process.argv[rootArgIndex + 1]
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const outPath = path.join(path.resolve(rootDir), 'config/zitadel-host-pins.v1.json');

  if (writeMode) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const manifest = buildZitadelHostSourcePins({ rootDir });
    fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    console.log(JSON.stringify({ status: 'WROTE_ZITADEL_HOST_PINS', outPath, pinnedCount: ZITADEL_HOST_PINNED_MODULES.length }, null, 2));
  } else {
    const report = verifyZitadelHostSourcePins({ rootDir, pinManifestPath: outPath });
    console.log(JSON.stringify(report, null, 2));
    if (report.status !== 'PASS') process.exitCode = 1;
  }
}
