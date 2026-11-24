/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.MANAGED.HTTPS.QUALIFICATION
TAG: LEEWAY.MANAGED.NATIVE_LIVE_HTTPS_READ_ONLY.V1
5WH:
WHAT = Verify current managed native Bridge response contract across public HTTPS.
WHY = Confirm a live Render Node service and refusal of unsigned MCP, not inferred OS/device registration.
WHO = LeeWay outside source qualification / GitHub Actions test runner.
WHERE = scripts/qualify-managed-native-https.mjs.
WHEN = 2026-11-23.
HOW = Bounded GET health and anonymous POST initialize; record status only, never credentials or owner identity.
AUTHORITY = EXTERNAL_TRANSPORT_OBSERVATION_ONLY; not Veritas, receipt, physical-device or execution proof.
LICENSE = MIT
*/
import assert from 'node:assert/strict';

const hostname='https://leeway-native-device-bridge.onrender.com';
const acceptedModes=new Set(['BOOTSTRAP_ONLY','RUNNING']);
const paths=['/healthz','/mcp','/readyz'];
async function request(path,method='GET',body=undefined){
 const response=await fetch(hostname+path,{
  method,redirect:'error',headers:{
   'accept':'application/json','content-type':'application/json'
  },...(body===undefined?{}:{body:JSON.stringify(body)}),
  signal:AbortSignal.timeout(85000)
 });
 const type=response.headers.get('content-type')||'';
 assert.match(type,/^application\/json(?:\s*;|$)/i,'RENDER_MCP_JSON_CONTENT_TYPE_REQUIRED');
 const value=await response.json();
 return {status:response.status,body:value};
}

const health=await request(paths[0]);
assert.equal(health.status,200);
assert.equal(health.body.service,'leeway-managed-device-mcp');
assert.ok(acceptedModes.has(health.body.status),'EXPECTED_BOOTSTRAP_OR_NATIVE_READY');
assert.equal(health.body.deviceReachability,'NOT_PROBED');
assert.equal(health.body.execution,'NOT_AUTHORIZED');
assert.ok(health.body.productionAdmission!=='GRANTED');
if(health.body.status==='BOOTSTRAP_ONLY'){
 assert.equal(health.body.identity,'UNBOUND');
 assert.equal(health.body.runtimeBridge,'NOT_CONSTRUCTED');
 assert.ok(Array.isArray(health.body.missingConfiguration));
 const denied=await request(paths[1],'POST',{jsonrpc:'2.0',id:1,method:'tools/list',params:{}});
 assert.equal(denied.status,503);
 assert.equal(denied.body.error,'MANAGED_BRIDGE_CONFIGURATION_UNBOUND');
 const ready=await request(paths[2]);
 assert.equal(ready.status,503);
 console.log('NATIVE_BRIDGE_LIVE_HTTPS_BOOTSTRAP_ONLY_503');
}else{
 const denied=await request(paths[1],'POST',{jsonrpc:'2.0',id:1,method:'tools/list',params:{}});
 assert.equal(denied.status,401);
 assert.equal(denied.body.error,'MCP_AUTHENTICATION_REQUIRED');
 console.log('NATIVE_BRIDGE_LIVE_HTTPS_ANONYMOUS_401');
}
console.log('HTTPS_RESOURCE',hostname+'/mcp');
console.log('BINDING_STATUS',health.body.status);
console.log('PHYSICAL_DEVICES','NOT_PROBED');
console.log('AUTHENTICATED_OWNER','NOT_EXECUTED');
