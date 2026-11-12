/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.RUNTIME.WORKER.ADMISSION
TAG: LEEWAY.RUNTIME.WORKER.ADMISSION.GATE.V1
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
5WH:
WHAT = Validate a host-trusted Standards, worker-identity, capability and scope admission before workplane execution.
WHY = Reject task-supplied authority and prevent unbound AI/model/device execution at the existing Runtime boundary.
WHO = Runtime Fabric owner under Creator/Human and current LeeWay Standards.
WHERE = operator/worker-admission-gate.mjs.
WHEN = 2026-11-12.
HOW = Require a trusted host-injected verifier with exact worker/work/handler checks and independently reported grants.
LICENSE: Existing repository terms remain unchanged.
*/

/**
 * Pure Runtime ingress policy check. A queued task, model reply, AGENTS.md,
 * status badge, or tool-description cannot serve as its own trusted verifier.
 * This module does NOT create an identity issuer, second Runtime, Formula,
 * Veritas, receipt or Learning Ledger.
 */
import { createHash } from 'node:crypto';

const approved = (value) => value === true;

export function operationDigest(task, handlerId) {
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
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;

export async function evaluateWorkerAdmission(task, {
  workerId,
  handlerId,
  trustedAdmissionVerifier
} = {}) {
  const workId = nonempty(task?.workId) ? task.workId : task?.id;
  if (!nonempty(task?.id) || !nonempty(workId) || !nonempty(workerId) || !nonempty(handlerId)) {
    return { status: 'BLOCKED', reason: 'WORKER_OPERATION_CONTEXT_INCOMPLETE', executionAttempted: false };
  }
  if (typeof trustedAdmissionVerifier !== 'function') {
    return { status: 'BLOCKED', reason: 'HOST_ADMISSION_VERIFIER_UNBOUND', executionAttempted: false };
  }

  const digest = operationDigest(task, handlerId);
  let verdict;
  try {
    // Only the real Runtime host injects this callback. Never read the
    // verifier, signature, or grants from serialized task/model payloads.
    verdict = await trustedAdmissionVerifier({
      workerId,
      workId,
      handlerId,
      operationDigest: digest,
      parentObjectiveId: task.parentObjectiveId ?? null
    });
  } catch {
    return { status: 'BLOCKED', reason: 'HOST_ADMISSION_VERIFIER_FAILED', executionAttempted: false };
  }

  if (!verdict || verdict.status !== 'PASS' || !approved(verdict.identityVerified) ||
      !approved(verdict.standardsRevisionVerified) || !approved(verdict.cognitionBindingVerified) ||
      !approved(verdict.scopeGrantVerified) || !approved(verdict.policySatisfied) ||
      !approved(verdict.evidencePlanBound) || !approved(verdict.issuerTrusted)) {
    return { status: 'BLOCKED', reason: 'WORKER_ADMISSION_NOT_QUALIFIED', executionAttempted: false };
  }

  // Prevent replay/substitution of a qualified verdict across workers,
  // missions, registered handlers, or source-law revisions.
  if (verdict.workerId !== workerId || verdict.workId !== workId || verdict.handlerId !== handlerId ||
      verdict.operationDigest !== digest ||
      !nonempty(verdict.standardsSourceRef) || !nonempty(verdict.grantReference)) {
    return { status: 'BLOCKED', reason: 'WORKER_ADMISSION_BINDING_MISMATCH', executionAttempted: false };
  }

  return {
    status: 'PASS',
    executionAuthorized: true,
    workerId,
    workId,
    handlerId,
    operationDigest: digest,
    standardsSourceRef: verdict.standardsSourceRef,
    grantReference: verdict.grantReference,
    // Authenticated identity, independent verifier, device effect and
    // production approval remain separate original owner gates.
    veritasQualified: false,
    productionQualified: false
  };
}
