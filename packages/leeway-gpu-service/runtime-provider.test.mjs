import test from 'node:test';
import assert from 'node:assert/strict';
import {routeCanonicalGpuProvider} from './runtime-provider.mjs';
test('canonical route is registered but governed execution remains blocked',async()=>{const x=await routeCanonicalGpuProvider('E:/LeeWay-Work/runtime-c3-clean-formula-20261007');assert.equal(x.providerId,'edge-gpu-provider');assert.equal(x.registrationState,'BOUND_PASS');assert.equal(x.governedExecutionReady,false)});
test('invalid root is rejected',async()=>await assert.rejects(routeCanonicalGpuProvider(''),/GPU_RUNTIME_ROOT_REQUIRED/));
