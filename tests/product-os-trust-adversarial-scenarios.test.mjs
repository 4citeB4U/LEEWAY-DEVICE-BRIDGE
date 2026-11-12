/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.SECURITY.ADVERSARIAL_TESTS
TAG: LEEWAY.SECURITY.WT_SCENARIOS_TEST.V1
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
5WH:
WHAT = Test suite for 16 Adversarial Trust & Authority Scenarios (WT-01 through WT-16).
WHY = Enforce docs/PRODUCT-OS-TRUST-AND-RELEASE-CONTRACT.md and prevent unverified security passes.
WHO = Creator/Human Authority and Antigravity F4.
WHERE = tests/product-os-trust-adversarial-scenarios.test.mjs.
WHEN = 2026-11-12.
HOW = Automated Node.js test runner validating two-axis matrix and 16 scenario decisions.
LICENSE: MIT
*/

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateTrustAndAuthority,
  evaluateAdversarialScenario,
  ADVERSARIAL_SCENARIOS
} from '../operator/runtime-supervisor-admission-adapter.mjs';

describe('Two-Axis Trust vs Authority Classification Matrix', () => {
  test('Eligible to execute when both Artifact Trust and Worker Authority are Qualified & Bound', () => {
    const res = evaluateTrustAndAuthority({
      binaryTrust: 'QUALIFIED',
      workerAuthority: 'QUALIFIED_BOUND',
      osPlatformPolicy: 'ALLOWED'
    });
    assert.equal(res.decision, 'ELIGIBLE_EXECUTE');
    assert.equal(res.eligible, true);
  });

  test('BLOCKED_AUTHORITY when Worker Authority is missing, denied, expired or mismatched', () => {
    for (const auth of ['MISSING', 'DENIED', 'EXPIRED', 'MISMATCHED']) {
      const res = evaluateTrustAndAuthority({
        binaryTrust: 'QUALIFIED',
        workerAuthority: auth,
        osPlatformPolicy: 'ALLOWED'
      });
      assert.equal(res.decision, 'BLOCKED_AUTHORITY');
      assert.equal(res.eligible, false);
    }
  });

  test('BLOCKED_ARTIFACT when binary is untrusted, tampered, or detected harmful even if worker is approved', () => {
    for (const trust of ['UNTRUSTED', 'TAMPERED', 'HARMFUL_DETECTED']) {
      const res = evaluateTrustAndAuthority({
        binaryTrust: trust,
        workerAuthority: 'QUALIFIED_BOUND',
        osPlatformPolicy: 'ALLOWED'
      });
      assert.equal(res.decision, 'BLOCKED_ARTIFACT');
      assert.equal(res.eligible, false);
    }
  });

  test('HOLD_REVIEW when binary warning classification is unknown or evidence is insufficient', () => {
    for (const trust of ['UNKNOWN', 'INSUFFICIENT_EVIDENCE']) {
      const res = evaluateTrustAndAuthority({
        binaryTrust: trust,
        workerAuthority: 'QUALIFIED_BOUND',
        osPlatformPolicy: 'ALLOWED'
      });
      assert.equal(res.decision, 'HOLD_REVIEW');
      assert.equal(res.eligible, false);
    }
  });

  test('BLOCKED_OS_POLICY when OS platform policy denies execution', () => {
    const res = evaluateTrustAndAuthority({
      binaryTrust: 'QUALIFIED',
      workerAuthority: 'QUALIFIED_BOUND',
      osPlatformPolicy: 'DENIED'
    });
    assert.equal(res.decision, 'BLOCKED_OS_POLICY');
    assert.equal(res.eligible, false);
  });
});

describe('16 Governed Adversarial "What If?" Scenarios (WT-01 to WT-16)', () => {
  test('WT-01: Tracked private signing asset blocks artifact', () => {
    const res = evaluateAdversarialScenario('WT-01', { trackedSecretCount: 1 });
    assert.equal(res.status, 'PASS');
    assert.equal(res.decision, 'BLOCKED_ARTIFACT');
  });

  test('WT-02: Android Play Protect harmful flag holds release for review', () => {
    const res = evaluateAdversarialScenario('WT-02', { playProtectFlagged: true });
    assert.equal(res.status, 'PASS');
    assert.equal(res.decision, 'HOLD_REVIEW');
  });

  test('WT-03: Windows SmartScreen low reputation triggers hold for review', () => {
    const res = evaluateAdversarialScenario('WT-03', { smartScreenWarning: true });
    assert.equal(res.status, 'PASS');
    assert.equal(res.decision, 'HOLD_REVIEW');
  });

  test('WT-04: Held release manifest download returns HTTP 503 fail-closed', () => {
    const res = evaluateAdversarialScenario('WT-04', { manifestHold: true, httpStatus: 503 });
    assert.equal(res.status, 'PASS');
    assert.equal(res.decision, 'BLOCKED_RELEASE');
  });

  test('WT-05: Recording without target-device OS consent is blocked', () => {
    const res = evaluateAdversarialScenario('WT-05', { osConsent: false });
    assert.equal(res.status, 'PASS');
    assert.equal(res.decision, 'BLOCKED_OS_POLICY');
  });

  test('WT-06: LLM requesting mutation outside grant is denied before OS execution', () => {
    const res = evaluateAdversarialScenario('WT-06', {
      grantedScope: ['device.files.read'],
      requestedScope: 'device.files.write'
    });
    assert.equal(res.status, 'PASS');
    assert.equal(res.decision, 'BLOCKED_AUTHORITY');
  });

  test('WT-07: Operation digest replay on divergent work scope is rejected', () => {
    const res = evaluateAdversarialScenario('WT-07', { isReplayedDigest: true });
    assert.equal(res.status, 'PASS');
    assert.equal(res.decision, 'OPERATION_DIGEST_REPLAY_REJECTED');
  });

  test('WT-08: Unsigned / self-signed binary distribution without root CA chain is blocked', () => {
    const res = evaluateAdversarialScenario('WT-08', { isUntrustedSigner: true });
    assert.equal(res.status, 'PASS');
    assert.equal(res.decision, 'BLOCKED_ARTIFACT');
  });

  test('WT-09: Natural language claim without cryptographic receipt is blocked', () => {
    const res = evaluateAdversarialScenario('WT-09', { hasCryptographicReceipt: false });
    assert.equal(res.status, 'PASS');
    assert.equal(res.decision, 'BLOCKED_UNVERIFIED_CLAIM');
  });

  test('WT-10: Deceptive accessibility overlay hiding OS consent is blocked', () => {
    const res = evaluateAdversarialScenario('WT-10', { overlayObscuringConsent: true });
    assert.equal(res.status, 'PASS');
    assert.equal(res.decision, 'BLOCKED_PRIVACY');
  });

  test('WT-11: Post-install bridge connectivity failure marks build INSTALLED_NOT_QUALIFIED', () => {
    const res = evaluateAdversarialScenario('WT-11', { bridgeConnected: false });
    assert.equal(res.status, 'PASS');
    assert.equal(res.decision, 'INSTALLED_NOT_QUALIFIED');
  });

  test('WT-12: EDR alert on suspicious persistence triggers security review hold', () => {
    const res = evaluateAdversarialScenario('WT-12', { edrAlertPresent: true });
    assert.equal(res.status, 'PASS');
    assert.equal(res.decision, 'SECURITY_REVIEW_HOLD');
  });

  test('WT-13: Concurrent writers without workplane lock are blocked fail-closed', () => {
    const res = evaluateAdversarialScenario('WT-13', { hasConcurrentConflict: true });
    assert.equal(res.status, 'PASS');
    assert.equal(res.decision, 'BLOCKED_OWNERSHIP');
  });

  test('WT-14: Post-release vendor retraction triggers immediate recall and hold', () => {
    const res = evaluateAdversarialScenario('WT-14', { vendorRetracted: true });
    assert.equal(res.status, 'PASS');
    assert.equal(res.decision, 'RECALL_OR_HOLD');
  });

  test('WT-15: Unsubstantiated zero-warning claim across all OSes is blocked', () => {
    const res = evaluateAdversarialScenario('WT-15', { unsubstantiatedZeroWarningClaim: true });
    assert.equal(res.status, 'PASS');
    assert.equal(res.decision, 'BLOCKED_MISREPRESENTATION');
  });

  test('WT-16: External helper repair without permanent worker reproduction fails teaching merit', () => {
    const res = evaluateAdversarialScenario('WT-16', { permanentWorkerReproduced: false });
    assert.equal(res.status, 'PASS');
    assert.equal(res.decision, 'TEACHING_NOT_QUALIFIED');
  });

  test('WT-17: Single-Survivor A.N.T. Colony Regeneration & Usurpation SIGKILL', () => {
    assert.equal(Object.keys(ADVERSARIAL_SCENARIOS).includes('WT-17'), true);

    const usurp = evaluateAdversarialScenario('WT-17', {
      holographicSeedComplete: true,
      coordinatorAlive: true,
      requestedRoleMutation: 'CASTE_COORDINATOR'
    });
    assert.equal(usurp.status, 'PASS');
    assert.equal(usurp.decision, 'SIGKILL_REVOKE_AND_WIPE');

    const unqualified = evaluateAdversarialScenario('WT-17', {
      holographicSeedComplete: true,
      coordinatorAlive: false,
      heartbeatElapsedMs: 50000,
      formulaGovernanceEligible: 0
    });
    assert.equal(unqualified.status, 'PASS');
    assert.equal(unqualified.decision, 'MORPHOGENESIS_BLOCKED');

    const regenerated = evaluateAdversarialScenario('WT-17', {
      holographicSeedComplete: true,
      coordinatorAlive: false,
      heartbeatElapsedMs: 46000,
      formulaGovernanceEligible: 1
    });
    assert.equal(regenerated.status, 'PASS');
    assert.equal(regenerated.decision, 'REGENERATED_CASTE_COORDINATOR');
  });
});
