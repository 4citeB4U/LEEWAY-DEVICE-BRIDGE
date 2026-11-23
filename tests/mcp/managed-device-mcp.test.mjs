/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.MANAGED.MCP.TEST
TAG: LEEWAY.MANAGED.ZITADEL_DISCOVERY.TEST.V1
5WH:
WHAT = Test managed canonical Bridge HTTP startup without Windows and with a genuine Zitadel verifier.
WHY = Replace the stale Tailscale-only upstream with an independent managed Device Bridge destination.
WHO = Source CI; not independent Veritas.
WHERE = tests/mcp/managed-device-mcp.test.mjs.
WHEN = 2026-11-23.
HOW = Strict env failures and a physical localhost HTTP socket with no invented enrollment or command.
AUTHORITY = SOURCE_TEST_ONLY.
LICENSE = MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,writeFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer as createTcp } from 'node:net';
import { resolveManagedDeviceMcpConfig,startManagedDeviceMcp } from '../../operator/hosting/start-managed-device-mcp.mjs';

const base=Object.freeze({
 PORT:'4278',
 LEEWAY_MCP_AUTH_ISSUER:'https://issuer.example.test',
 LEEWAY_MCP_AUDIENCE:'https://leeway-public.example.test/mcp',
 LEEWAY_MANAGED_DEVICE_BRIDGE_URL:'https://leeway-native.example.test/mcp',
 LEEWAY_MCP_OWNER_SUB:'owner-subject-123456',
 LEEWAY_DEVICE_BRIDGE_CONFIG:'owner-configured.json',
});

test('managed startup requires explicit Zitadel issuer, authorized public host, resource and no hardcoded workstation',()=>{
 const c=resolveManagedDeviceMcpConfig(base);
 assert.equal(c.port,4278);
 assert.equal(c.allowedHost,'leeway-native.example.test');
 assert.equal(c.executionEnabled,false);
 assert.equal(c.issuer,base.LEEWAY_MCP_AUTH_ISSUER+'/');
 assert.equal(c.resource,base.LEEWAY_MCP_AUDIENCE);
 assert.equal(Object.isFrozen(c),true);
 assert.deepEqual(c.tokenAudiences,[]);
 assert.equal(c.configPath,base.LEEWAY_DEVICE_BRIDGE_CONFIG);
});

test('managed startup refuses unconfigured owner/issuer/resource/hostname/port and URL loops',()=>{
 for(const key of Object.keys(base)){
  const env={...base};delete env[key];
  assert.throws(()=>resolveManagedDeviceMcpConfig(env),/MANAGED_BRIDGE_/);
 }
 for(const [key,value] of [
  ['PORT','80'],['PORT','65536'],['PORT','4278wrong'],
  ['LEEWAY_MCP_AUTH_ISSUER','http://issuer.example.test'],
  ['LEEWAY_MCP_AUTH_ISSUER','https://user:pass@issuer.example.test'],
  ['LEEWAY_MCP_AUDIENCE','https://leeway-public.example.test/api/mcp'],
  ['LEEWAY_MANAGED_DEVICE_BRIDGE_URL','https://leeway-native.example.test/mcp?debug=1'],
  ['LEEWAY_MANAGED_DEVICE_BRIDGE_URL','https://leeway-public.example.test/mcp'],
  ['LEEWAY_MANAGED_DEVICE_BRIDGE_URL','https://issuer.example.test/mcp'],
  ['LEEWAY_MCP_OWNER_SUB','x'],
 ])assert.throws(()=>resolveManagedDeviceMcpConfig({...base,[key]:value}),/MANAGED_BRIDGE_/,key);
});

test('managed startup rejects token audience poisoning and cannot opt in to execution',()=>{
 assert.throws(()=>resolveManagedDeviceMcpConfig({...base,
  LEEWAY_MCP_TOKEN_AUDIENCES:'safe-id,https://evil.invalid/steal?a=1'}),/MANAGED_BRIDGE_TOKEN_AUDIENCE_INVALID/);
 const c=resolveManagedDeviceMcpConfig({...base,LEEWAY_MCP_ENABLE_EXECUTION:'true',
   LEEWAY_VERITAS_PRE_GATE:'true',LEEWAY_MCP_TOKEN_AUDIENCES:'project-01,project-02'});
 assert.equal(c.executionEnabled,false);
 assert.deepEqual(c.tokenAudiences,['project-01','project-02']);
});

test('real managed Node HTTP listener serves honest health, denies other paths, and requires Zitadel bearer for MCP',async t=>{
 const root=await mkdtemp(join(tmpdir(),'leeway-managed-native-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 const config=join(root,'bridge.json');
 await writeFile(config,JSON.stringify({devices:[],receipts:'receipts/observations.jsonl'}));
 const tcp=createTcp();
 await new Promise((resolve,reject)=>{tcp.once('error',reject);tcp.listen(0,'127.0.0.1',resolve)});
 const port=tcp.address().port;
 await new Promise(resolve=>tcp.close(resolve));
 const server=await startManagedDeviceMcp({env:{...base,PORT:String(port),LEEWAY_DEVICE_BRIDGE_CONFIG:config},log:()=>{}});
 t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve))});
 const origin='http://127.0.0.1:'+port;
 const health=await fetch(origin+'/healthz');
 assert.equal(health.status,200);
 const body=await health.json();
 assert.equal(body.service,'leeway-managed-device-mcp');
 assert.equal(body.deviceRegistry,'REGISTRATION_AUTHORITY_UNBOUND');
 assert.equal(body.execution,'NOT_AUTHORIZED');
 assert.equal(body.deviceReachability,'NOT_PROBED');
 assert.equal((await fetch(origin+'/not-a-device')).status,404);
 const payload={jsonrpc:'2.0',id:1,method:'initialize',
  params:{protocolVersion:'2025-03-26',clientInfo:{name:'untrusted',version:'1'},capabilities:{}}};
 const anonymous=await fetch(origin+'/mcp',{method:'POST',
  headers:{'Content-Type':'application/json','Host':'leeway-native.example.test'},
  body:JSON.stringify(payload)});
 assert.equal(anonymous.status,401);
 assert.equal((await anonymous.json()).error,'MCP_AUTHENTICATION_REQUIRED');
 const invalidHost=await fetch(origin+'/mcp',{method:'POST',
  headers:{'Content-Type':'application/json','Host':'other.example.test'},
  body:JSON.stringify(payload)});
 assert.equal(invalidHost.status,403);
 assert.equal((await invalidHost.json()).error,'MCP_ORIGIN_OR_HOST_DENIED');
});
