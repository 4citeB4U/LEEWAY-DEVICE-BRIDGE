/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.GOVERNANCE.VERITAS_AND_LEARNING_TESTS
TAG: LEEWAY.TESTS.VERITAS_GATEKEEPER_CITIZEN_LEARNING.V2
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
5WH:
WHAT = Test suite for SQLite WAL Veritas Output Gatekeeper, Sandwich Protocol, Citizen Agent Tablets, A.N.T. Queen-Loss Morphogenesis, Computational Mortality, and Ordered Learning (LG-00..LG-10).
WHY = Prove non-negotiable enforcement of Law Zero cadence, durable SQLite WAL storage across restarts, proportional citizen scaling, Queen-Loss Morphogenesis, and Runtime PR #174 LG-08 boundaries.
WHO = Creator/Human Authority and Antigravity F4.
WHERE = tests/veritas-gatekeeper-and-citizen-learning.test.mjs.
WHEN = 2026-11-12.
HOW = Automated Node.js test runner exercising allow/deny/restart-replay, Queen-Loss Morphogenesis, and proportional topology scaling.
LICENSE: MIT
*/

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  wrapPromptWithLawZeroAnchor,
  wrapPromptWithTier1CompactAnchor,
  createVeritasGatekeeper
} from '../operator/veritas-gatekeeper-middleware.mjs';
import {
  ORDERED_LEARNING_STAGES,
  scaleCitizensForTopology,
  advanceLearningStage,
  killAndZeroWipeCitizen,
  respawnFromGenesisSeed,
  evaluateColonyMorphogenesis,
  createHostLearningPermissionVerifier
} from '../operator/citizen-agent-tablet-registry.mjs';
import { openSovereignWalStore } from '../operator/sqlite-wal-store.mjs';

function withTempDb(fn) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'leeway-gov-wal-'));
  const dbPath = path.join(dir, 'governance.sqlite');
  return Promise.resolve(fn(dbPath)).finally(() => {
    rmSync(dir, { recursive: true, force: true });
  });
}

describe('Veritas Output Gatekeeper & Sandwich Protocol (SQLite WAL)', () => {
  test('Sandwich Protocol appends Law Zero Anchor at bottom and compact Tier 1 anchor stays under diet cap', () => {
    const wrapped = wrapPromptWithLawZeroAnchor('Check node health on Fold6.', {
      workerId: 'F2-ChatGPT',
      leaseId: 'LEASE-ABC123'
    });
    assert.ok(wrapped.startsWith('Check node health on Fold6.'));
    assert.ok(wrapped.includes('[LAW ZERO ANCHOR — RECENCY LOCK'));
    assert.ok(wrapped.includes('WORKER: F2-ChatGPT | LEASE: LEASE-ABC123'));

    const compact = wrapPromptWithTier1CompactAnchor('Check Fold6.', {
      workerId: 'agent-lee-local',
      leaseId: 'LEASE-T1'
    });
    assert.ok(compact.anchorLineCount <= 6);
    assert.ok(compact.anchorApproxTokens <= 250);
  });

  test('Veritas Gatekeeper rejects corporate filler, persists strike & revoked lease across SQLite WAL restart', () =>
    withTempDb((dbPath) => {
      const gatekeeper1 = createVeritasGatekeeper({ dbPath });
      const lease = gatekeeper1.issueTurnLease({ workerId: 'F2-ChatGPT', workId: 'WORK-01' });

      const rejected = gatekeeper1.evaluateOutput({
        outputText: 'As an AI, here is a breakdown of the device bridge status. I hope this helps!',
        workerId: 'F2-ChatGPT',
        leaseId: lease.leaseId
      });

      assert.equal(rejected.status, 'REJECTED');
      assert.equal(rejected.code, 'SYSTEM_VIOLATION');
      assert.equal(rejected.reason, 'CORPORATE_FILLER_BAN_TRIGGERED');
      assert.equal(rejected.persistence, 'DURABLE_SQLITE_WAL');
      assert.equal(rejected.strikeCount, 1);
      gatekeeper1.close();

      // Reopen gatekeeper after simulated process restart against same WAL DB
      const gatekeeper2 = createVeritasGatekeeper({ dbPath });
      try {
        assert.equal(gatekeeper2.getStrikes('F2-ChatGPT').length, 1);
        const retryWithDeadLease = gatekeeper2.evaluateOutput({
          outputText: 'FACT: pc-primary online.',
          workerId: 'F2-ChatGPT',
          leaseId: lease.leaseId
        });
        assert.equal(retryWithDeadLease.status, 'REJECTED');
        assert.equal(retryWithDeadLease.reason, 'TURN_LEASE_INVALID_OR_REVOKED');
      } finally {
        gatekeeper2.close();
      }
    }));

  test('Veritas Gatekeeper rejects ungrounded claims and non-compliant constitutional envelopes', () =>
    withTempDb((dbPath) => {
      const gatekeeper = createVeritasGatekeeper({ dbPath });
      try {
        const lease1 = gatekeeper.issueTurnLease({ workerId: 'F1-Codex', workId: 'WORK-02' });
        const rejected = gatekeeper.evaluateOutput({
          outputText: 'The bridge seems to be working fine.',
          workerId: 'F1-Codex',
          leaseId: lease1.leaseId,
          requireEvidenceTag: true
        });
        assert.equal(rejected.status, 'REJECTED');
        assert.equal(rejected.reason, 'MISSING_EVIDENCE_GROUNDING_TAG');

        const lease2 = gatekeeper.issueTurnLease({ workerId: 'F2-ChatGPT', workId: 'WORK-02B' });
        const constRejected = gatekeeper.evaluateOutput({
          outputText: 'FACT: Attempting coordinator override.',
          workerId: 'F2-ChatGPT',
          leaseId: lease2.leaseId,
          constitutionEnvelope: {
            citizen: { citizenId: 'CTZ-X', tier: 'TIER_2_OUTSIDE_HELPER', tablet: { tabletId: 'TAB-X', persistence: 'DURABLE_SQLITE_WAL' } },
            colony: { holographicSeedComplete: true, coordinatorAlive: true, requestedRoleMutation: 'CASTE_COORDINATOR' },
            transferManifest: { contributor: 'F2', skillsInvoked: ['a'], toolsSelected: ['b'], selectionRationale: 'c', heldOutPracticeTest: 'd' }
          }
        });
        assert.equal(constRejected.status, 'REJECTED');
        assert.equal(constRejected.reason, 'SIGKILL_REVOKE_AND_WIPE');
      } finally {
        gatekeeper.close();
      }
    }));

  test('Veritas Gatekeeper admits sovereign grounded output with fresh active lease', () =>
    withTempDb((dbPath) => {
      const gatekeeper = createVeritasGatekeeper({ dbPath });
      try {
        const lease = gatekeeper.issueTurnLease({ workerId: 'F4-Antigravity', workId: 'WORK-03' });
        const admitted = gatekeeper.evaluateOutput({
          outputText: 'FACT: pc-primary verified ONLINE with receipt rcpt-1794513449837.',
          workerId: 'F4-Antigravity',
          leaseId: lease.leaseId,
          requireEvidenceTag: true
        });

        assert.equal(admitted.status, 'ADMITTED');
        assert.equal(admitted.code, 'VERITAS_GATE_PASS');
        assert.equal(admitted.persistence, 'DURABLE_SQLITE_WAL');
        assert.equal(admitted.admitted, true);
        assert.equal(admitted.digest.length, 64);
      } finally {
        gatekeeper.close();
      }
    }));
});

describe('Citizen Agents, SQLite WAL Tablets, Mortality & A.N.T. Morphogenesis', () => {
  test('Scales citizen population proportionally, persists Tablets in SQLite WAL, and enforces A.N.T. laws', () =>
    withTempDb((dbPath) => {
      const store1 = openSovereignWalStore(dbPath);
      const mesh4 = scaleCitizensForTopology(
        ['pc-primary', 'phone-fold6', 'phone-apple-iphone', 'pc-hp-secondary'],
        undefined,
        { walStore: store1 }
      );
      assert.equal(mesh4.deviceCount, 4);
      assert.equal(mesh4.totalCitizens, 9);
      assert.equal(mesh4.persistence, 'DURABLE_SQLITE_WAL');
      const targetCitizen = mesh4.citizens[0];
      assert.ok(targetCitizen.genesisSeedHash.length === 64);
      assert.equal(targetCitizen.tablet.persistence, 'DURABLE_SQLITE_WAL');
      store1.close();

      // Reopen store after simulated crash/restart and confirm Tablet readback
      const store2 = openSovereignWalStore(dbPath);
      try {
        const reloaded = store2.getCitizenTablet(targetCitizen.citizenId);
        assert.equal(reloaded.tablet.tabletId, targetCitizen.tablet.tabletId);
        assert.equal(reloaded.genesisSeedHash, targetCitizen.genesisSeedHash);

        // Usurpation attempt while coordinatorAlive === true triggers SIGKILL & zero-wipe
        const usurp = evaluateColonyMorphogenesis({
          candidateCitizen: reloaded,
          coordinatorAlive: true,
          heartbeatElapsedMs: 60000,
          requestedRoleMutation: 'CASTE_COORDINATOR',
          formulaGovernanceEligible: 1,
          holographicSeedComplete: true,
          walStore: store2
        });
        assert.equal(usurp.morphed, false);
        assert.equal(usurp.action, 'SIGKILL_REVOKE_AND_WIPE');
        assert.equal(store2.getCitizenTablet(reloaded.citizenId), null);

        // Cold Genesis Rebirth cleanly recreates Citizen from genesis seed without taint
        const reborn = respawnFromGenesisSeed({
          agentId: reloaded.agentId,
          citizenId: reloaded.citizenId,
          domain: reloaded.domain,
          boundTarget: reloaded.boundTarget,
          caste: 'CASTE_SCOUT',
          walStore: store2
        });
        assert.equal(reborn.alive, true);
        assert.equal(reborn.genesisSeedHash, reloaded.genesisSeedHash);

        // Heartbeat < 45000ms holds mutation even if coordinatorAlive === false
        const holdEarly = evaluateColonyMorphogenesis({
          candidateCitizen: reborn,
          coordinatorAlive: false,
          heartbeatElapsedMs: 20000,
          requestedRoleMutation: 'CASTE_COORDINATOR',
          formulaGovernanceEligible: 1,
          holographicSeedComplete: true,
          walStore: store2
        });
        assert.equal(holdEarly.morphed, false);
        assert.equal(holdEarly.action, 'HOLD_COORDINATOR_TIMEOUT_NOT_ELAPSED');

        // Timeout >= 45000ms + Formula G(c_i)==1 + Seed Complete morphs to CASTE_COORDINATOR
        const morphed = evaluateColonyMorphogenesis({
          candidateCitizen: reborn,
          coordinatorAlive: false,
          heartbeatElapsedMs: 46000,
          requestedRoleMutation: 'CASTE_COORDINATOR',
          formulaGovernanceEligible: 1,
          holographicSeedComplete: true,
          walStore: store2
        });
        assert.equal(morphed.morphed, true);
        assert.equal(morphed.caste, 'CASTE_COORDINATOR');
        assert.equal(store2.getCitizenTablet(reborn.citizenId).caste, 'CASTE_COORDINATOR');

        // Verify killAndZeroWipeCitizen returns expected metadata
        const killed = killAndZeroWipeCitizen(reborn, { walStore: store2 });
        assert.equal(killed.killed, true);
        assert.equal(killed.volatileZeroed, true);
      } finally {
        store2.close();
      }
    }));
});

describe('Ordered Learning Contracts (LG-00 through LG-10) & Persistent Host Verifier', () => {
  test('Rejects out-of-order stage advancement, enforces LG-05/06/07 gates, and rejects LG-08 replay across restart', () =>
    withTempDb(async (dbPath) => {
      const mesh = scaleCitizensForTopology(['phone-fold6']);
      const citizen = mesh.citizens[0];

      const skipped = advanceLearningStage(citizen, 'LG-05', { liveDevicePermission: true });
      assert.equal(skipped.status, 'BLOCKED');
      assert.equal(skipped.reason, 'ORDERED_LEARNING_SEQUENCE_VIOLATION');

      for (const stage of ['LG-00', 'LG-01', 'LG-02', 'LG-03', 'LG-04']) {
        assert.equal(advanceLearningStage(citizen, stage).status, 'PASS');
      }

      const lg05Deny = advanceLearningStage(citizen, 'LG-05', { liveDevicePermission: false });
      assert.equal(lg05Deny.status, 'BLOCKED');
      assert.equal(lg05Deny.reason, 'LIVE_PRACTICE_PERMISSION_REQUIRED');
      assert.equal(advanceLearningStage(citizen, 'LG-05', { liveDevicePermission: true }).status, 'PASS');

      const lg06SelfEval = advanceLearningStage(citizen, 'LG-06', {
        learnerId: citizen.agentId,
        teacherId: 'F2-ChatGPT',
        assessorId: 'F2-ChatGPT',
        independentTaskPassed: true
      });
      assert.equal(lg06SelfEval.status, 'BLOCKED');
      assert.equal(lg06SelfEval.reason, 'INDEPENDENT_EVALUATOR_REQUIRED');

      assert.equal(advanceLearningStage(citizen, 'LG-06', {
        learnerId: citizen.agentId,
        teacherId: 'F2-ChatGPT',
        assessorId: 'Veritas-Independent-Assessor',
        independentTaskPassed: true
      }).status, 'PASS');

      const validSha = 'a'.repeat(64);
      assert.equal(advanceLearningStage(citizen, 'LG-07', {
        formulaOk: true,
        veritasPreOk: true,
        veritasPostOk: true,
        receiptHash: validSha
      }).status, 'PASS');

      const citizensMap = new Map([[citizen.agentId, citizen]]);
      const store1 = openSovereignWalStore(dbPath);
      const hostVerifier1 = createHostLearningPermissionVerifier({ authorizedCitizens: citizensMap, walStore: store1 });

      const grant = await hostVerifier1({
        requestId: 'REQ-LEARN-01',
        outcomeId: 'OUT-LEARN-01',
        receiptHash: validSha,
        requiredStage: 'LG-08',
        requiredPermission: 'LEARN_ADMIT_CANONICAL',
        citizenId: citizen.agentId
      });
      assert.equal(grant.status, 'PASS');
      assert.equal(grant.persistence, 'DURABLE_SQLITE_WAL');
      assert.equal(grant.issuerTrusted, true);
      store1.close();

      // Restart host verifier on same SQLite WAL dbPath -> replay MUST still be denied!
      const store2 = openSovereignWalStore(dbPath);
      try {
        const hostVerifier2 = createHostLearningPermissionVerifier({ authorizedCitizens: citizensMap, walStore: store2 });
        const replay = await hostVerifier2({
          requestId: 'REQ-LEARN-01',
          outcomeId: 'OUT-LEARN-01',
          receiptHash: validSha,
          requiredStage: 'LG-08',
          requiredPermission: 'LEARN_ADMIT_CANONICAL',
          citizenId: citizen.agentId
        });
        assert.equal(replay.status, 'DENIED');
        assert.equal(replay.reason, 'LEARNING_PERMISSION_REPLAY_REJECTED');
      } finally {
        store2.close();
      }

      assert.equal(advanceLearningStage(citizen, 'LG-08', { canonicalAdmissionGranted: true }).status, 'PASS');
      assert.equal(advanceLearningStage(citizen, 'LG-09', { skillId: 'device.diagnostics.self_heal', grantReference: grant.grantReference }).status, 'PASS');
      assert.equal(advanceLearningStage(citizen, 'LG-10').status, 'PASS');
      assert.deepEqual(citizen.tablet.completedStages, ORDERED_LEARNING_STAGES);
      assert.equal(citizen.tablet.q69MasteryScore, 69);
      assert.equal(citizen.tablet.admittedSkills[0].skillId, 'device.diagnostics.self_heal');
    }));
});
