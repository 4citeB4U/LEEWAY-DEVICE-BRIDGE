/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.TEST
TAG: LEEWAY.LEGACY.POCKET_ID.AUTHORITY.FAIL_CLOSED.TEST
WHO: LeeWay Industries
WHAT: Prevent the legacy Pocket ID launcher from manufacturing Runtime authority.
WHEN: 2026-11-23
WHERE: tests/mcp/legacy-pocket-id-startup-authority.test.mjs
WHY: Host observation cannot create enrollment, Formula, Veritas, receipt, or device identity authority.
HOW: Source-bound negative assertions plus direct fail-closed composition call.
AUTHORITY: Unit regression only; no production enrollment or independent verification.
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHostInjectedC3Composition } from '../../operator/identity/start-pocket-id-mcp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourcePath = path.join(root, 'operator', 'identity', 'start-pocket-id-mcp.mjs');

test('legacy host composition refuses to manufacture Runtime authority', async () => {
  await assert.rejects(buildHostInjectedC3Composition(), /TRUSTED_RUNTIME_COMPOSITION_REQUIRED/);
});

test('legacy launcher has no fixed device, owner, or unconditional governance passes', async () => {
  const source = await fs.readFile(sourcePath, 'utf8');
  assert.doesNotMatch(source, /new Map\(\[\['pc-primary'/);
  assert.doesNotMatch(source, /LEEWAY_POCKET_ID_OWNER_SUB \|\|/);
  assert.doesNotMatch(source, /formulaPreGate:\s*async\s*\(\)\s*=>\s*true/);
  assert.doesNotMatch(source, /veritasPreGate:\s*async\s*\(\)\s*=>\s*true/);
  assert.doesNotMatch(source, /receipts\/c3-receipts\.jsonl/);
});
