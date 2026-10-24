/**
 * LEEWAY HEADER — DO NOT REMOVE
 * REGION: LEEWAY.DEVICE_BRIDGE.GPU_SERVICE.TEST
 * TAG: RESTORED_NATIVE_SOFTWARE_GRAPHICS_SERVICE_DIAGNOSTIC_REGRESSION
 * WHO: Owner-authorized integration. WHAT: Test service-to-LeeWay renderer boundary.
 * WHEN: 2026-10-24. WHERE: Device Bridge GPU service.
 * WHY: Prove live transport invokes native module only via local guarded route.
 * HOW: Loopback HTTP, CSRF, origin, strict evidence; optional actual Windows DLL.
 * AUTHORITY: LAB_ONLY, not Runtime/Veritas admission. LICENSE: LeeWay.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {listenGpuService} from './service.mjs';
import {createNativeSoftwareGraphicsDiagnostic} from './software-graphics-diagnostic.mjs';
const good=()=>({schema:'leeway.gpu.software-graphics-diagnostic.v1',
 serviceId:'leeway.gpu.service',status:'PASS_DIAGNOSTIC_ONLY',
 backend:'LEEWAY_GPU_SOFTWARE',scope:'LAB_ONLY',
 independentReadback:true,borrowedPixels:16,completedFence:1,
 canonicalReceiptIssued:false,osGpuRegistered:false,
 productionReady:false,dispatchAllowed:false});
test('real GPU service only invokes diagnostic engine with local CSRF and never opens production',async t=>{
 let count=0;
 const s=await listenGpuService({port:0,
  preferenceFile:join(tmpdir(),'leeway-diag-'+randomUUID()+'.json'),
  softwareGraphicsDiagnostic:{run:async()=>{count++;return good();}}});
 t.after(()=>new Promise(resolve=>s.close(resolve)));
 const base='http://127.0.0.1:'+s.address().port;
 let r=await fetch(base+'/v1/diagnostics/software-graphics');
 assert.equal(r.status,200);
 assert.equal((await r.json()).available,true);
 r=await fetch(base+'/v1/diagnostics/software-graphics/run',{method:'POST'});
 assert.equal(r.status,403);assert.equal(count,0);
 const ctrl=await(await fetch(base+'/v1/control')).json();
 r=await fetch(base+'/v1/diagnostics/software-graphics/run',{method:'POST',
  headers:{origin:base,'x-leeway-csrf':ctrl.csrfToken}});
 assert.equal(r.status,200);
 const result=await r.json();
 assert.equal(count,1);assert.equal(result.authority,'UNADMITTED_DIAGNOSTIC');
 assert.equal(result.productionReady,false);
 assert.equal(result.dispatchAllowed,false);
 r=await fetch(base+'/v1/execute',{method:'POST'});
 assert.equal(r.status,503);
 assert.equal((await r.json()).dispatchExecuted,false);
 const status=await(await fetch(base+'/v1/status')).json();
 assert.equal(status.productionReady,false);
 assert.equal(status.dispatchAllowed,false);
});
test('diagnostic response cannot promote itself into protected GPU execution',async t=>{
 const s=await listenGpuService({port:0,softwareGraphicsDiagnostic:{
  run:async()=>({...good(),canonicalReceiptIssued:true,productionReady:true})}});
 t.after(()=>new Promise(resolve=>s.close(resolve)));
 const base='http://127.0.0.1:'+s.address().port;
 const control=await(await fetch(base+'/v1/control')).json();
 const r=await fetch(base+'/v1/diagnostics/software-graphics/run',{method:'POST',
  headers:{origin:base,'x-leeway-csrf':control.csrfToken}});
 assert.equal(r.status,503);
 assert.equal((await r.json()).code,'GPU_SOFTWARE_DIAGNOSTIC_EVIDENCE_INVALID');
});
test('actual Windows first-party DLL executes via service provider when binary is configured',
 {skip:process.platform!=='win32'||!process.env.LEEWAY_GPU_SOFTWARE_DIAG_RUNNER||!process.env.LEEWAY_GPU_SOFTWARE_DIAG_DLL},async()=>{
 const p=createNativeSoftwareGraphicsDiagnostic({
  runnerPath:process.env.LEEWAY_GPU_SOFTWARE_DIAG_RUNNER,
  dllPath:process.env.LEEWAY_GPU_SOFTWARE_DIAG_DLL});
 const result=await p.run();
 assert.equal(result.status,'PASS_DIAGNOSTIC_ONLY');
 assert.equal(result.borrowedPixels,16);
 assert.equal(result.completedFence,1);
 assert.equal(result.osGpuRegistered,false);
});
