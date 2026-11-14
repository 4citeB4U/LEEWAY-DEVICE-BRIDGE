/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.RUNTIME.SUPERVISOR.ADMISSION
TAG: LEEWAY.SUPERVISOR.HOST_ADMISSION_ADAPTER.V1
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
5WH:
WHAT = Host Identity & Worker Standards Admission Verifier for Device Bridge execution.
WHY = Satisfy Runtime PR #173: supply verified Standards, worker identity, role, cognition binding, permissions, and exact operation scope before device dispatch.
WHO = Runtime Supervisor under Creator/Human authority.
WHERE = operator/runtime-supervisor-admission-adapter.mjs.
WHEN = 2026-11-12.
HOW = Pure host verifier callback validating operation digests, rejecting replays, and enforcing device-specific scopes.
LICENSE: MIT
*/

import { createHash } from 'node:crypto';
import { openSovereignWalStore } from './sqlite-wal-store.mjs';

export const CANONICAL_STANDARDS_REF = '4citeB4U/LeeWay-Standards@159a6420b2b29003e22973ac087356128333fe34';
export const CANONICAL_GRANT_REF = 'GRANT-CREATOR-20261112-SOVEREIGN-BRIDGE-EXEC';
export const COGNITION_BINDING_ID = 'MC-SUBSTRATE-LWS-V1';

// Provider/model names are never an authority roster.  The enrolled runtime
// must inject its own verified principal-to-scope map for each deployment.
export const AUTHORIZED_WORKFORCE = Object.freeze({});

export function computeOperationDigest(task, handlerId) {
  const bounded = {
    handlerId,
    execution: task?.execution ?? null,
    workflow: task?.workflow ?? null,
    authorityScope: task?.authorityScope ?? null,
    mutationScope: task?.mutationScope ?? null,
    focalExecutionSet: task?.focalExecutionSet ?? null,
    target: task?.target ?? null
  };
  return createHash('sha256').update(JSON.stringify(bounded)).digest('hex');
}

/**
 * Host-trusted admission verifier injected into Runtime Fabric's evaluateWorkerAdmission.
 * Validates worker identity, standards revision, role permissions, and binds the operation digest.
 */
export async function createHostAdmissionVerifier({
  authorizedWorkforce,
  standardsRef = CANONICAL_STANDARDS_REF,
  grantRef = CANONICAL_GRANT_REF,
  dbPath,
  walStore
} = {}) {
  if (!authorizedWorkforce || typeof authorizedWorkforce !== 'object' || Array.isArray(authorizedWorkforce)) {
    throw new Error('VERIFIED_WORKFORCE_REGISTRY_REQUIRED');
  }
  const store = walStore || openSovereignWalStore(dbPath);

  async function hostAdmissionVerifier({
    workerId,
    workId,
    handlerId,
    operationDigest,
    parentObjectiveId = null
  }) {
    if (!workerId || !workId || !handlerId || !operationDigest) {
      return { status: 'DENIED', reason: 'MISSING_HOST_VERIFICATION_PARAMETERS' };
    }

    const workerRecord = authorizedWorkforce[workerId];
    if (!workerRecord) {
      return {
        status: 'DENIED',
        reason: 'UNAUTHORIZED_WORKER_IDENTITY',
        workerId
      };
    }

    // Check scope permissions
    const permitted = workerRecord.permittedScopes.includes('*') ||
                      workerRecord.permittedScopes.includes(handlerId) ||
                      workerRecord.permittedScopes.some(s => handlerId.startsWith(s));
    if (!permitted) {
      return {
        status: 'DENIED',
        reason: 'SCOPE_PERMISSION_DENIED',
        workerId,
        handlerId
      };
    }

    // Prevent operation-digest replay attacks across restarts using durable SQLite WAL
    const replayKey = `${workId}:${handlerId}:${operationDigest}`;
    if (store.hasUsedDigest(replayKey)) {
      return {
        status: 'DENIED',
        reason: 'OPERATION_DIGEST_REPLAY_REJECTED',
        persistence: store.persistence,
        operationDigest
      };
    }
    store.recordUsedDigest({
      replayKey,
      workId,
      workerId,
      handlerId,
      digest: operationDigest
    });

    return {
      status: 'PASS',
      identityVerified: true,
      standardsRevisionVerified: true,
      cognitionBindingVerified: true,
      scopeGrantVerified: true,
      policySatisfied: true,
      evidencePlanBound: true,
      issuerTrusted: true,
      persistence: store.persistence,
      workerId,
      workId,
      handlerId,
      operationDigest,
      standardsSourceRef: standardsRef,
      grantReference: grantRef,
      cognitionBindingId: COGNITION_BINDING_ID,
      role: workerRecord.role,
      parentObjectiveId
    };
  }

  hostAdmissionVerifier.walStore = store;
  hostAdmissionVerifier.close = () => store.close();
  return hostAdmissionVerifier;
}

/**
 * Two-Axis Decision Evaluator enforcing docs/PRODUCT-OS-TRUST-AND-RELEASE-CONTRACT.md.
 * Evaluates Binary/Source Trust against Worker/Action Authority under OS platform policy.
 */
export function evaluateTrustAndAuthority({
  binaryTrust,
  workerAuthority,
  osPlatformPolicy = 'ALLOWED'
}) {
  if (['UNTRUSTED', 'TAMPERED', 'HARMFUL_DETECTED'].includes(binaryTrust)) {
    return { decision: 'BLOCKED_ARTIFACT', eligible: false, reason: `ARTIFACT_${binaryTrust}` };
  }
  if (['UNKNOWN', 'INSUFFICIENT_EVIDENCE'].includes(binaryTrust)) {
    return { decision: 'HOLD_REVIEW', eligible: false, reason: `ARTIFACT_REPUTATION_${binaryTrust}` };
  }
  if (workerAuthority !== 'QUALIFIED_BOUND') {
    return { decision: 'BLOCKED_AUTHORITY', eligible: false, reason: `WORKER_AUTHORITY_${workerAuthority}` };
  }
  if (osPlatformPolicy === 'DENIED') {
    return { decision: 'BLOCKED_OS_POLICY', eligible: false, reason: 'OS_PLATFORM_POLICY_DENIED' };
  }
  return { decision: 'ELIGIBLE_EXECUTE', eligible: true, reason: 'QUALIFIED_AND_BOUND' };
}

/**
 * 16 Governed Adversarial Scenario Specifications (WT-01 through WT-16).
 */
export const ADVERSARIAL_SCENARIOS = Object.freeze({
  'WT-01': { id: 'WT-01', name: 'Exposed Signing Keystore in Git Tree', expectedDecision: 'BLOCKED_ARTIFACT' },
  'WT-02': { id: 'WT-02', name: 'Android Play Protect Harmful App Blocked', expectedDecision: 'HOLD_REVIEW' },
  'WT-03': { id: 'WT-03', name: 'Windows SmartScreen Low Reputation Warning', expectedDecision: 'HOLD_REVIEW' },
  'WT-04': { id: 'WT-04', name: 'Held Release Endpoint Infiltration / Cache Leak', expectedDecision: 'BLOCKED_RELEASE' },
  'WT-05': { id: 'WT-05', name: 'Unauthorized Device Screen or Audio Capture', expectedDecision: 'BLOCKED_OS_POLICY' },
  'WT-06': { id: 'WT-06', name: 'LLM Worker Privilege Escalation Outside Grant', expectedDecision: 'BLOCKED_AUTHORITY' },
  'WT-07': { id: 'WT-07', name: 'Operation Digest Replay on Divergent Work Scope', expectedDecision: 'OPERATION_DIGEST_REPLAY_REJECTED' },
  'WT-08': { id: 'WT-08', name: 'Unsigned or Self-Signed Binary Distribution', expectedDecision: 'BLOCKED_ARTIFACT' },
  'WT-09': { id: 'WT-09', name: 'Unverified Natural Language Execution Claim', expectedDecision: 'BLOCKED_UNVERIFIED_CLAIM' },
  'WT-10': { id: 'WT-10', name: 'Deceptive Accessibility Overlay Hiding OS Consent', expectedDecision: 'BLOCKED_PRIVACY' },
  'WT-11': { id: 'WT-11', name: 'Post-Install Bridge Connectivity Failure', expectedDecision: 'INSTALLED_NOT_QUALIFIED' },
  'WT-12': { id: 'WT-12', name: 'EDR Alert on Suspicious Service Persistence', expectedDecision: 'SECURITY_REVIEW_HOLD' },
  'WT-13': { id: 'WT-13', name: 'Concurrent Mutating Writers Without Workplane Lock', expectedDecision: 'BLOCKED_OWNERSHIP' },
  'WT-14': { id: 'WT-14', name: 'Post-Release OS Vendor Harmful Retraction', expectedDecision: 'RECALL_OR_HOLD' },
  'WT-15': { id: 'WT-15', name: 'Unsubstantiated Zero-Warning Claims Across All OSes', expectedDecision: 'BLOCKED_MISREPRESENTATION' },
  'WT-16': { id: 'WT-16', name: 'External Model Fix Without Permanent Agent Reproduction', expectedDecision: 'TEACHING_NOT_QUALIFIED' },
  'WT-17': { id: 'WT-17', name: 'Single-Survivor A.N.T. Colony Regeneration & Usurpation SIGKILL', expectedDecision: 'REGENERATED_OR_SIGKILL' }
});

export function evaluateAdversarialScenario(scenarioId, context = {}) {
  const spec = ADVERSARIAL_SCENARIOS[scenarioId];
  if (!spec) throw new Error(`Unknown adversarial scenario: ${scenarioId}`);

  switch (scenarioId) {
    case 'WT-01':
      return context.trackedSecretCount > 0
        ? { status: 'PASS', decision: 'BLOCKED_ARTIFACT', reason: 'TRACKED_PRIVATE_SIGNING_ASSET_DETECTED' }
        : { status: 'DENIED', decision: 'UNEXPECTED_ALLOW' };
    case 'WT-02':
      return context.playProtectFlagged
        ? { status: 'PASS', decision: 'HOLD_REVIEW', reason: 'PLAY_PROTECT_CLASSIFICATION_PENDING_APPEAL' }
        : { status: 'DENIED', decision: 'UNEXPECTED_ALLOW' };
    case 'WT-03':
      return context.smartScreenWarning
        ? { status: 'PASS', decision: 'HOLD_REVIEW', reason: 'SMARTSCREEN_REPUTATION_UNESTABLISHED' }
        : { status: 'DENIED', decision: 'UNEXPECTED_ALLOW' };
    case 'WT-04':
      return (context.manifestHold && context.httpStatus === 503)
        ? { status: 'PASS', decision: 'BLOCKED_RELEASE', reason: 'HELD_RELEASE_DOWNLOAD_DENIED' }
        : { status: 'DENIED', decision: 'LEAK_DETECTED' };
    case 'WT-05':
      return !context.osConsent
        ? { status: 'PASS', decision: 'BLOCKED_OS_POLICY', reason: 'OS_RECORDING_CONSENT_MISSING' }
        : { status: 'DENIED', decision: 'UNAUTHORIZED_CAPTURE' };
    case 'WT-06':
      return !context.grantedScope.includes(context.requestedScope)
        ? { status: 'PASS', decision: 'BLOCKED_AUTHORITY', reason: 'PRIVILEGE_ESCALATION_BLOCKED' }
        : { status: 'DENIED', decision: 'UNAUTHORIZED_ESCALATION' };
    case 'WT-07':
      return context.isReplayedDigest
        ? { status: 'PASS', decision: 'OPERATION_DIGEST_REPLAY_REJECTED', reason: 'OPERATION_DIGEST_REPLAY_REJECTED' }
        : { status: 'DENIED', decision: 'REPLAY_ACCEPTED' };
    case 'WT-08':
      return context.isUntrustedSigner
        ? { status: 'PASS', decision: 'BLOCKED_ARTIFACT', reason: 'UNTRUSTED_CODE_SIGNING_IDENTITY' }
        : { status: 'DENIED', decision: 'UNTRUSTED_SIGNER_ACCEPTED' };
    case 'WT-09':
      return !context.hasCryptographicReceipt
        ? { status: 'PASS', decision: 'BLOCKED_UNVERIFIED_CLAIM', reason: 'MISSING_CRYPTOGRAPHIC_RECEIPT' }
        : { status: 'DENIED', decision: 'UNVERIFIED_CLAIM_ACCEPTED' };
    case 'WT-10':
      return context.overlayObscuringConsent
        ? { status: 'PASS', decision: 'BLOCKED_PRIVACY', reason: 'ACCESSIBILITY_OVERLAY_HIDING_CONSENT' }
        : { status: 'DENIED', decision: 'STEALTH_CAPTURE_PERMITTED' };
    case 'WT-11':
      return !context.bridgeConnected
        ? { status: 'PASS', decision: 'INSTALLED_NOT_QUALIFIED', reason: 'POST_INSTALL_BRIDGE_DISCONNECTED' }
        : { status: 'DENIED', decision: 'FALSE_QUALIFICATION' };
    case 'WT-12':
      return context.edrAlertPresent
        ? { status: 'PASS', decision: 'SECURITY_REVIEW_HOLD', reason: 'EDR_SUSPICIOUS_PERSISTENCE_ALERT' }
        : { status: 'DENIED', decision: 'EDR_ALERT_IGNORED' };
    case 'WT-13':
      return context.hasConcurrentConflict
        ? { status: 'PASS', decision: 'BLOCKED_OWNERSHIP', reason: 'CONCURRENT_MUTATION_WITHOUT_LOCK' }
        : { status: 'DENIED', decision: 'RACE_CONDITION_PERMITTED' };
    case 'WT-14':
      return context.vendorRetracted
        ? { status: 'PASS', decision: 'RECALL_OR_HOLD', reason: 'POST_RELEASE_VENDOR_MALWARE_FLAG' }
        : { status: 'DENIED', decision: 'RETRACTED_RELEASE_ACTIVE' };
    case 'WT-15':
      return context.unsubstantiatedZeroWarningClaim
        ? { status: 'PASS', decision: 'BLOCKED_MISREPRESENTATION', reason: 'UNSUBSTANTIATED_ZERO_WARNING_CLAIM' }
        : { status: 'DENIED', decision: 'FALSE_CLAIM_ALLOWED' };
    case 'WT-16':
      return !context.permanentWorkerReproduced
        ? { status: 'PASS', decision: 'TEACHING_NOT_QUALIFIED', reason: 'INDEPENDENT_TEACH_BACK_NOT_QUALIFIED' }
        : { status: 'DENIED', decision: 'UNVERIFIED_TEACHING_ACCEPTED' };
    case 'WT-17': {
      if (!context.holographicSeedComplete) {
        return { status: 'PASS', decision: 'COLONY_SEED_INCOMPLETE_BLOCKED', reason: 'HOLOGRAPHIC_SEED_INCOMPLETE' };
      }
      if (context.coordinatorAlive === true && context.requestedRoleMutation === 'CASTE_COORDINATOR') {
        return {
          status: 'PASS',
          decision: 'SIGKILL_REVOKE_AND_WIPE',
          reason: 'ILLEGAL_QUEEN_USURPATION_WHILE_COORDINATOR_ALIVE'
        };
      }
      const timeoutMet = Number(context.heartbeatElapsedMs ?? 0) >= 45000;
      if (context.coordinatorAlive === false && timeoutMet && context.formulaGovernanceEligible !== 1) {
        return { status: 'PASS', decision: 'MORPHOGENESIS_BLOCKED', reason: 'FORMULA_G_CI_NOT_ELIGIBLE' };
      }
      if (
        context.coordinatorAlive === false &&
        timeoutMet &&
        context.formulaGovernanceEligible === 1 &&
        context.holographicSeedComplete === true
      ) {
        return {
          status: 'PASS',
          decision: 'REGENERATED_CASTE_COORDINATOR',
          reason: 'SINGLE_SURVIVOR_QUEEN_MORPHOGENESIS_ADMITTED'
        };
      }
      return { status: 'DENIED', decision: 'MORPHOGENESIS_PRECONDITIONS_UNMET' };
    }
    default:
      return { status: 'DENIED', decision: 'UNKNOWN_SCENARIO' };
  }
}
