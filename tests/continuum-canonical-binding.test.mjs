/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.CONTINUUM.IDENTITY.BINDING.TEST
TAG: LEEWAY.CONTINUUM.CANONICAL.BINDING.TEST.V1
WHO: LeeWay Industries
WHAT: Verify canonical provider binding refuses missing authority before dynamic loading
WHEN: 2026-10-26
WHERE: tests/continuum-canonical-binding.test.mjs
WHY: Prevent parallel or test-only authority in production composition
HOW: Node built-in assertions, no private data, no mocked production success
AUTHORITY: Unit tests only
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import {bindCanonicalContinuum} from '../operator/identity/bind-canonical-continuum.mjs';
const base={modulePath:'missing-provider.mjs',binding:{databasePath:'db',ownerId:'owner',bodyId:'device'},context:{ownerId:'owner',bodyId:'device',capabilities:['continuum.read','continuum.write']}};
test('canonical binding requires explicit source',async()=>{
 await assert.rejects(bindCanonicalContinuum({}),/CANONICAL_CONTINUUM_BINDING_REQUIRED/);
});
test('canonical binding requires same owner and body and read-write grants',async()=>{
 await assert.rejects(bindCanonicalContinuum({...base,context:{...base.context,bodyId:'another'},governancePreGate:()=>{}}),/CONTINUUM_OWNER_WRITE_SCOPE_REQUIRED/);
 await assert.rejects(bindCanonicalContinuum({...base,context:{...base.context,capabilities:['continuum.read']},governancePreGate:()=>{}}),/CONTINUUM_OWNER_WRITE_SCOPE_REQUIRED/);
});
test('canonical binding rejects test-only and missing production governance',async()=>{
 await assert.rejects(bindCanonicalContinuum(base),/CONTINUUM_PRODUCTION_GATE_REQUIRED/);
 await assert.rejects(bindCanonicalContinuum({...base,allowTestOnlyGate:true,governancePreGate:()=>{}}),/CONTINUUM_PRODUCTION_GATE_REQUIRED/);
});
