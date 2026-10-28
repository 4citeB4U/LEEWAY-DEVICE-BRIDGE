/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.PUBLIC.MCP.HOST.TEST
TAG: LEEWAY.PLATFORM_AGNOSTIC.PUBLIC_MCP_INGRESS.TEST.V1
5WH:
WHAT = Exercise the managed Node MCP host against the original OAuth and ingress handlers.
WHY = Prove Railway hosting adaptation adds no new authorization, routes, databases, or commands.
WHO = LeeWay Industries; owner-authorized maintainers.
WHERE = tests/mcp/public-managed-ingress.test.mjs
WHEN = 2026-10-28
HOW = Real loopback HTTP and fake upstream, negative routes and bearer checks, no owner credentials.
AUTHORITY: Source-level fixture tests only; not Railway deployment or live owner admission.
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import {
  createPublicMcpHttpServer, resolvePublicMcpListenPort,
  PUBLIC_GATEWAY_PATHS
} from '../../operator/hosting/start-public-mcp-ingress.mjs';

const ISSUER='https://identity.example.test';
const AUDIENCE='https://bridge.example.test/mcp';
const UPSTREAM='https://runtime.example.test/mcp';
const env={
 LEEWAY_MCP_AUTH_ISSUER:ISSUER,
 LEEWAY_MCP_AUDIENCE:AUDIENCE,
 LEEWAY_MCP_UPSTREAM:UPSTREAM
};

async function fixture(t,options={}){
 const server=createPublicMcpHttpServer(options);
 server.listen(0,'127.0.0.1');
 await once(server,'listening');
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 return 'http://127.0.0.1:'+server.address().port;
}

test('managed host exposes only explicit transport, metadata and health paths',async t=>{
 const base=await fixture(t,{env:{}});
 assert.ok(PUBLIC_GATEWAY_PATHS.includes('/mcp'));
 assert.ok(PUBLIC_GATEWAY_PATHS.includes('/.well-known/oauth-protected-resource/mcp'));
 const response=await fetch(base+'/healthz');
 assert.equal(response.status,200);
 const report=await response.json();
 assert.equal(report.process,'RUNNING');
 assert.equal(report.identityBinding,'UNBOUND');
 assert.equal(report.runtimeUpstream,'UNBOUND');
 assert.equal(report.deviceControl,'NOT_AUTHORIZED');
 assert.equal(report.continuumReadback,'NOT_PROBED');
 assert.equal((await fetch(base+'/api/mcp')).status,404);
 assert.equal((await fetch(base+'/api/oauth-protected-resource')).status,404);
 assert.equal((await fetch(base+'/mcp?route=unknown')).status,404);
 assert.equal((await fetch(base+'/healthz',{method:'POST'})).status,405);
 assert.equal((await fetch(base+'/healthz',{method:'HEAD'})).status,200);
});

test('missing issuer and audience cannot yield OAuth metadata or execute requests',async t=>{
 let upstreamCalls=0;
 const base=await fixture(t,{env:{},fetchImpl:async()=>{upstreamCalls++;throw Error('FORBIDDEN');}});
 const metadata=await fetch(base+'/.well-known/oauth-protected-resource/mcp');
 assert.equal(metadata.status,503);
 const response=await fetch(base+'/mcp',{
  method:'POST',
  headers:{authorization:'Bearer fixture-owner-token','content-type':'application/json'},
  body:'{}'
 });
 assert.equal(response.status,503);
 assert.equal(upstreamCalls,0);
});

test('metadata uses canonical issuer and audience but is not live auth',async t=>{
 const base=await fixture(t,{env});
 for(const suffix of ['/.well-known/oauth-protected-resource','/.well-known/oauth-protected-resource/mcp']){
  const response=await fetch(base+suffix);
  const json=await response.json();
  assert.equal(response.status,200);
  assert.equal(json.resource,AUDIENCE);
  assert.deepEqual(json.authorization_servers,[ISSUER]);
  assert.deepEqual(json.scopes_supported,['read:runtime']);
 }
 const health=await (await fetch(base+'/healthz')).json();
 assert.equal(health.identityBinding,'CONFIGURED_NOT_PROBED');
 assert.equal(health.runtimeUpstream,'CONFIGURED_NOT_PROBED');
 assert.equal(health.authenticatedMcp,'NOT_PROBED');
});

test('bearer challenge is required before forwarding and includes exact metadata path',async t=>{
 let upstreamCalls=0;
 const base=await fixture(t,{env,fetchImpl:async()=>{upstreamCalls++;throw Error('MUST_NOT_FETCH');}});
 const response=await fetch(base+'/mcp',{
  method:'POST',
  headers:{'content-type':'application/json'},
  body:JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize'})
 });
 assert.equal(response.status,401);
 assert.match(response.headers.get('www-authenticate'),/resource_metadata="https:\/\/bridge\.example\.test\/\.well-known\/oauth-protected-resource\/mcp"/);
 assert.equal(upstreamCalls,0);
});

test('original bounded forwarder preserves bearer but never forwards cookies',async t=>{
 let observed;
 const base=await fixture(t,{
  env,
  fetchImpl:async(url,init)=>{
   observed={url:String(url),init};
   return new Response('{"jsonrpc":"2.0","id":3,"result":{}}',{
    status:200,headers:{'content-type':'application/json'}
   });
  }
 });
 const response=await fetch(base+'/mcp',{
  method:'POST',
  headers:{authorization:'Bearer fake-owner-token','content-type':'application/json',cookie:'private=forbidden'},
  body:JSON.stringify({jsonrpc:'2.0',id:3,method:'tools/list'})
 });
 assert.equal(response.status,200);
 assert.equal(observed.url,UPSTREAM);
 assert.equal(observed.init.headers.authorization,'Bearer fake-owner-token');
 assert.equal(observed.init.headers.cookie,undefined);
 assert.equal(observed.init.redirect,'error');
});

test('origin and unsupported methods deny public MCP ingress without upstream call',async t=>{
 let calls=0;
 const base=await fixture(t,{env,fetchImpl:async()=>{calls++;throw Error('FORBIDDEN');}});
 const wrongOrigin=await fetch(base+'/mcp',{
  method:'POST',
  headers:{authorization:'Bearer fake-owner-token','content-type':'application/json',origin:'https://evil.example.test'},
  body:'{}'
 });
 assert.equal(wrongOrigin.status,403);
 assert.equal((await fetch(base+'/mcp',{method:'GET'})).status,405);
 assert.equal(calls,0);
});

test('listen port requires explicit valid unprivileged integer',()=>{
 assert.equal(resolvePublicMcpListenPort({}),3000);
 assert.equal(resolvePublicMcpListenPort({PORT:'8080'}),8080);
 for(const PORT of ['0','80','-1','abc','65536','3000.0','3000x']){
  assert.throws(()=>resolvePublicMcpListenPort({PORT}),/PUBLIC_MCP_PORT_INVALID/);
 }
});

test('public process health does not treat same-resource upstream as bound',async t=>{
 const base=await fixture(t,{env:{...env,LEEWAY_MCP_UPSTREAM:AUDIENCE}});
 const h=await (await fetch(base+'/healthz')).json();
 assert.equal(h.runtimeUpstream,'UNBOUND');
 assert.equal(h.deviceControl,'NOT_AUTHORIZED');
});

test('even valid-shaped bearer cannot be forwarded to a self-referential public audience',async t=>{
 let calls=0;
 const base=await fixture(t,{
  env:{...env,LEEWAY_MCP_UPSTREAM:AUDIENCE},
  fetchImpl:async()=>{calls++;throw Error('SELF_FORWARD_FORBIDDEN');}
 });
 const response=await fetch(base+'/mcp',{
  method:'POST',
  headers:{authorization:'Bearer owner-test-token','content-type':'application/json'},
  body:JSON.stringify({jsonrpc:'2.0',id:7,method:'tools/list'})
 });
 assert.equal(response.status,502);
 assert.equal(calls,0);
});
