import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectRuntimeGpuProvider} from './registry-binding.mjs';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('registered descriptor cannot qualify governed service execution',t=>{
 const root=mkdtempSync(join(tmpdir(),'lee-gpu-registry-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const registryPath=join(root,'registry.json'),adapterManifestPath=join(root,'manifest.json');
 writeFileSync(registryPath,JSON.stringify({providers:{'edge-gpu-provider':{providerId:'edge-gpu-provider',capability:'compute.gpu',binding:{adapterId:'edge-gpu'},required:true,status:'BOUND_PASS'}}}));
 writeFileSync(adapterManifestPath,JSON.stringify({id:'edge-gpu',contract:'compute.gpu'}));
 const r=inspectRuntimeGpuProvider({registryPath,adapterManifestPath});
 assert.equal(r.registered,true);assert.equal(r.providerStatus,'BOUND_PASS');assert.equal(r.serviceReady,false);assert.equal(r.governedDispatchQualified,false);
});
test('missing registry fails closed',()=>assert.equal(inspectRuntimeGpuProvider({registryPath:'Z:/missing',adapterManifestPath:'Z:/missing'}).serviceReady,false));
