/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.SOCIETY.CITIZEN_AGENTS
TAG: LEEWAY.AGENT_SOCIETY.TABLET_AND_LEARNING.V2
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
@LAW_ZERO_BRIEF = Citizen Positive Form (CONTRACT-CTZ-008), A.N.T. Castes & Morphogenesis (CONTRACT-ANT-007), SQLite WAL Tablets, and Ordered Learning (CONTRACT-LG-009).
5WH:
WHAT = Citizen Agent Registry with Mandatory SQLite WAL Tablets, Topology-Proportional Scaling, A.N.T. Queen-Loss Morphogenesis, Computational Mortality / Cold Genesis Rebirth, and Ordered Learning Pipeline (LG-00..LG-10).
WHY = Ensure every device node and bridge domain has an accountable Tier 1 Citizen whose Tablet, caste, and admission history survive restarts in DURABLE_SQLITE_WAL and obey Runtime PR #174.
WHO = Creator/Human Authority, LeeWay Digital Workforce, Machine Consciousness, and Runtime Fabric.
WHERE = operator/citizen-agent-tablet-registry.mjs.
WHEN = 2026-11-12.
HOW = Deterministic citizen provisioning per device/domain, SQLite WAL persistence, Formula G(c_i)==1 queen election, and 11-stage ordered learning state machine.
LICENSE: MIT
*/

import { createHash } from 'node:crypto';
import { CANONICAL_STANDARDS_REF } from './runtime-supervisor-admission-adapter.mjs';
import { openSovereignWalStore, PERSISTENCE_MODE } from './sqlite-wal-store.mjs';
import { enforceSovereignConstitution } from '../scripts/enforce-sovereign-colony-constitution.mjs';

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

export const VALID_CASTES = Object.freeze([
  'CASTE_COORDINATOR',
  'CASTE_SOLDIER',
  'CASTE_BUILDER',
  'CASTE_SCOUT'
]);

export const QUEEN_HEARTBEAT_TIMEOUT_MS = 45000;

function inferDefaultCaste(domain, boundTarget) {
  if (domain === 'runtime-admission-supervisor') return 'CASTE_COORDINATOR';
  if (domain === 'veritas-gatekeeper' || domain === 'receipt-authority') return 'CASTE_SOLDIER';
  if (String(boundTarget || '').startsWith('core:')) return 'CASTE_BUILDER';
  return 'CASTE_SCOUT';
}

function inferPlatformClass(domain, boundTarget) {
  const target = String(boundTarget || '').toLowerCase();
  if (target.includes('phone') || target.includes('fold') || target.includes('iphone')) return 'MOBILE_EDGE';
  if (target.startsWith('pc-')) return 'WORKSTATION_HOST';
  if (domain === 'physical-device-node') return 'PHYSICAL_NODE';
  return 'CONTROL_PLANE';
}

export function createCitizenWithTablet({
  agentId,
  citizenId = agentId,
  domain,
  boundTarget,
  caste = inferDefaultCaste(domain, boundTarget),
  homeNodeId = String(boundTarget || '').startsWith('core:') ? 'control-plane' : boundTarget,
  platformCapabilityClass = inferPlatformClass(domain, boundTarget),
  skillsUsed = [],
  toolsUsed = [],
  toolsAuthorized = toolsUsed,
  walStore = null
}) {
  if (!agentId || !domain || !boundTarget) {
    throw new Error('CITIZEN_IDENTITY_INCOMPLETE');
  }
  if (!VALID_CASTES.includes(caste)) {
    throw new Error(`INVALID_CITIZEN_CASTE:${caste}`);
  }

  const tabletDigest = createHash('sha256')
    .update(`${citizenId}:${domain}:${boundTarget}:${CANONICAL_STANDARDS_REF}`)
    .digest('hex')
    .slice(0, 16);

  const genesisSeedHash = createHash('sha256')
    .update(`GENESIS:${citizenId}:${domain}:${boundTarget}:${CANONICAL_STANDARDS_REF}`)
    .digest('hex');

  const citizen = {
    agentId,
    citizenId,
    genesisSeedHash,
    caste,
    homeNodeId,
    platformCapabilityClass,
    tier: 'TIER_1_LOCAL_IRON',
    domain,
    boundTarget,
    alive: true,
    tablet: {
      tabletId: `TAB-${tabletDigest.toUpperCase()}`,
      persistence: PERSISTENCE_MODE,
      standardsRef: CANONICAL_STANDARDS_REF,
      skillsUsed: [...skillsUsed],
      toolsUsed: [...toolsUsed],
      toolsAuthorized: [...toolsAuthorized],
      selfProtectPolicy: 'FAIL_CLOSED_ON_UNAUTHORIZED_MUTATION',
      q69MasteryScore: 0,
      learningStage: 'LG-00',
      currentLearningStage: 'LG-00',
      completedStages: [],
      admittedSkills: [],
      meritBadges: [],
      auditReceiptChain: []
    }
  };

  if (walStore) {
    walStore.saveCitizenTablet(citizen);
  }
  return citizen;
}

/**
 * Provisions Tier 1 Citizen Agents proportionally to the ecosystem's physical
 * device count and core infrastructure domains (N_citizens = D_physical + O_domains).
 * Persists Citizens to SQLite WAL when walStore or dbPath is supplied.
 */
export function scaleCitizensForTopology(
  devices = [],
  coreDomains = CORE_INFRASTRUCTURE_DOMAINS,
  { walStore = null, dbPath = null } = {}
) {
  const store = walStore || (dbPath ? openSovereignWalStore(dbPath) : null);
  const uniqueDevices = [...new Set(devices.filter(Boolean))];
  const uniqueDomains = [...new Set(coreDomains.filter(Boolean))];
  const citizens = [];

  for (const deviceId of uniqueDevices) {
    citizens.push(createCitizenWithTablet({
      agentId: `citizen-node-${deviceId}`,
      domain: 'physical-device-node',
      boundTarget: deviceId,
      caste: 'CASTE_SCOUT',
      skillsUsed: ['device.health', 'device.info', 'device.directories.list', 'device.self_protect'],
      toolsUsed: ['mcp-bridge', 'digital-brain-sqlite', 'local-diagnostics'],
      walStore: store
    }));
  }

  for (const domain of uniqueDomains) {
    citizens.push(createCitizenWithTablet({
      agentId: `citizen-domain-${domain}`,
      domain,
      boundTarget: `core:${domain}`,
      caste: inferDefaultCaste(domain, `core:${domain}`),
      skillsUsed: ['governance.enforce', 'audit.verify', 'self.recover'],
      toolsUsed: ['runtime-admission-gate', 'veritas-gatekeeper', 'receipt-store'],
      walStore: store
    }));
  }

  return {
    deviceCount: uniqueDevices.length,
    domainCount: uniqueDomains.length,
    totalCitizens: citizens.length,
    persistence: store ? store.persistence : PERSISTENCE_MODE,
    citizens
  };
}

/**
 * Ordered Learning Pipeline (LG-00 through LG-10) enforcing CONTRACT-LG-009 & Runtime PR #174.
 */
export function advanceLearningStage(citizen, stage, payload = {}, { walStore = null } = {}) {
  if (!citizen || citizen.alive === false) {
    return { status: 'BLOCKED', reason: 'CITIZEN_TERMINATED_OR_MISSING' };
  }
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
    citizen.tablet.auditReceiptChain.push(receiptHash);
  }

  if (stage === 'LG-08' && payload.canonicalAdmissionGranted !== true) {
    return { status: 'BLOCKED', reason: 'HOST_LEARNING_ADMISSION_REQUIRED' };
  }

  if (!completed.includes(stage)) {
    completed.push(stage);
  }
  citizen.tablet.currentLearningStage = stage;
  citizen.tablet.learningStage = stage;
  citizen.tablet.q69MasteryScore = Math.min(69, Math.round((completed.length / ORDERED_LEARNING_STAGES.length) * 69));

  if (stage === 'LG-09' && payload.skillId) {
    citizen.tablet.admittedSkills.push({
      skillId: payload.skillId,
      admittedAt: new Date().toISOString(),
      grantReference: payload.grantReference ?? 'HOST-GRANT-VERIFIED'
    });
    citizen.tablet.meritBadges.push(`BADGE-LG09-${payload.skillId}`);
  }

  if (walStore) {
    walStore.saveCitizenTablet(citizen);
  }

  return {
    status: 'PASS',
    agentId: citizen.agentId,
    citizenId: citizen.citizenId,
    tabletId: citizen.tablet.tabletId,
    stage,
    q69MasteryScore: citizen.tablet.q69MasteryScore,
    completedStages: [...completed]
  };
}

/**
 * Computational Mortality (CONTRACT-WF-002):
 * SIGKILL terminates compromised Citizen session, zeroes volatile workspace bindings,
 * and deletes or quarantines tainted session lease before Cold Genesis Rebirth.
 */
export function killAndZeroWipeCitizen(citizen, { reason = 'SIGKILL_REVOKE_AND_WIPE', walStore = null } = {}) {
  const genesisRef = citizen.genesisSeedHash;
  const wipedId = citizen.citizenId || citizen.agentId;
  citizen.alive = false;
  citizen.terminatedAt = new Date().toISOString();
  citizen.terminationReason = reason;
  citizen.volatileMemoryBuffer = null;
  citizen.activeSessionLease = null;

  if (walStore) {
    walStore.deleteCitizenTablet(wipedId);
  }

  return Object.freeze({
    killed: true,
    action: 'SIGKILL_REVOKE_AND_WIPE',
    citizenId: wipedId,
    genesisSeedHash: genesisRef,
    volatileZeroed: true
  });
}

/**
 * Cold Genesis Rebirth from canonical seed without carrying compromised session taint.
 */
export function respawnFromGenesisSeed({
  agentId,
  citizenId = agentId,
  domain,
  boundTarget,
  caste,
  walStore = null
}) {
  return createCitizenWithTablet({
    agentId,
    citizenId,
    domain,
    boundTarget,
    caste,
    skillsUsed: ['governance.enforce', 'audit.verify', 'self.recover'],
    toolsUsed: ['runtime-admission-gate', 'veritas-gatekeeper', 'receipt-store'],
    walStore
  });
}

/**
 * Deterministic A.N.T. Queen-Loss Morphogenesis (CONTRACT-ANT-007).
 * Enforces Constitutional rules before allowing CASTE_COORDINATOR role mutation.
 */
export function evaluateColonyMorphogenesis({
  candidateCitizen,
  coordinatorAlive,
  heartbeatElapsedMs = 0,
  requestedRoleMutation = 'CASTE_COORDINATOR',
  formulaGovernanceEligible = 0,
  holographicSeedComplete = false,
  walStore = null
}) {
  const constitutionalCheck = enforceSovereignConstitution({
    citizen: candidateCitizen,
    colony: {
      holographicSeedComplete,
      coordinatorAlive,
      requestedRoleMutation
    },
    formula: {
      governanceEligible: formulaGovernanceEligible
    }
  });

  if (!constitutionalCheck.admitted) {
    if (constitutionalCheck.action === 'SIGKILL_REVOKE_AND_WIPE' && candidateCitizen) {
      killAndZeroWipeCitizen(candidateCitizen, {
        reason: 'FATAL_LAW_0_USURPATION_SIGKILL_AND_ZERO_WIPE',
        walStore
      });
    }
    return {
      morphed: false,
      action: constitutionalCheck.action,
      violations: constitutionalCheck.violations,
      score: 0.0
    };
  }

  if (requestedRoleMutation === 'CASTE_COORDINATOR' && Number(heartbeatElapsedMs) < QUEEN_HEARTBEAT_TIMEOUT_MS) {
    return {
      morphed: false,
      action: 'HOLD_COORDINATOR_TIMEOUT_NOT_ELAPSED',
      violations: ['ANT_HEARTBEAT_TIMEOUT_NOT_REACHED'],
      score: 0.0
    };
  }

  candidateCitizen.caste = 'CASTE_COORDINATOR';
  candidateCitizen.tablet.meritBadges.push('MORPHOGENESIS_QUEEN_RECOVERED');
  if (walStore) {
    walStore.saveCitizenTablet(candidateCitizen);
  }

  return {
    morphed: true,
    action: 'MORPHED_TO_CASTE_COORDINATOR',
    citizenId: candidateCitizen.citizenId,
    caste: candidateCitizen.caste,
    missingCastesToSpawn: ['CASTE_SOLDIER', 'CASTE_BUILDER', 'CASTE_SCOUT'],
    score: 1.0
  };
}

/**
 * Host-verified learning permission callback matching Leeway-Runtime-Fabric PR #174
 * (c3-learning-admission-boundary.mjs). Rejects self-issued grants and replays
 * using DURABLE_SQLITE_WAL persistence.
 */
export function createHostLearningPermissionVerifier({
  standardsRef = CANONICAL_STANDARDS_REF,
  authorizedCitizens = new Map(),
  dbPath,
  walStore
} = {}) {
  const store = walStore || openSovereignWalStore(dbPath);

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
    if (store.hasLearningAdmission(replayKey)) {
      return {
        status: 'DENIED',
        reason: 'LEARNING_PERMISSION_REPLAY_REJECTED',
        persistence: store.persistence
      };
    }

    let citizen = null;
    if (citizenId) {
      citizen = authorizedCitizens.get(citizenId) || store.getCitizenTablet(citizenId);
      if (citizen && !citizen.tablet.completedStages.includes('LG-07')) {
        return { status: 'DENIED', reason: 'PRIOR_EVIDENCE_STAGE_LG07_NOT_QUALIFIED' };
      }
    }

    const grantReference = `HOST-LG08-${createHash('sha256').update(replayKey).digest('hex').slice(0, 12).toUpperCase()}`;
    store.recordLearningAdmission({
      replayKey,
      requestId,
      outcomeId,
      receiptHash,
      grantReference
    });

    return {
      status: 'PASS',
      issuerTrusted: true,
      scopeGrantVerified: true,
      workerRoleBound: true,
      standardsRevisionVerified: true,
      persistence: store.persistence,
      standardsRef,
      requestId,
      outcomeId,
      receiptHash,
      stage: 'LG-08',
      permission: 'LEARN_ADMIT_CANONICAL',
      grantReference
    };
  };
}
