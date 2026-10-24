import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverLeeWayGpu,executeLeeWayGpu,selectGpuRoute} from './client.mjs';
import {listenGpuService} from './service.mjs';
test('native application SDK discovers local service identity',async t=>{
 const server=await listenGpuService({port:0,platform:'linux'});
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const response=await fetch('http://127.0.0.1:'+server.address().port+'/v1/status');
 const stub=async()=>response;
 const x=await discoverLeeWayGpu({fetchImpl:stub});
 assert.equal(x.backend,'VULKAN');assert.equal(x.productionReady,false);
});
test('client rejects remote endpoint',async()=>{
 await assert.rejects(discoverLeeWayGpu({endpoint:'https://somewhere.example'}),/LOCAL_ENDPOINT/);
});
test('client sends only bounded correlated requests to the local 4178 contract and preserves denial',async t=>{
 const server=await listenGpuService({port:0,platform:'win32'});
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const endpoint='http://127.0.0.1:'+server.address().port;
 const request={requestId:'client-test-1',workloadHash:'a'.repeat(64),backend:'D3D12',deviceId:'win-test',adapterId:'0-1',memoryBytes:4096};
 await assert.rejects(executeLeeWayGpu({endpoint,request}),/GPU_CANONICAL_EXECUTION_AUTHORITY_NOT_CONNECTED/);
 await assert.rejects(executeLeeWayGpu({endpoint,request:{...request,ownerKey:'secret'}}),/REQUEST_INVALID/);
 await assert.rejects(executeLeeWayGpu({endpoint:'https://remote.example',request}),/LOCAL_ENDPOINT/);
});

test('user switch cannot spoof canonical GPU routing',()=>{
 const base={serviceId:'leeway.gpu.service',requestedEnabled:false,active:false,productionReady:false,dispatchAllowed:false};
 assert.equal(selectGpuRoute(base).reason,'USER_OPTED_OUT');
 assert.equal(selectGpuRoute({...base,requestedEnabled:true}).reason,'LEEWAY_GPU_PENDING_AUTHORIZATION');
 assert.equal(selectGpuRoute({...base,requestedEnabled:true,active:true,productionReady:true,dispatchAllowed:true}).reason,'CANONICAL_EXECUTION_GRANT_REQUIRED');
 assert.throws(()=>selectGpuRoute({serviceId:'impostor'}),/IDENTITY_NOT_VERIFIED/);
});
