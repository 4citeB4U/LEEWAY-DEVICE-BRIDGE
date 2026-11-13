/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.RESILIENCE.TESTS
TAG: LEEWAY.TESTS.PHOENIX_RECOVERY_CONSTITUTION.V1
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
5WH:
WHAT = Deterministic tests for CONTRACT-PRV-011 Complexity Governor, Tier 1 Prompt Diet Cap, Tier 0 Creator Safe-Mode, Protected Device Brain Sovereignty, Phoenix <10s LKG Rollback, and enforceSovereignConstitution.
WHY = Prove rapid automated recovery, sub-250ms reflex routing, and fail-closed constitutional defense without ever wiping digital_brain.db.
WHO = Creator Tier 0 & Antigravity F4.
WHERE = tests/phoenix-recovery-and-constitution.test.mjs.
WHEN = 2026-11-12.
HOW = Real temporary SQLite WAL database and disk LKG snapshots with SHA-256 verification and forced 3-failure watchdog trigger.
LICENSE: MIT
*/

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openSovereignWalStore } from '../operator/sqlite-wal-store.mjs';
import {
  classifyExecutionLane,
  wrapPromptWithTier1CompactAnchor,
  createLkgSnapshot,
  createPhoenixWatchdog,
  evaluateCreatorSafeModeBypass,
  assertNotProtectedDeviceBrain,
  LANE_1_REFLEX_FAST_PATH,
  LANE_2_CONSEQUENCE_GATE_PATH,
  PHOENIX_RECOVERY_SLA_MS
} from '../scripts/phoenix-recovery-supervisor.mjs';
import { enforceSovereignConstitution } from '../scripts/enforce-sovereign-colony-constitution.mjs';
import { createDeviceRelayServer } from '../api/device-relay.mjs';

test('Complexity Governor routes voice/kill-switch reflex to LANE_1 (<250ms) and mutations to LANE_2', () => {
  const reflex = classifyExecutionLane({ operation: 'voice.barge_in', mutating: false });
  assert.equal(reflex.lane, LANE_1_REFLEX_FAST_PATH);
  assert.ok(reflex.maxLatencyMs <= 250);
  assert.equal(reflex.requiresExternalLlmConsensus, false);

  const consequence = classifyExecutionLane({ operation: 'device.files.write', mutating: true });
  assert.equal(consequence.lane, LANE_2_CONSEQUENCE_GATE_PATH);
  assert.equal(consequence.requiresVeritasPrePost, true);
  assert.ok(consequence.requiredGates.includes('LEEWAY-VERITAS'));
});

test('Tier 1 Prompt Diet Cap enforces <= 6 lines and <= 250 tokens', () => {
  const result = wrapPromptWithTier1CompactAnchor('Check Fold6 health.', {
    workerId: 'agent-lee-local',
    leaseId: 'LEASE-123'
  });
  assert.ok(result.anchorLineCount <= 6);
  assert.ok(result.anchorApproxTokens <= 250);
  assert.match(result.prompt, /Check Fold6 health\./);
});

test('Phoenix Watchdog triggers <10s LKG rollback on 3 consecutive failures while protecting digital_brain.db', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'leeway-phoenix-'));
  try {
    const dbPath = path.join(dir, 'governance.sqlite');
    const snapshotDir = path.join(dir, 'lkg');
    const liveConfigPath = path.join(dir, 'relay-state.json');
    const brainDbPath = path.join(dir, 'digital_brain.db');

    writeFileSync(brainDbPath, 'CREATOR_OWNED_DEVICE_BRAIN_BYTES', 'utf8');
    assert.throws(() => assertNotProtectedDeviceBrain(brainDbPath), /DEVICE_BRAIN_SOVEREIGNTY_VIOLATION/);

    const store = openSovereignWalStore(dbPath);
    const lkgState = { version: 1, port: 8008, safe: true };
    const snap = createLkgSnapshot({
      targetId: 'relay-daemon',
      label: 'verified-boot',
      state: lkgState,
      snapshotDir,
      restorePath: liveConfigPath,
      walStore: store
    });
    assert.equal(snap.status, 'SAVED');

    // Simulate corrupting mutation before 3 failures
    writeFileSync(liveConfigPath, JSON.stringify({ version: 2, corrupted: true }), 'utf8');

    const watchdog = createPhoenixWatchdog({
      targetId: 'relay-daemon',
      restorePath: liveConfigPath,
      walStore: store,
      failureThreshold: 3
    });

    assert.equal(watchdog.recordFailure('TIMEOUT_1').rollbackTriggered, false);
    assert.equal(watchdog.recordFailure('TIMEOUT_2').rollbackTriggered, false);
    const triggered = watchdog.recordFailure('TIMEOUT_3');

    assert.equal(triggered.rollbackTriggered, true);
    assert.equal(triggered.status, 'ROLLED_BACK_LKG');
    assert.equal(triggered.withinSla, true);
    assert.ok(triggered.elapsedMs <= PHOENIX_RECOVERY_SLA_MS);
    assert.equal(triggered.digitalBrainPreserved, true);
    assert.deepEqual(JSON.parse(readFileSync(liveConfigPath, 'utf8')), lkgState);
    assert.equal(readFileSync(brainDbPath, 'utf8'), 'CREATOR_OWNED_DEVICE_BRAIN_BYTES');

    store.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Tier 0 Creator Safe-Mode Bypass succeeds only for locally authenticated Creator', () => {
  const denied = evaluateCreatorSafeModeBypass({
    actorId: 'F2-ChatGPT',
    tier: 'TIER_2_OUTSIDE_HELPER',
    localAuthVerified: true
  });
  assert.equal(denied.bypassGranted, false);

  const granted = evaluateCreatorSafeModeBypass({
    actorId: 'Leonard-Jerome-Lee',
    tier: 'TIER_0_CREATOR',
    localAuthVerified: true,
    cloudGovernanceReachable: false
  });
  assert.equal(granted.bypassGranted, true);
  assert.equal(granted.mode, 'CREATOR_OFFLINE_SAFE_MODE_BYPASS');
});

test('enforceSovereignConstitution blocks volatile state, usurpation, unqualified release, and unverified learning', () => {
  const denied = enforceSovereignConstitution({
    citizen: { citizenId: 'CTZ-01', tier: 'TIER_2_OUTSIDE_HELPER', tablet: { tabletId: 'TAB-01', persistence: 'VOLATILE_RAM' } },
    colony: { holographicSeedComplete: true, coordinatorAlive: true, requestedRoleMutation: 'CASTE_COORDINATOR' },
    transferManifest: {},
    releaseAction: 'PROMOTE_PRODUCTION',
    veritas: { qualified: false }
  });
  assert.equal(denied.admitted, false);
  assert.equal(denied.action, 'SIGKILL_REVOKE_AND_WIPE');
  assert.equal(denied.score, 0.0);
});

test('Live device-relay /mcp handler blocks mutating tool call failing Sovereign Constitution', async () => {
  const { server } = createDeviceRelayServer({
    mcpAccessPolicy: {
      configured: true,
      resource: 'https://bridge.example.test/mcp',
      metadataUrl: 'https://bridge.example.test/.well-known/oauth-protected-resource/mcp',
      issuer: 'https://identity.example.test',
      scopes: ['device.bridge.read'],
      authenticate: async req => req.headers.authorization === 'Bearer owner-read-fixture',
    },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer owner-read-fixture' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 77,
        method: 'tools/call',
        params: {
          name: 'device_files_write',
          arguments: {
            deviceId: 'pc-primary',
            path: 'demo.txt',
            text: 'hello',
            constitutionEnvelope: {
              citizen: { citizenId: 'CTZ-01', tablet: { tabletId: 'TAB-01', persistence: 'VOLATILE_RAM' } },
              colony: { holographicSeedComplete: true, coordinatorAlive: true, requestedRoleMutation: 'CASTE_COORDINATOR' }
            }
          }
        }
      })
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.result.isError, true);
    const inner = JSON.parse(body.result.content[0].text);
    assert.equal(inner.ok, false);
    assert.equal(inner.error, 'SIGKILL_REVOKE_AND_WIPE');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
