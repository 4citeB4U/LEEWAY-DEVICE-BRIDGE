/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.DESKTOP
TAG: LEEWAY_TRUSTED_RUNTIME_COMPOSITION_REGRESSION
WHAT: Protect the existing Device Bridge MCP startup authority contract.
WHY: Local MCP exposure must never convert a config file or approval flag into production authority.
WHO: LeeWay Industries. WHEN: 2026-10-25. WHERE: apps/desktop.
HOW: Node native independent boundary tests.
AUTHORITY: TEST_ONLY; no owner credential enrollment. LICENSE: MIT.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { requireTrustedRuntimeComposition } from './runtime-composition.mjs';

const receiptSink = async () => {};
const allow = async () => true;

test('trusted owner C3 composition retains Formula and Veritas callbacks', () => {
  const input = { receiptSink, formulaPreGate: allow, veritasPreGate: allow };
  const actual = requireTrustedRuntimeComposition(input);
  assert.equal(actual.mode, 'c3');
  assert.equal(actual.formulaPreGate, allow);
  assert.equal(actual.veritasPreGate, allow);
  assert.equal(actual.receiptSink, receiptSink);
  assert.ok(Object.isFrozen(actual));
});

test('trusted direct Runtime Fabric admission uses one callback owner', () => {
  const admission = async () => true;
  const actual = requireTrustedRuntimeComposition({ receiptSink, admission });
  assert.equal(actual.mode, 'direct');
  assert.equal(actual.admission, admission);
});

test('missing independent evidence sink or pre-gates fails closed', () => {
  for (const config of [null, {}, { receiptSink }, { receiptSink, formulaPreGate: allow },
    { receiptSink, veritasPreGate: allow }, { formulaPreGate: allow, veritasPreGate: allow }]) {
    assert.throws(() => requireTrustedRuntimeComposition(config));
  }
});

test('ambiguous dual admission authority fails closed', () => {
  assert.throws(() => requireTrustedRuntimeComposition({ receiptSink, admission: allow, formulaPreGate: allow, veritasPreGate: allow }));
});

test('unknown configuration authority and accessor properties fail closed', () => {
  assert.throws(() => requireTrustedRuntimeComposition({ receiptSink, formulaPreGate: allow, veritasPreGate: allow, ownerApproved: true }));
  const malicious = { receiptSink, formulaPreGate: allow, veritasPreGate: allow };
  Object.defineProperty(malicious, 'trustedIssuerRegistry', { enumerable: true, get() { throw Error('MUST_NOT_RUN'); } });
  assert.throws(() => requireTrustedRuntimeComposition(malicious), /TRUSTED_RUNTIME_COMPOSITION_INVALID/);
});

test('serialized JSON cannot supply trusted callbacks', () => {
  const serialized = JSON.parse(JSON.stringify({ formulaPreGate: true, veritasPreGate: true, receiptSink: true }));
  assert.throws(() => requireTrustedRuntimeComposition(serialized), /TRUSTED_RUNTIME_COMPOSITION_REQUIRED/);
});
