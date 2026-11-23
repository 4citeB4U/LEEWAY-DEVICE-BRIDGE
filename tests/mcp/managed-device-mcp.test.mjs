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
import { request as httpRequest } from 'node:http';
import { generateKeyPairSync, sign } from 'node:crypto';
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
 assert.equal(c.issuer,base.LEEWAY_MCP_AUTH_ISSUER);
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
 const postWithHost=host=>new Promise((resolve,reject)=>{
  const data=JSON.stringify(payload);
  const req=httpRequest({hostname:'127.0.0.1',port,path:'/mcp',method:'POST',
   headers:{Host:host,'Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}},res=>{
    const chunks=[];res.on('data',part=>chunks.push(part));
    res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(Buffer.concat(chunks).toString('utf8'))}));
  });
  req.on('error',reject);
  req.end(data);
 });
 const anonymous=await postWithHost('leeway-native.example.test');
 assert.equal(anonymous.status,401);
 assert.equal(anonymous.body.error,'MCP_AUTHENTICATION_REQUIRED');
 const invalidHost=await postWithHost('other.example.test');
 assert.equal(invalidHost.status,403);
 assert.equal(invalidHost.body.error,'MCP_ORIGIN_OR_HOST_DENIED');
});

test('real signed Zitadel owner token authenticates managed MCP and discovers only the genuine empty registry',async t=>{
 const root=await mkdtemp(join(tmpdir(),'leeway-managed-authorized-test-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 const config=join(root,'bridge.json');
 await writeFile(config,JSON.stringify({devices:[],receipts:'receipts/observation.jsonl'}));
 const tcp=createTcp();
 await new Promise((resolve,reject)=>{tcp.once('error',reject);tcp.listen(0,'127.0.0.1',resolve)});
 const port=tcp.address().port;
 await new Promise(resolve=>tcp.close(resolve));
 const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 const jwk={...publicKey.export({format:'jwk'}),kid:'test-owner-signing-key',use:'sig',alg:'RS256'};
 const issuer=base.LEEWAY_MCP_AUTH_ISSUER;
 const fetchImpl=async url=>{
  if(String(url)===issuer+'/.well-known/openid-configuration')return Response.json({
   issuer,jwks_uri:issuer+'/keys'
  });
  if(String(url)===issuer+'/keys')return Response.json({keys:[jwk]});
  throw Error('UNEXPECTED_ZITADEL_DISCOVERY_REQUEST');
 };
 const server=await startManagedDeviceMcp({env:{...base,PORT:String(port),LEEWAY_DEVICE_BRIDGE_CONFIG:config},
  log:()=>{},fetchImpl});
 t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve))});
 const now=Math.floor(Date.now()/1000);
 const header=Buffer.from(JSON.stringify({alg:'RS256',kid:jwk.kid,typ:'JWT'})).toString('base64url');
 const claims=Buffer.from(JSON.stringify({
  iss:issuer,sub:base.LEEWAY_MCP_OWNER_SUB,aud:base.LEEWAY_MCP_AUDIENCE,
  iat:now,exp:now+300,scope:'device.bridge.read'
 })).toString('base64url');
 const signingInput=header+'.'+claims;
 const token=sign('RSA-SHA256',Buffer.from(signingInput),privateKey).toString('base64url');
 const post=(name,params,id)=>new Promise((resolve,reject)=>{
  const body=JSON.stringify({jsonrpc:'2.0',id,method:name,params});
  const req=httpRequest({hostname:'127.0.0.1',port,path:'/mcp',method:'POST',headers:{
   Host:'leeway-native.example.test',Authorization:'Bearer '+signingInput+'.'+token,
   'Content-Type':'application/json','Accept':'application/json, text/event-stream',
   'Content-Length':Buffer.byteLength(body)
  }},res=>{
   const chunks=[];res.on('data',part=>chunks.push(part));
   res.on('end',()=>{const raw=Buffer.concat(chunks).toString('utf8');
    try {resolve({status:res.statusCode,data:JSON.parse(raw)})}
    catch {reject(Error('MCP_RESPONSE_INVALID '+raw.slice(0,160)))}
   });
  });req.on('error',reject);req.end(body);
 });
 const init=await post('initialize',{protocolVersion:'2025-03-26',
  capabilities:{},clientInfo:{name:'signed-fixture',version:'1'}},1);
 assert.equal(init.status,200);
 assert.equal(init.data.result?.serverInfo?.name,'leeway-device-bridge');
 const result=await post('tools/call',{name:'bridge_devices',arguments:{}},2);
 assert.equal(result.status,200);
 const content=JSON.parse(result.data.result?.content?.[0]?.text||'null');
 assert.deepEqual(content.devices,[]);
 assert.equal(content.registrationState,'REGISTRATION_AUTHORITY_UNBOUND');
 assert.equal(content.registrationAuthority,null);
 assert.equal(content.reachability,'NOT_PROBED');
});
