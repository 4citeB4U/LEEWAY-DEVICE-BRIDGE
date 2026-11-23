/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.TEST
TAG: LEEWAY.UNIVERSAL.ZITADEL.STARTUP.GUARDS.TEST
WHO: LeeWay Industries
WHAT: Confirm universal Zitadel host cannot bind to public interface or privileged port
WHEN: 2026-10-26
WHERE: tests/mcp/zitadel-mcp-startup.test.mjs
WHY: Preserve authenticated loopback host boundary before resolving device configuration
HOW: Node test; no credentials, database or live device access
AUTHORITY: Unit guard only
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import {startZitadelMcp,resolveZitadelDiscoveryStartup} from '../../operator/identity/start-zitadel-mcp.mjs';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer as createNetServer } from 'node:net';
test('public interface refused before any Bridge provider composition',async()=>{
 await assert.rejects(startZitadelMcp({host:'0.0.0.0',port:4272}),/PUBLIC_HTTP_BIND_DENIED/);
});
test('invalid port refused before any Bridge provider composition',async()=>{
 await assert.rejects(startZitadelMcp({port:80}),/MCP_PORT_INVALID/);
});

const env=Object.freeze({
 LEEWAY_DEVICE_BRIDGE_CONFIG:'fixture-bridge.json',
 LEEWAY_MCP_AUTH_ISSUER:'https://issuer.example.test',
 LEEWAY_MCP_AUDIENCE:'https://bridge.example.test/mcp',
 LEEWAY_MCP_OWNER_SUB:'owner-fixture-123456',
 LEEWAY_MCP_TOKEN_AUDIENCES:'project-100,project-200'
});

test('Zitadel discovery CLI binds configured issuer, owner and project audiences, never execution',()=>{
 const opts=resolveZitadelDiscoveryStartup({...env,LEEWAY_MCP_ENABLE_EXECUTION:'true'});
 assert.equal(opts.host,'127.0.0.1');
 assert.equal(opts.port,4272);
 assert.equal(opts.issuer,env.LEEWAY_MCP_AUTH_ISSUER);
 assert.equal(opts.resource,env.LEEWAY_MCP_AUDIENCE);
 assert.deepEqual(opts.tokenAudiences,['project-100','project-200']);
 assert.equal(opts.enableExecution,false);
 assert.equal(opts.runtimeInput,null);
 assert.equal(Object.isFrozen(opts),true);
});

test('Zitadel discovery CLI refuses unconfigured, legacy or unqualified identity',()=>{
 for(const name of Object.keys(env).filter(n=>n!=='LEEWAY_MCP_TOKEN_AUDIENCES')){
   const candidate={...env};delete candidate[name];
   assert.throws(()=>resolveZitadelDiscoveryStartup(candidate),/NATIVE_BRIDGE_(CONFIG_REQUIRED|ZITADEL_BINDINGS_REQUIRED)/);
 }
 assert.throws(()=>resolveZitadelDiscoveryStartup({
  LEEWAY_DEVICE_BRIDGE_CONFIG:'fixture-bridge.json',
  LEEWAY_LEGACY_ISSUER:'https://legacy.example.test',
  LEEWAY_LEGACY_OWNER_SUB:'legacy-fixture-owner'
 }),/NATIVE_BRIDGE_ZITADEL_BINDINGS_REQUIRED/);
 for(const port of ['80','0','-1','65536','4272foo']){
  assert.throws(()=>resolveZitadelDiscoveryStartup({...env,LEEWAY_MCP_LOCAL_PORT:port}),/NATIVE_BRIDGE_PORT_INVALID/);
 }
 for(const url of ['http://issuer.example.test','https://user:pass@issuer.example.test','https://issuer.example.test?x=1']){
  assert.throws(()=>resolveZitadelDiscoveryStartup({...env,LEEWAY_MCP_AUTH_ISSUER:url}),/NATIVE_BRIDGE_OIDC_URL_INVALID/);
 }
 assert.throws(()=>resolveZitadelDiscoveryStartup({...env,LEEWAY_MCP_AUDIENCE:'https://bridge.example.test/api/device-relay/mcp'}),/NATIVE_BRIDGE_OIDC_RESOURCE_INVALID/);
 assert.throws(()=>resolveZitadelDiscoveryStartup({...env,LEEWAY_MCP_OWNER_SUB:'x'}),/NATIVE_BRIDGE_OWNER_SUBJECT_INVALID/);
});

test('OS-neutral Zitadel discovery starts only on loopback and refuses unauthenticated MCP',async t=>{
 const root=await mkdtemp(join(tmpdir(),'leeway-zitadel-native-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 const configPath=join(root,'bridge.json');
 await writeFile(configPath,JSON.stringify({devices:[],receipts:'receipts/observation.jsonl'}));
 const reserve=createNetServer();
 await new Promise((resolve,reject)=>{reserve.once('error',reject);reserve.listen(0,'127.0.0.1',resolve)});
 const port=reserve.address().port;
 await new Promise(resolve=>reserve.close(resolve));
 const options=resolveZitadelDiscoveryStartup({...env,
  LEEWAY_DEVICE_BRIDGE_CONFIG:configPath,
  LEEWAY_MCP_LOCAL_PORT:String(port),
 });
 const server=await startZitadelMcp(options);
 t.after(async()=>{
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
 });
 assert.equal(server.address().address,'127.0.0.1');
 assert.equal(server.address().port,port);
 const response=await fetch('http://127.0.0.1:'+port+'/mcp',{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',
   params:{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'fixture',version:'1'}}})
 });
 assert.ok([401,403].includes(response.status),'unauthenticated MCP must fail closed');
 await response.body?.cancel();
});
