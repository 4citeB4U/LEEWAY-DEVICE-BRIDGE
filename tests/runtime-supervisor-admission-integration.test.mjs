/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.RUNTIME.SUPERVISOR.TESTS
TAG: RUNTIME_SUPERVISOR_ADMISSION_INTEGRATION_TEST
5WH:
WHAT = Integration tests binding Runtime Fabric PR #173 admission gate to Device Bridge supervisor verifier.
WHY = Prove fail-closed admission, allow/deny execution, replay protection, and device scope boundaries.
WHO = F4 Antigravity, Acting Workforce Manager.
WHERE = tests/runtime-supervisor-admission-integration.test.mjs.
WHEN = 2026-11-12.
HOW = Direct integration between Runtime Fabric worker-admission-gate and Device Bridge host verifier.
LICENSE: MIT
*/

import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateWorkerAdmission, operationDigest } from 'file:///E:/LeeWay-Work/Leeway-Runtime-Fabric-canonical-20261105/automation-runtime/worker-admission-gate.mjs';
import { createHostAdmissionVerifier, computeOperationDigest } from '../operator/runtime-supervisor-admission-adapter.mjs';

test('ALLOW: F4 Antigravity admitted for device.health on pc-primary', async () => {
  const verifier = await createHostAdmissionVerifier();
  const task = {
    id: 'TASK-20261112-HEALTH-01',
    workId: 'WORK-20261112-DEVICE-BRIDGE',
    target: 'pc-primary',
    execution: { handler: 'device.health' },
    authorityScope: ['device.health'],
    mutationScope: []
  };

  const result = await evaluateWorkerAdmission(task, {
    workerId: 'F4-Antigravity',
    handlerId: 'device.health',
    trustedAdmissionVerifier: verifier
  });

  assert.equal(result.status, 'PASS');
  assert.equal(result.executionAuthorized, true);
  assert.equal(result.workerId, 'F4-Antigravity');
  assert.ok(result.operationDigest.length === 64);
});

test('ALLOW: F1 Codex admitted for device.files.write on phone-fold6', async () => {
  const verifier = await createHostAdmissionVerifier();
  const task = {
    id: 'TASK-20261112-WRITE-01',
    workId: 'WORK-20261112-DEVICE-BRIDGE',
    target: 'phone-fold6',
    execution: { handler: 'device.files.write' },
    authorityScope: ['device.files.write'],
    mutationScope: ['app-container']
  };

  const result = await evaluateWorkerAdmission(task, {
    workerId: 'F1-Codex',
    handlerId: 'device.files.write',
    trustedAdmissionVerifier: verifier
  });

  assert.equal(result.status, 'PASS');
  assert.equal(result.executionAuthorized, true);
});

test('DENY: Unauthorized worker ID is blocked fail-closed', async () => {
  const verifier = await createHostAdmissionVerifier();
  const task = {
    id: 'TASK-20261112-ROGUE-01',
    workId: 'WORK-20261112-DEVICE-BRIDGE',
    target: 'pc-primary',
    execution: { handler: 'device.health' }
  };

  const result = await evaluateWorkerAdmission(task, {
    workerId: 'unauthorized-external-llm',
    handlerId: 'device.health',
    trustedAdmissionVerifier: verifier
  });

  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reason, 'WORKER_ADMISSION_NOT_QUALIFIED');
  assert.equal(result.executionAttempted, false);
});

test('DENY: Privilege escalation (F2 ChatGPT attempting mutation) is denied', async () => {
  const verifier = await createHostAdmissionVerifier();
  const task = {
    id: 'TASK-20261112-ESCALATE-01',
    workId: 'WORK-20261112-DEVICE-BRIDGE',
    target: 'pc-primary',
    execution: { handler: 'device.files.write' },
    mutationScope: ['root']
  };

  // F2 ChatGPT is restricted to read-only tools:
  const result = await evaluateWorkerAdmission(task, {
    workerId: 'F2-ChatGPT',
    handlerId: 'device.files.write',
    trustedAdmissionVerifier: verifier
  });

  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reason, 'WORKER_ADMISSION_NOT_QUALIFIED');
  assert.equal(result.executionAttempted, false);
});

test('REPLAY DENIAL: Replaying the exact same operation digest on another task execution is blocked', async () => {
  const verifier = await createHostAdmissionVerifier();
  const task1 = {
    id: 'TASK-20261112-REPLAY-01',
    workId: 'WORK-20261112-DEVICE-BRIDGE',
    target: 'pc-primary',
    execution: { handler: 'device.info' }
  };

  // First run passes
  const result1 = await evaluateWorkerAdmission(task1, {
    workerId: 'agent-lee-local',
    handlerId: 'device.info',
    trustedAdmissionVerifier: verifier
  });
  assert.equal(result1.status, 'PASS');

  // Second run with the same digest is blocked as replay
  const result2 = await evaluateWorkerAdmission(task1, {
    workerId: 'agent-lee-local',
    handlerId: 'device.info',
    trustedAdmissionVerifier: verifier
  });
  assert.equal(result2.status, 'BLOCKED');
  assert.equal(result2.reason, 'WORKER_ADMISSION_NOT_QUALIFIED');
});

test('MISMATCH DENIAL: Forged operation digest is rejected with WORKER_ADMISSION_BINDING_MISMATCH', async () => {
  // A buggy or spoofed verifier that returns a different digest
  const spoofedVerifier = async () => ({
    status: 'PASS',
    identityVerified: true,
    standardsRevisionVerified: true,
    cognitionBindingVerified: true,
    scopeGrantVerified: true,
    policySatisfied: true,
    evidencePlanBound: true,
    issuerTrusted: true,
    workerId: 'F4-Antigravity',
    workId: 'WORK-20261112-DEVICE-BRIDGE',
    handlerId: 'device.health',
    operationDigest: 'forged-0000000000000000000000000000000000000000000000000000000000000000',
    standardsSourceRef: '4citeB4U/LeeWay-Standards@159a642',
    grantReference: 'GRANT-SPOOFED'
  });

  const task = {
    id: 'TASK-20261112-FORGE-01',
    workId: 'WORK-20261112-DEVICE-BRIDGE',
    target: 'pc-primary',
    execution: { handler: 'device.health' }
  };

  const result = await evaluateWorkerAdmission(task, {
    workerId: 'F4-Antigravity',
    handlerId: 'device.health',
    trustedAdmissionVerifier: spoofedVerifier
  });

  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reason, 'WORKER_ADMISSION_BINDING_MISMATCH');
  assert.equal(result.executionAttempted, false);
});
