/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.MCP.AUTHENTICATED.QUALIFICATION.TEST
TAG: LEEWAY.MCP.AUTHENTICATED_DISCOVERY_TOOL_GATE.TEST.V1
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
5WH:
WHAT = Test exact-resource authenticated Bridge tool qualification and negative paths.
WHY = Reject a runtime-health-only OAuth facade as a connected Device Bridge, and fail closed on mutation.
WHO = LeeWay Industries, owner-authorized maintainers
WHERE = tests/mcp/authenticated-bridge-tools.test.mjs
WHEN = 2026-10-28
HOW = Controlled JSON-RPC fetch fixture, no external credentials or real device access.
AUTHORITY: Synthetic test only.
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import {qualifyAuthenticatedBridgeTools} from '../../operator/identity/qualify-authenticated-bridge-tools.mjs';

const endpoint='https://bridge.example/mcp';
const token='fixture-owner-token';
const ok=(id,result)=>Response.json({jsonrpc:'2.0',id,result});
function fixture(tools=['bridge_devices','bridge_capabilities']){
 const calls=[];
 return {
  calls,
  fetchImpl:async(url,init)=>{
   calls.push({url:String(url),init});
   const body=JSON.parse(init.body);
   if(body.method==='initialize')return ok(1,{serverInfo:{name:'test',version:'1'},protocolVersion:'2025-03-26',capabilities:{}});
   if(body.method==='tools/list')return ok(2,{tools:tools.map(name=>({name}))});
   throw Error('UNEXPECTED_METHOD');
  }
 };
}
const run=(fetchImpl,extra={})=>qualifyAuthenticatedBridgeTools({endpoint,expectedResource:endpoint,accessToken:token,fetchImpl,...extra});

test('authenticated exact-resource connection advertises only read-only Device Bridge discovery',async()=>{
 const f=fixture();
 const r=await run(f.fetchImpl);
 assert.equal(r.status,'AUTHENTICATED_READONLY_DISCOVERY_TOOLS_OBSERVED');
 assert.deepEqual(r.tools,['bridge_capabilities','bridge_devices']);
 assert.equal(r.runtimeExecution,'NOT_AUTHORIZED');
 assert.equal(f.calls.length,2);
 assert.equal(f.calls.every(x=>x.url===endpoint&&x.init.redirect==='error'),true);
 assert.equal(f.calls.every(x=>x.init.headers.authorization==='Bearer '+token),true);
 assert.equal(f.calls.every(x=>!('cookie' in x.init.headers)),true);
});
test('valid OAuth runtime_health alone does not count as connected Bridge',async()=>{
 const f=fixture(['runtime_health']);
 await assert.rejects(run(f.fetchImpl),/MCP_QUALIFIER_BRIDGE_DISCOVERY_UNBOUND/);
});
test('tools list exposing any device command denies read-only qualification',async()=>{
 const f=fixture(['bridge_devices','bridge_capabilities','device_process_execute']);
 await assert.rejects(run(f.fetchImpl),/MCP_QUALIFIER_UNAUTHORIZED_TOOL_EXPOSURE/);
});
test('duplicate names and unbound auth deny qualification',async()=>{
 const f=fixture(['bridge_devices','bridge_devices','bridge_capabilities']);
 await assert.rejects(run(f.fetchImpl),/MCP_QUALIFIER_TOOL_NAMES_INVALID/);
 await assert.rejects(run(f.fetchImpl,{accessToken:''}),/MCP_QUALIFIER_OWNER_TOKEN_REQUIRED/);
});
test('an unexpected resource denies before presenting the bearer token',async()=>{
 const f=fixture();
 await assert.rejects(run(f.fetchImpl,{expectedResource:'https://elsewhere.example/mcp'}),/MCP_QUALIFIER_RESOURCE_MISMATCH/);
 assert.equal(f.calls.length,0);
});
test('SSO redirect, denied token, and HTML body fail closed',async()=>{
 for(const response of [
  new Response('',{status:302}),
  new Response('',{status:401}),
  new Response('<html>login</html>',{status:200,headers:{'content-type':'text/html'}})
 ]){
  await assert.rejects(run(async()=>response),/MCP_QUALIFIER_(HTTP_|JSON_REQUIRED)/);
 }
});
test('invalid JSON-RPC response cannot claim authenticated tools',async()=>{
 await assert.rejects(run(async(_url,init)=>{
  const body=JSON.parse(init.body);
  return Response.json({jsonrpc:'2.0',id:body.id,result:null});
 }),/MCP_QUALIFIER_INVALID_RESPONSE/);
});
