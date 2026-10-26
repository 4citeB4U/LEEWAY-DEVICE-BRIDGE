import test from 'node:test';
import assert from 'node:assert/strict';
import {executeGovernedGpuRequest} from './governed-execution.mjs';
test('unbound canonical issuer is blocked before effects',async()=>{let called=0;await assert.rejects(executeGovernedGpuRequest({request:{requestId:'r',workloadHash:'h',deviceId:'d',adapterId:'a'},dispatch:{executeNative:()=>called++}}),/GPU_CANONICAL_AUTHORITY_UNBOUND/);assert.equal(called,0)});
test('all surface callbacks cannot bypass final activation',async()=>{let called=0;const cb=()=>{called++};const x={request:{requestId:'r',workloadHash:'h',deviceId:'d',adapterId:'a'},authority:{verifyAndConsume:cb},formula:{evaluateGpuWorkload:cb},ldwmd:{allocatePhysicalLease:cb},continuum:{bindLineage:cb},dispatch:{executeNative:cb},veritas:{verifyCanonical:cb}};await assert.rejects(executeGovernedGpuRequest(x),/GPU_PRODUCTION_EXECUTION_COORDINATOR_NOT_ACTIVATED/);assert.equal(called,0)});
