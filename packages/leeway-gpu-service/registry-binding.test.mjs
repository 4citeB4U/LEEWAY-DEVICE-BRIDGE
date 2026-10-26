import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectRuntimeGpuProvider} from './registry-binding.mjs';
const root='E:/LeeWay-Work/runtime-c3-clean-formula-20261007';
test('real canonical provider exists but governed service is not qualified',()=>{
 const r=inspectRuntimeGpuProvider({registryPath:root+'/provider.registry.json',adapterManifestPath:root+'/adapters/edge-gpu/adapter.manifest.json'});
 assert.equal(r.registered,true);assert.equal(r.providerStatus,'BOUND_PASS');assert.equal(r.serviceReady,false);assert.equal(r.governedDispatchQualified,false);
});
test('missing registry fails closed',()=>assert.equal(inspectRuntimeGpuProvider({registryPath:'Z:/missing',adapterManifestPath:'Z:/missing'}).serviceReady,false));