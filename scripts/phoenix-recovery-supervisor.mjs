/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.RESILIENCE.COMPLEXITY_GOVERNOR_PHOENIX
TAG: LEEWAY.RESILIENCE.PHOENIX_RECOVERY_SUPERVISOR.V1
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
@LAW_ZERO_BRIEF = Enforces CONTRACT-PRV-011 Two-Lane latency separation, Prompt Diet Cap, Tier 0 Creator Safe-Mode, and <10s Phoenix LKG rollback.
5WH:
WHAT = Complexity Governor (Lane 1 Reflex <=250ms vs Lane 2 Consequence Gate), Tier 1 Prompt Diet Cap (<=250 tokens / 6 lines), and Phoenix <10s LKG snapshot & rollback supervisor.
WHY = Prevent slow LLM consensus from stalling real-time reflex/voice paths and guarantee sub-10-second recovery without ever wiping device digital_brain.db.
WHO = Sovereign Bridge & Runtime Watchdog under Creator Tier 0.
WHERE = scripts/phoenix-recovery-supervisor.mjs.
WHEN = 2026-11-12.
HOW = Deterministic lane classification, atomic .tmp->SHA-256->rename LKG commits backed by SQLite WAL, and 3-failure automated rollback trigger.
LICENSE: MIT
*/

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import path from 'node:path';
import { openSovereignWalStore } from '../operator/sqlite-wal-store.mjs';

export const LANE_1_REFLEX_FAST_PATH = 'LANE_1_REFLEX_FAST_PATH';
export const LANE_2_CONSEQUENCE_GATE_PATH = 'LANE_2_CONSEQUENCE_GATE_PATH';
export const REFLEX_TARGET_MS = 150;
export const REFLEX_MAX_LATENCY_MS = 250;
export const PHOENIX_RECOVERY_SLA_MS = 10000;
export const PHOENIX_FAILURE_THRESHOLD = 3;
export const TIER1_PROMPT_MAX_TOKENS = 250;
export const TIER1_PROMPT_MAX_LINES = 6;

const REFLEX_OPERATIONS = new Set([
  'voice.barge_in',
  'voice.Wake_ack',
  'voice.wake_ack',
  'ui.kill_switch',
  'ui.emergency_freeze',
  'device.heartbeat',
  'device.cached_status',
  'reflex.route'
]);

const PROTECTED_BRAIN_BASENAMES = new Set([
  'digital_brain.db',
  'digital_brain.sqlite',
  'digital-brain.db',
  'diagnostics.db'
]);

export function assertNotProtectedDeviceBrain(targetPath) {
  const base = path.basename(String(targetPath || '')).toLowerCase();
  if (PROTECTED_BRAIN_BASENAMES.has(base)) {
    throw new Error(`DEVICE_BRAIN_SOVEREIGNTY_VIOLATION: Refusing overwrite/wipe of ${base}`);
  }
}

export function classifyExecutionLane(operation = {}) {
  const opName = String(operation.operation ?? operation.capability ?? '').trim();
  const isMutating = operation.mutating === true || operation.sideEffects === true;
  const requiresExternalLlmConsensus = operation.requiresExternalLlmConsensus === true;

  if (!isMutating && !requiresExternalLlmConsensus && REFLEX_OPERATIONS.has(opName)) {
    return Object.freeze({
      lane: LANE_1_REFLEX_FAST_PATH,
      targetLatencyMs: REFLEX_TARGET_MS,
      maxLatencyMs: REFLEX_MAX_LATENCY_MS,
      requiresExternalLlmConsensus: false,
      requiresVeritasPrePost: false
    });
  }

  return Object.freeze({
    lane: LANE_2_CONSEQUENCE_GATE_PATH,
    requiresExternalLlmConsensus: requiresExternalLlmConsensus,
    requiresVeritasPrePost: true,
    requiredGates: Object.freeze([
      'LeeWay-Standards',
      'Leeway-formula-live',
      'LEEWAY-VERITAS',
      'Receipt-Authority',
      'LeeWay-Continuum'
    ])
  });
}

export function estimateTokenCount(text) {
  const words = String(text ?? '').trim().split(/\s+/).filter(Boolean);
  // Conservative BPE approximation (~1.33x word count, exact cap check)
  return Math.ceil(words.length * 1.35);
}

export function wrapPromptWithTier1CompactAnchor(userPrompt, {
  workerId = 'Tier1-Local-Iron',
  leaseId = 'LEASE-PENDING',
  standardsRef = '159a642'
} = {}) {
  const anchorLines = [
    `[LAW0 ${standardsRef}|${workerId}|${leaseId}] Zero native authority; lease-bound turn.`,
    `Cite [FACT|CANDIDATE|OPEN_GAP|CONFLICT] from verified tool/device readback only.`,
    `No corporate filler. Fail closed on missing grant or unverified hash.`,
    `Protect device digital_brain.db; return concise action + receipt ref.`
  ];
  const anchorText = anchorLines.join('\n');
  const approxTokens = estimateTokenCount(anchorText);
  if (anchorLines.length > TIER1_PROMPT_MAX_LINES || approxTokens > TIER1_PROMPT_MAX_TOKENS) {
    throw new Error(`TIER1_PROMPT_DIET_EXCEEDED: lines=${anchorLines.length}, tokens=${approxTokens}`);
  }
  const cleanPrompt = String(userPrompt ?? '').trim();
  return {
    prompt: `${cleanPrompt}\n---\n${anchorText}`,
    anchorLineCount: anchorLines.length,
    anchorApproxTokens: approxTokens
  };
}

export function createLkgSnapshot({
  targetId,
  label = 'manual',
  state,
  snapshotDir,
  restorePath,
  walStore
}) {
  if (!targetId || !snapshotDir) {
    throw new Error('LKG_SNAPSHOT_ARGS_INCOMPLETE');
  }
  if (restorePath) {
    assertNotProtectedDeviceBrain(restorePath);
  }
  mkdirSync(snapshotDir, { recursive: true });

  const serialized = JSON.stringify(state, null, 2);
  const sha256 = createHash('sha256').update(serialized, 'utf8').digest('hex');
  const snapshotId = `LKG-${targetId}-${Date.now()}-${sha256.slice(0, 8)}`;
  const tmpPath = path.join(snapshotDir, `${snapshotId}.json.tmp`);
  const finalPath = path.join(snapshotDir, `${snapshotId}.json`);

  writeFileSync(tmpPath, serialized, 'utf8');
  renameSync(tmpPath, finalPath);

  if (restorePath) {
    const restoreTmp = `${restorePath}.tmp`;
    mkdirSync(path.dirname(restorePath), { recursive: true });
    writeFileSync(restoreTmp, serialized, 'utf8');
    renameSync(restoreTmp, restorePath);
  }

  const record = walStore.saveLkgSnapshot({
    snapshotId,
    targetId,
    label,
    filePath: finalPath,
    sha256,
    state
  });

  return { status: 'SAVED', ...record };
}

export function rollbackToLatestLkg({
  targetId,
  restorePath,
  walStore
}) {
  const startedAt = Date.now();
  if (restorePath) {
    assertNotProtectedDeviceBrain(restorePath);
  }

  const record = walStore.getLatestLkgSnapshot(targetId);
  if (!record || !existsSync(record.filePath)) {
    return {
      status: 'BLOCKED',
      reason: 'NO_VALID_LKG_SNAPSHOT_FOUND',
      elapsedMs: Date.now() - startedAt
    };
  }

  const diskBytes = readFileSync(record.filePath, 'utf8');
  const diskSha = createHash('sha256').update(diskBytes, 'utf8').digest('hex');
  if (diskSha !== record.sha256) {
    return {
      status: 'BLOCKED',
      reason: 'LKG_SNAPSHOT_SHA256_TAMPER_DETECTED',
      expectedSha256: record.sha256,
      actualSha256: diskSha,
      elapsedMs: Date.now() - startedAt
    };
  }

  if (restorePath) {
    mkdirSync(path.dirname(restorePath), { recursive: true });
    const tmpPath = `${restorePath}.rollback.tmp`;
    writeFileSync(tmpPath, diskBytes, 'utf8');
    renameSync(tmpPath, restorePath);
  }

  const elapsedMs = Date.now() - startedAt;
  return {
    status: elapsedMs <= PHOENIX_RECOVERY_SLA_MS ? 'ROLLED_BACK_LKG' : 'ROLLED_BACK_SLA_BREACH',
    withinSla: elapsedMs <= PHOENIX_RECOVERY_SLA_MS,
    elapsedMs,
    snapshotId: record.snapshotId,
    sha256: diskSha,
    state: record.state,
    digitalBrainPreserved: true
  };
}

export function evaluateCreatorSafeModeBypass({
  actorId,
  tier,
  localAuthVerified = false,
  cloudGovernanceReachable = false,
  action = 'SAFE_MODE_READ'
}) {
  if (tier !== 'TIER_0_CREATOR' || !actorId || localAuthVerified !== true) {
    return Object.freeze({
      bypassGranted: false,
      reason: 'TIER_0_LOCAL_CREATOR_AUTH_REQUIRED'
    });
  }

  return Object.freeze({
    bypassGranted: true,
    mode: cloudGovernanceReachable ? 'TIER_0_SOVEREIGN_LOCAL_EXECUTION' : 'CREATOR_OFFLINE_SAFE_MODE_BYPASS',
    actorId,
    action,
    auditRequired: true
  });
}

export function createPhoenixWatchdog({
  targetId,
  restorePath,
  walStore,
  dbPath,
  failureThreshold = PHOENIX_FAILURE_THRESHOLD
}) {
  const store = walStore || openSovereignWalStore(dbPath);
  let consecutiveFailures = 0;

  return {
    walStore: store,

    recordHealthyHeartbeat(detail = 'OK') {
      consecutiveFailures = 0;
      return { status: 'HEALTHY', consecutiveFailures: 0, detail };
    },

    recordFailure(reason = 'HEALTH_PROBE_FAILED') {
      consecutiveFailures += 1;
      if (consecutiveFailures < failureThreshold) {
        return {
          status: 'DEGRADED',
          consecutiveFailures,
          threshold: failureThreshold,
          rollbackTriggered: false,
          reason
        };
      }
      const recovery = rollbackToLatestLkg({
        targetId,
        restorePath,
        walStore: store
      });
      consecutiveFailures = 0;
      return {
        status: recovery.status,
        rollbackTriggered: true,
        withinSla: recovery.withinSla,
        elapsedMs: recovery.elapsedMs,
        snapshotId: recovery.snapshotId,
        sha256: recovery.sha256,
        state: recovery.state,
        digitalBrainPreserved: recovery.digitalBrainPreserved
      };
    }
  };
}
