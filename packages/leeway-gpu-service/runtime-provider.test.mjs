import test from 'node:test';
import assert from 'node:assert/strict';
import {routeCanonicalGpuProvider} from './runtime-provider.mjs';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('routing a registered descriptor cannot claim governed execution',async t=>{
 const root=await mkdtemp(join(tmpdir(),'lee-gpu-router-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await mkdir(join(root,'provider-fabric'));
 await writeFile(join(root,'provider-fabric','provider-router.mjs'),'export async function routeProviderRequest(){return {providerId:"edge-gpu-provider",status:"BOUND_PASS"};}\n');
 const x=await routeCanonicalGpuProvider(root);assert.equal(x.providerId,'edge-gpu-provider');assert.equal(x.registrationState,'BOUND_PASS');assert.equal(x.governedExecutionReady,false);
});
test('invalid root is rejected',async()=>await assert.rejects(routeCanonicalGpuProvider(''),/GPU_RUNTIME_ROOT_REQUIRED/));
