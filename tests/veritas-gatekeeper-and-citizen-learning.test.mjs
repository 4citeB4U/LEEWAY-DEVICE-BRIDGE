/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.GOVERNANCE.VERITAS_AND_LEARNING_TESTS
TAG: LEEWAY.TESTS.VERITAS_GATEKEEPER_CITIZEN_LEARNING.V1
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
5WH:
WHAT = Test suite for Veritas Output Gatekeeper, Sandwich Protocol, Citizen Agent Tablets, and Ordered Learning (LG-00..LG-10).
WHY = Prove non-negotiable enforcement of Law Zero cadence, proportional citizen scaling, and Runtime PR #174 LG-08 boundaries.
WHO = Creator/Human Authority and Antigravity F4.
WHERE = tests/veritas-gatekeeper-and-citizen-learning.test.mjs.
WHEN = 2026-11-12.
HOW = Automated Node.js test runner exercising allow/deny/replay and proportional topology scaling.
LICENSE: MIT
*/

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  wrapPromptWithLawZeroAnchor,
  createVeritasGatekeeper
} from '../operator/veritas-gatekeeper-middleware.mjs';
import {
  ORDERED_LEARNING_STAGES,
  scaleCitizensForTopology,
  advanceLearningStage,
  createHostLearningPermissionVerifier
} from '../operator/citizen-agent-tablet-registry.mjs';

describe('Veritas Output Gatekeeper & Sandwich Protocol', () => {
  test('Sandwich Protocol appends Law Zero Anchor at bottom of prompt for highest attention weight', () => {
    const wrapped = wrapPromptWithLawZeroAnchor('Check node health on Fold6.', {
      workerId: 'F2-ChatGPT',
      leaseId: 'LEASE-ABC123'
    });
    assert.ok(wrapped.startsWith('Check node health on Fold6.'));
    assert.ok(wrapped.includes('[LAW ZERO ANCHOR — RECENCY LOCK'));
    assert.ok(wrapped.includes('WORKER: F2-ChatGPT | LEASE: LEASE-ABC123'));
  });

  test('Veritas Gatekeeper rejects corporate filler, revokes lease, and logs strike', () => {
    const gatekeeper = createVeritasGatekeeper();
    const lease = gatekeeper.issueTurnLease({ workerId: 'F2-ChatGPT', workId: 'WORK-01' });

    const rejected = gatekeeper.evaluateOutput({
      outputText: 'As an AI, here is a breakdown of the device bridge status. I hope this helps!',
      workerId: 'F2-ChatGPT',
      leaseId: lease.leaseId
    });

    assert.equal(rejected.status, 'REJECTED');
    assert.equal(rejected.code, 'SYSTEM_VIOLATION');
    assert.equal(rejected.reason, 'CORPORATE_FILLER_BAN_TRIGGERED');
    assert.equal(rejected.strikeCount, 1);

    // Reusing the revoked lease must fail
    const retryWithDeadLease = gatekeeper.evaluateOutput({
      outputText: 'FACT: pc-primary online.',
      workerId: 'F2-ChatGPT',
      leaseId: lease.leaseId
    });
    assert.equal(retryWithDeadLease.status, 'REJECTED');
    assert.equal(retryWithDeadLease.reason, 'TURN_LEASE_INVALID_OR_REVOKED');
  });

  test('Veritas Gatekeeper rejects ungrounded claims when evidence tag is required', () => {
    const gatekeeper = createVeritasGatekeeper();
    const lease = gatekeeper.issueTurnLease({ workerId: 'F1-Codex', workId: 'WORK-02' });

    const rejected = gatekeeper.evaluateOutput({
      outputText: 'The bridge seems to be working fine.',
      workerId: 'F1-Codex',
      leaseId: lease.leaseId,
      requireEvidenceTag: true
    });

    assert.equal(rejected.status, 'REJECTED');
    assert.equal(rejected.reason, 'MISSING_EVIDENCE_GROUNDING_TAG');
  });

  test('Veritas Gatekeeper admits sovereign grounded output with fresh active lease', () => {
    const gatekeeper = createVeritasGatekeeper();
    const lease = gatekeeper.issueTurnLease({ workerId: 'F4-Antigravity', workId: 'WORK-03' });

    const admitted = gatekeeper.evaluateOutput({
      outputText: 'FACT: pc-primary verified ONLINE with receipt rcpt-1794513449837.',
      workerId: 'F4-Antigravity',
      leaseId: lease.leaseId,
      requireEvidenceTag: true
    });

    assert.equal(admitted.status, 'ADMITTED');
    assert.equal(admitted.code, 'VERITAS_GATE_PASS');
    assert.equal(admitted.admitted, true);
    assert.equal(admitted.digest.length, 64);
  });
});

describe('Citizen Agents, Mandatory Tablets & Topology-Proportional Scaling', () => {
  test('Scales citizen population proportionally between 4 devices and 12 devices', () => {
    const mesh4 = scaleCitizensForTopology(['pc-primary', 'phone-fold6', 'phone-apple-iphone', 'pc-hp-secondary']);
    assert.equal(mesh4.deviceCount, 4);
    assert.equal(mesh4.totalCitizens, 9); // 4 node citizens + 5 core domain citizens

    const mesh12 = scaleCitizensForTopology([
      'dev-1', 'dev-2', 'dev-3', 'dev-4', 'dev-5', 'dev-6',
      'dev-7', 'dev-8', 'dev-9', 'dev-10', 'dev-11', 'dev-12'
    ]);
    assert.equal(mesh12.deviceCount, 12);
    assert.equal(mesh12.totalCitizens, 17); // 12 node citizens + 5 core domain citizens
    assert.ok(mesh12.totalCitizens > mesh4.totalCitizens);

    for (const citizen of mesh12.citizens) {
      assert.equal(citizen.tier, 'TIER_1_LOCAL_IRON');
      assert.ok(citizen.tablet.tabletId.startsWith('TAB-'));
      assert.ok(citizen.tablet.skillsUsed.length > 0);
      assert.ok(citizen.tablet.toolsUsed.length > 0);
      assert.equal(citizen.tablet.selfProtectPolicy, 'FAIL_CLOSED_ON_UNAUTHORIZED_MUTATION');
    }
  });
});

describe('Ordered Learning Contracts (LG-00 through LG-10) & Host Verifier', () => {
  test('Rejects out-of-order stage advancement and enforces LG-05/LG-06/LG-07 gates', async () => {
    const mesh = scaleCitizensForTopology(['phone-fold6']);
    const citizen = mesh.citizens[0];

    // Cannot skip straight to LG-05
    const skipped = advanceLearningStage(citizen, 'LG-05', { liveDevicePermission: true });
    assert.equal(skipped.status, 'BLOCKED');
    assert.equal(skipped.reason, 'ORDERED_LEARNING_SEQUENCE_VIOLATION');

    // Progress cleanly LG-00 -> LG-04
    for (const stage of ['LG-00', 'LG-01', 'LG-02', 'LG-03', 'LG-04']) {
      const res = advanceLearningStage(citizen, stage);
      assert.equal(res.status, 'PASS');
    }

    // LG-05 requires explicit live device permission
    const lg05Deny = advanceLearningStage(citizen, 'LG-05', { liveDevicePermission: false });
    assert.equal(lg05Deny.status, 'BLOCKED');
    assert.equal(lg05Deny.reason, 'LIVE_PRACTICE_PERMISSION_REQUIRED');

    assert.equal(advanceLearningStage(citizen, 'LG-05', { liveDevicePermission: true }).status, 'PASS');

    // LG-06 requires independent assessor (assessor !== teacher && assessor !== learner)
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

    // LG-07 requires Formula + Veritas PRE/POST + 64-char Receipt hash
    const validSha = 'a'.repeat(64);
    assert.equal(advanceLearningStage(citizen, 'LG-07', {
      formulaOk: true,
      veritasPreOk: true,
      veritasPostOk: true,
      receiptHash: validSha
    }).status, 'PASS');

    // LG-08 Host-verified canonical learning admission (aligned with Runtime PR #174)
    const citizensMap = new Map([[citizen.agentId, citizen]]);
    const hostVerifier = createHostLearningPermissionVerifier({ authorizedCitizens: citizensMap });

    const grant = await hostVerifier({
      requestId: 'REQ-LEARN-01',
      outcomeId: 'OUT-LEARN-01',
      receiptHash: validSha,
      requiredStage: 'LG-08',
      requiredPermission: 'LEARN_ADMIT_CANONICAL',
      citizenId: citizen.agentId
    });
    assert.equal(grant.status, 'PASS');
    assert.equal(grant.issuerTrusted, true);
    assert.equal(grant.stage, 'LG-08');
    assert.equal(grant.permission, 'LEARN_ADMIT_CANONICAL');

    // Replaying the exact same learning admission request must be denied
    const replay = await hostVerifier({
      requestId: 'REQ-LEARN-01',
      outcomeId: 'OUT-LEARN-01',
      receiptHash: validSha,
      requiredStage: 'LG-08',
      requiredPermission: 'LEARN_ADMIT_CANONICAL',
      citizenId: citizen.agentId
    });
    assert.equal(replay.status, 'DENIED');
    assert.equal(replay.reason, 'LEARNING_PERMISSION_REPLAY_REJECTED');

    // Complete LG-08 -> LG-09 -> LG-10
    assert.equal(advanceLearningStage(citizen, 'LG-08', { canonicalAdmissionGranted: true }).status, 'PASS');
    assert.equal(advanceLearningStage(citizen, 'LG-09', { skillId: 'device.diagnostics.self_heal', grantReference: grant.grantReference }).status, 'PASS');
    assert.equal(advanceLearningStage(citizen, 'LG-10').status, 'PASS');
    assert.deepEqual(citizen.tablet.completedStages, ORDERED_LEARNING_STAGES);
    assert.equal(citizen.tablet.admittedSkills[0].skillId, 'device.diagnostics.self_heal');
  });
});
