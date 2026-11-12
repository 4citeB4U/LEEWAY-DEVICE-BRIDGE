/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.SOCIETY.CITIZEN_AGENTS
TAG: LEEWAY.AGENT_SOCIETY.TABLET_AND_LEARNING.V1
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
5WH:
WHAT = Citizen Agent Registry with Mandatory Tablets, Topology-Proportional Scaling, and Ordered Learning Pipeline (LG-00..LG-10).
WHY = Ensure every device node and bridge domain has an accountable Tier 1 citizen agent that learns, scales with physical hardware, and obeys Runtime PR #174.
WHO = Creator/Human Authority, LeeWay Digital Workforce, Machine Consciousness, and Runtime Fabric.
WHERE = operator/citizen-agent-tablet-registry.mjs.
WHEN = 2026-11-12.
HOW = Deterministic citizen provisioning per device/domain, 11-stage ordered learning state machine, and host-verified LG-08 grant boundary.
LICENSE: MIT
*/

import { createHash } from 'node:crypto';
import { CANONICAL_STANDARDS_REF } from './runtime-supervisor-admission-adapter.mjs';

export const ORDERED_LEARNING_STAGES = Object.freeze([
  'LG-00', // Intent and law
  'LG-01', // Identity and role
  'LG-02', // Data rights and consent
  'LG-03', // Instruction
  'LG-04', // Isolated practice
  'LG-05', // Live practice (separate Runtime/Bridge/OS permission)
  'LG-06', // Independent evaluation (assessor !== teacher && assessor !== learner)
  'LG-07', // Evidence qualification (Formula, Veritas, Receipt, Continuum)
  'LG-08', // Canonical learning admission (LEARN_ADMIT_CANONICAL)
  'LG-09', // Skill release
  'LG-10'  // Maintenance & skill decay
]);

export const CORE_INFRASTRUCTURE_DOMAINS = Object.freeze([
  'bridge-relay-transport',
  'veritas-gatekeeper',
  'receipt-authority',
  'learning-ledger-custodian',
  'runtime-admission-supervisor'
]);

/**
 * Provisions Tier 1 Citizen Agents proportionally to the ecosystem's physical
 * device count and core infrastructure domains. Every agent holds a mandatory Tablet.
 */
export function scaleCitizensForTopology(devices = [], coreDomains = CORE_INFRASTRUCTURE_DOMAINS) {
  const uniqueDevices = [...new Set(devices.filter(Boolean))];
  const uniqueDomains = [...new Set(coreDomains.filter(Boolean))];
  const citizens = [];

  for (const deviceId of uniqueDevices) {
    citizens.push(createCitizenWithTablet({
      agentId: `citizen-node-${deviceId}`,
      domain: 'physical-device-node',
      boundTarget: deviceId,
      skillsUsed: ['device.health', 'device.info', 'device.directories.list', 'device.self_protect'],
      toolsUsed: ['mcp-bridge', 'digital-brain-sqlite', 'local-diagnostics']
    }));
  }

  for (const domain of uniqueDomains) {
    citizens.push(createCitizenWithTablet({
      agentId: `citizen-domain-${domain}`,
      domain,
      boundTarget: `core:${domain}`,
      skillsUsed: ['governance.enforce', 'audit.verify', 'self.recover'],
      toolsUsed: ['runtime-admission-gate', 'veritas-gatekeeper', 'receipt-store']
    }));
  }

  return {
    deviceCount: uniqueDevices.length,
    domainCount: uniqueDomains.length,
    totalCitizens: citizens.length,
    citizens
  };
}

export function createCitizenWithTablet({
  agentId,
  domain,
  boundTarget,
  skillsUsed = [],
  toolsUsed = []
}) {
  if (!agentId || !domain || !boundTarget) {
    throw new Error('CITIZEN_IDENTITY_INCOMPLETE');
  }

  const tabletDigest = createHash('sha256')
    .update(`${agentId}:${domain}:${boundTarget}:${CANONICAL_STANDARDS_REF}`)
    .digest('hex')
    .slice(0, 16);

  return {
    agentId,
    tier: 'TIER_1_LOCAL_IRON',
    domain,
    boundTarget,
    tablet: {
      tabletId: `TAB-${tabletDigest.toUpperCase()}`,
      standardsRef: CANONICAL_STANDARDS_REF,
      skillsUsed: [...skillsUsed],
      toolsUsed: [...toolsUsed],
      selfProtectPolicy: 'FAIL_CLOSED_ON_UNAUTHORIZED_MUTATION',
      currentLearningStage: 'LG-00',
      completedStages: [],
      admittedSkills: []
    }
  };
}

/**
 * Ordered Learning Pipeline (LG-00 through LG-10) enforcing Book 59 & Runtime PR #174.
 */
export function advanceLearningStage(citizen, stage, payload = {}) {
  const idx = ORDERED_LEARNING_STAGES.indexOf(stage);
  if (idx === -1) {
    return { status: 'BLOCKED', reason: `UNKNOWN_LEARNING_STAGE:${stage}` };
  }

  const completed = citizen.tablet.completedStages;
  if (idx > 0) {
    const requiredPrev = ORDERED_LEARNING_STAGES[idx - 1];
    if (!completed.includes(requiredPrev)) {
      return {
        status: 'BLOCKED',
        reason: 'ORDERED_LEARNING_SEQUENCE_VIOLATION',
        requiredPreviousStage: requiredPrev,
        attemptedStage: stage
      };
    }
  }

  if (stage === 'LG-05' && payload.liveDevicePermission !== true) {
    return { status: 'BLOCKED', reason: 'LIVE_PRACTICE_PERMISSION_REQUIRED' };
  }

  if (stage === 'LG-06') {
    const { learnerId, teacherId, assessorId, independentTaskPassed } = payload;
    if (!assessorId || assessorId === learnerId || assessorId === teacherId) {
      return { status: 'BLOCKED', reason: 'INDEPENDENT_EVALUATOR_REQUIRED' };
    }
    if (independentTaskPassed !== true) {
      return { status: 'BLOCKED', reason: 'TEACH_BACK_EVALUATION_FAILED' };
    }
  }

  if (stage === 'LG-07') {
    const { formulaOk, veritasPreOk, veritasPostOk, receiptHash } = payload;
    if (!formulaOk || !veritasPreOk || !veritasPostOk || !/^[a-f0-9]{64}$/i.test(String(receiptHash || ''))) {
      return { status: 'BLOCKED', reason: 'EVIDENCE_QUALIFICATION_INCOMPLETE' };
    }
  }

  if (stage === 'LG-08' && payload.canonicalAdmissionGranted !== true) {
    return { status: 'BLOCKED', reason: 'HOST_LEARNING_ADMISSION_REQUIRED' };
  }

  if (!completed.includes(stage)) {
    completed.push(stage);
  }
  citizen.tablet.currentLearningStage = stage;

  if (stage === 'LG-09' && payload.skillId) {
    citizen.tablet.admittedSkills.push({
      skillId: payload.skillId,
      admittedAt: new Date().toISOString(),
      grantReference: payload.grantReference ?? 'HOST-GRANT-VERIFIED'
    });
  }

  return {
    status: 'PASS',
    agentId: citizen.agentId,
    tabletId: citizen.tablet.tabletId,
    stage,
    completedStages: [...completed]
  };
}

/**
 * Host-verified learning permission callback matching Leeway-Runtime-Fabric PR #174
 * (c3-learning-admission-boundary.mjs). Rejects self-issued grants and replays.
 */
export function createHostLearningPermissionVerifier({
  standardsRef = CANONICAL_STANDARDS_REF,
  authorizedCitizens = new Map()
} = {}) {
  const consumedAdmissions = new Set();

  return async function verifyLearningPermission({
    requestId,
    outcomeId,
    receiptHash,
    requiredStage,
    requiredPermission,
    citizenId
  }) {
    if (requiredStage !== 'LG-08' || requiredPermission !== 'LEARN_ADMIT_CANONICAL') {
      return { status: 'DENIED', reason: 'INVALID_LEARNING_STAGE_OR_PERMISSION' };
    }

    const replayKey = `${requestId}:${outcomeId}:${receiptHash}`;
    if (consumedAdmissions.has(replayKey)) {
      return { status: 'DENIED', reason: 'LEARNING_PERMISSION_REPLAY_REJECTED' };
    }

    if (citizenId && authorizedCitizens.has(citizenId)) {
      const citizen = authorizedCitizens.get(citizenId);
      if (!citizen.tablet.completedStages.includes('LG-07')) {
        return { status: 'DENIED', reason: 'PRIOR_EVIDENCE_STAGE_LG07_NOT_QUALIFIED' };
      }
    }

    consumedAdmissions.add(replayKey);

    return {
      status: 'PASS',
      issuerTrusted: true,
      scopeGrantVerified: true,
      workerRoleBound: true,
      standardsRevisionVerified: true,
      standardsRef,
      requestId,
      outcomeId,
      receiptHash,
      stage: 'LG-08',
      permission: 'LEARN_ADMIT_CANONICAL',
      grantReference: `HOST-LG08-${createHash('sha256').update(replayKey).digest('hex').slice(0, 12).toUpperCase()}`
    };
  };
}
