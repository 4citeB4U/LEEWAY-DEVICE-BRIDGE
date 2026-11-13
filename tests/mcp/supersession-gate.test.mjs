/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.GOVERNANCE.TEST
TAG: LEEWAY.DEVICE_BRIDGE.SUPERSESSION_GATE.TEST.V1
WHO: LeeWay Industries / Architectural Governance
WHAT: Verify Device Bridge ZITADEL host source pins and cross-repo Pocket ID supersession compliance
WHY: Prevent retired Pocket ID files, ports, or symbols from returning to active Device Bridge source paths
HOW: Verify config/zitadel-host-pins.v1.json hashes and run Standards supersession validator when sibling repo exists
AUTHORITY: Source verification only; not production deployment or Veritas approval
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { verifyZitadelHostSourcePins } from '../../scripts/pin-zitadel-host-sources.mjs';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../..');

test('ZITADEL host source pins match exact file hashes and contain no retired Pocket ID artifacts', () => {
  const result = verifyZitadelHostSourcePins({ rootDir: repoRoot });
  assert.equal(result.status, 'PASS', JSON.stringify(result, null, 2));
  assert.equal(result.failureCount, 0);
  assert.ok(result.pinnedCount >= 10);
});

test('Standards Architectural Supersession Gate passes when canonical LeeWay-Standards sibling checkout exists', async () => {
  const standardsValidator = path.resolve(repoRoot, '../LeeWay-Standards/scripts/verify-supersession-gate.mjs');
  const standardsRegistry = path.resolve(repoRoot, '../LeeWay-Standards/standards/leeway-ecosystem-authority.v1.json');
  if (!fs.existsSync(standardsValidator) || !fs.existsSync(standardsRegistry)) {
    return;
  }
  const { loadSupersessionRegistry, scanDirectoryForSupersessionViolations } = await import(pathToFileURL(standardsValidator).href);
  const registry = loadSupersessionRegistry(standardsRegistry);
  const violations = scanDirectoryForSupersessionViolations({
    targetRoot: repoRoot,
    registry,
  });
  assert.equal(violations.length, 0, JSON.stringify(violations, null, 2));
});
