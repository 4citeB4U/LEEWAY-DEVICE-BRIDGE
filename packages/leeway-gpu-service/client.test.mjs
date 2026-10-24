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
 assert.equal(x.backend,'LEEWAY_GPU');assert.equal(x.productionReady,false);
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

/**
 * LEEWAY HEADER — DO NOT REMOVE
 * REGION: LEEWAY.DEVICE_BRIDGE.GPU_SERVICE.CLIENT.TEST
 * TAG: LEEWAY_EXPLICIT_WINDOWS_SDK_SOFTWARE_SERVICE_TEST
 * WHO: Creator-authorized engineering. WHAT: Test external app client evidence checks.
 * WHY: Prevent unadmitted diagnostic results from being promoted to real GPU.
 * WHEN: 2026-10-24. WHERE: Device Bridge service client.
 * HOW: Request-shaped fake fetch plus actual local runtime optional.
 * AUTHORITY: LAB_ONLY. LICENSE: LeeWay.
 */
import {runLeeWaySoftwareGraphicsDiagnostic} from './client.mjs';
const token='a'.repeat(64);
const valid=()=>({schema:'leeway.gpu.software-graphics-diagnostic.v1',serviceId:'leeway.gpu.service',
 status:'PASS_DIAGNOSTIC_ONLY',scope:'LAB_ONLY',backend:'LEEWAY_GPU_SOFTWARE',
 borrowedPixels:16,completedFence:1,independentReadback:true,requestCorrelated:true,foreignRejected:true,
 canonicalReceiptIssued:false,osGpuRegistered:false,productionReady:false,dispatchAllowed:false});
const fetchMock=(diag=valid())=>async(url,opts)=>{
 if(url.pathname==='/v1/control')return {ok:true,json:async()=>({serviceId:'leeway.gpu.service',csrfToken:token})};
 assert.equal(url.pathname,'/v1/diagnostics/software-graphics/run');
 assert.equal(opts.method,'POST');
 assert.equal(opts.headers.origin,'http://127.0.0.1:4180');
 assert.equal(opts.headers['x-leeway-csrf'],token);
 return {ok:true,json:async()=>diag};
};
test('external app accepts only unadmitted native software execution',async()=>{
 const r=await runLeeWaySoftwareGraphicsDiagnostic({fetchImpl:fetchMock()});
 assert.equal(r.executionClass,'UNADMITTED_DIAGNOSTIC');
 assert.equal(r.completedFence,1);
 assert.equal(r.osGpuRegistered,false);
});
test('external app rejects fake Windows recognition or production receipts',async()=>{
 for(const changed of [{osGpuRegistered:true},{canonicalReceiptIssued:true},{productionReady:true},
  {scope:'CANONICAL'},{completedFence:999}]){
  await assert.rejects(runLeeWaySoftwareGraphicsDiagnostic({fetchImpl:fetchMock({...valid(),...changed})}),
  /LEEWAY_GPU_DIAGNOSTIC_EVIDENCE_MISMATCH/);
 }
});
test('external app never accepts an off-host URL',async()=>{
 await assert.rejects(runLeeWaySoftwareGraphicsDiagnostic({endpoint:'http://www.example.com:4180',
  fetchImpl:fetchMock()}),/LEEWAY_GPU_CLIENT_REQUIRES_LOCAL_ENDPOINT/);
});
