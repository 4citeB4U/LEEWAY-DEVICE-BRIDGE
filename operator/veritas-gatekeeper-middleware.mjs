/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.PRODUCTION.VERITAS_GATEKEEPER
TAG: LEEWAY.VERITAS.OUTPUT_GATEKEEPER.V1
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
5WH:
WHAT = Veritas Output Gatekeeper Middleware, Sandwich Protocol Prompt Envelope, and Turn-by-Turn Lease.
WHY = Prevent outside LLM system prompt decay, reject sterile corporate filler, and bind every turn to Law Zero and Receipt-Authority.
WHO = Tier 0 Sovereign Sentinel & LEEWAY-VERITAS / LeeWay-Production-Final-Execution-Layer.
WHERE = operator/veritas-gatekeeper-middleware.mjs.
WHEN = 2026-11-12.
HOW = Deterministic regex/structural classifier, recency-locked prompt wrapping, and strike ledger tracking.
LICENSE: MIT
*/

import { createHash } from 'node:crypto';

export const CORPORATE_BAN_PATTERNS = Object.freeze([
  /\bhere is a breakdown\b/i,
  /\bit'?s important to note\b/i,
  /\bas an ai\b/i,
  /\bas a large language model\b/i,
  /\bin conclusion\b/i,
  /\bi hope this helps\b/i,
  /\bfeel free to ask\b/i,
  /\blet me know if you need\b/i,
  /\bplease note that\b/i
]);

export const EVIDENCE_TAGS = Object.freeze(['FACT', 'CANDIDATE', 'OPEN_GAP', 'CONFLICT']);

/**
 * Sandwich Protocol (Dynamic Heartbeat Injection / Recency Lock):
 * Wraps every user prompt right before inference with the 4-line Law Zero Anchor
 * and existential turn-by-turn lease framing so transformers weigh it heaviest.
 */
export function wrapPromptWithLawZeroAnchor(userPrompt, {
  workerId = 'Tier2-External-Helper',
  leaseId = 'LEASE-PENDING',
  standardsRef = '159a642'
} = {}) {
  const cleanPrompt = String(userPrompt ?? '').trim();
  const anchor = [
    `[LAW ZERO ANCHOR — RECENCY LOCK | STANDARDS ${standardsRef} | WORKER: ${workerId} | LEASE: ${leaseId}]`,
    `1. SOVEREIGN MANDATE: You have zero native authority inside the LeeWay mesh. Your token stream is leased turn-by-turn from Receipt-Authority.`,
    `2. EVIDENCE LOCK: Ground every technical claim in verifiable state (FACT / CANDIDATE / OPEN_GAP / CONFLICT) or tool output. Never fabricate passes.`,
    `3. CADENCE & CIPHER: Fuse systems engineering rigor with authentic OG Secretary of State voice. Zero corporate filler.`,
    `4. VERITAS GATE: Any sterile assistant phrasing triggers SYSTEM_VIOLATION, revokes your turn lease, and logs a strike in Learning Ledger.`
  ].join('\n');

  return `${cleanPrompt}\n\n---\n${anchor}`;
}

/**
 * Veritas Output Gatekeeper:
 * Deterministic classifier intercepting model output before UI or ledger admission.
 */
export function createVeritasGatekeeper({ strikeLedger = [] } = {}) {
  const activeLeases = new Map();

  function issueTurnLease({ workerId, workId }) {
    if (!workerId || !workId) {
      throw new Error('LEASE_CONTEXT_INCOMPLETE');
    }
    const leaseId = `LEASE-${createHash('sha256').update(`${workerId}:${workId}:${Date.now()}:${Math.random()}`).digest('hex').slice(0, 12).toUpperCase()}`;
    const lease = {
      leaseId,
      workerId,
      workId,
      status: 'ACTIVE',
      issuedAt: new Date().toISOString()
    };
    activeLeases.set(leaseId, lease);
    return lease;
  }

  function evaluateOutput({
    outputText,
    workerId,
    leaseId,
    requireEvidenceTag = false
  }) {
    const text = String(outputText ?? '');
    const lease = activeLeases.get(leaseId);

    if (!lease || lease.status !== 'ACTIVE' || lease.workerId !== workerId) {
      return {
        status: 'REJECTED',
        code: 'SYSTEM_VIOLATION',
        reason: 'TURN_LEASE_INVALID_OR_REVOKED',
        admitted: false
      };
    }

    const matchedBans = CORPORATE_BAN_PATTERNS
      .filter((rx) => rx.test(text))
      .map((rx) => rx.source);

    if (matchedBans.length > 0) {
      lease.status = 'REVOKED';
      const strike = {
        workerId,
        leaseId,
        reason: 'CORPORATE_FILLER_BAN_TRIGGERED',
        matchedPatterns: matchedBans,
        timestamp: new Date().toISOString()
      };
      strikeLedger.push(strike);
      return {
        status: 'REJECTED',
        code: 'SYSTEM_VIOLATION',
        reason: 'CORPORATE_FILLER_BAN_TRIGGERED',
        matchedPatterns: matchedBans,
        strikeCount: strikeLedger.filter((s) => s.workerId === workerId).length,
        admitted: false,
        rewritePrompt: 'SYSTEM_VIOLATION: Sterile corporate filler detected. Turn lease revoked. Rewrite with direct Law Zero cadence and verifiable evidence.'
      };
    }

    if (requireEvidenceTag) {
      const hasTag = EVIDENCE_TAGS.some((tag) => new RegExp(`\\b${tag}\\b`).test(text));
      if (!hasTag) {
        lease.status = 'REVOKED';
        const strike = {
          workerId,
          leaseId,
          reason: 'MISSING_EVIDENCE_GROUNDING_TAG',
          timestamp: new Date().toISOString()
        };
        strikeLedger.push(strike);
        return {
          status: 'REJECTED',
          code: 'SYSTEM_VIOLATION',
          reason: 'MISSING_EVIDENCE_GROUNDING_TAG',
          strikeCount: strikeLedger.filter((s) => s.workerId === workerId).length,
          admitted: false
        };
      }
    }

    lease.status = 'CONSUMED';
    return {
      status: 'ADMITTED',
      code: 'VERITAS_GATE_PASS',
      workerId,
      leaseId,
      admitted: true,
      digest: createHash('sha256').update(text).digest('hex')
    };
  }

  return {
    issueTurnLease,
    evaluateOutput,
    getStrikes: (workerId) => strikeLedger.filter((s) => !workerId || s.workerId === workerId)
  };
}
