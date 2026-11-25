/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.MCP.REMOTE_TRANSPORT_EVIDENCE
TAG: LEEWAY.MCP.PUBLIC_GATEWAY_EXTERNAL_READBACK.V1 — RETIRED 2026-11-25
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Northflank (Render retired)
5WH:
WHAT = Legacy Render staging qualification script — RETIRED. The staging Render endpoint
       leeway-device-bridge-mcp-qual.onrender.com is no longer an active LeeWay dependency.
WHY = Preserved as historical audit evidence. Use scripts/qualify-managed-native-https.mjs
      (Northflank canonical endpoint) for live transport qualification.
WHO = LeeWay Device Bridge operators and independent reviewers.
WHERE = scripts/qualify-public-mcp-staging.mjs (RETIRED — do not invoke against production)
WHEN = 2026-10-28 (retired 2026-11-25; replaced by northflank-managed-mcp-live-qualification workflow)
HOW = Bounded remote GET/HEAD/POST against retired Render staging host; verify fail-closed unbound state.
AUTHORITY: RETIRED_TRANSPORT_EVIDENCE_ONLY — this script targets a decommissioned Render staging service.
LICENSE: MIT
*/
// RETIRED: This script targeted the decommissioned Render staging endpoint.
// It is preserved as audit evidence only. Do not invoke or update for production use.
// See scripts/qualify-managed-native-https.mjs for the active Northflank qualification.
throw new Error('QUALIFY_PUBLIC_MCP_STAGING_RETIRED — Render staging endpoint decommissioned 2026-11-25; use qualify-managed-native-https.mjs for Northflank');
const FAIL_CODES=new Set(['MCP_OAUTH_ENVIRONMENT_INCOMPLETE','OAUTH_RESOURCE_METADATA_UNAVAILABLE']);

async function probe(path,method='GET',body=null){
 const url=new URL(path,STAGING_ORIGIN);
 if(url.origin!==STAGING_ORIGIN||url.username||url.password||url.search||url.hash){
  throw new Error('STAGING_PROBE_TARGET_INVALID');
 }
 const headers={accept:'application/json'};
 if(method==='POST'){
  headers.authorization='Bearer fixture-no-real-identity';
  headers['content-type']='application/json';
 }
 const response=await fetch(url,{
  method,headers,
  ...(body!==null?{body:JSON.stringify(body)}:{}),
  redirect:'error',
  signal:AbortSignal.timeout(90_000)
 });
 const contentType=response.headers.get('content-type')||'';
 if(response.status!==404 && response.status!==405 && !/application\/json/i.test(contentType)){
  throw new Error('STAGING_PROBE_CONTENT_TYPE_INVALID');
 }
 let payload=null;
 if(method!=='HEAD'){
  const text=await response.text();
  if(text.length>4096)throw new Error('STAGING_PROBE_RESPONSE_TOO_LARGE');
  if(text)payload=JSON.parse(text);
 }
 return {status:response.status,body:payload};
}

export async function qualifyPublicMcpStaging(){
 const report={gateway:STAGING_ORIGIN,
  claims:{networkTransport:'NOT_PROBED',identity:'UNBOUND',authenticatedMcp:'NOT_PROBED',
  deviceCommands:'NOT_ADMITTED',continuum:'NOT_PROBED',veritas:'NOT_PROBED',receipts:'NOT_PROBED'}
 };
 const health=await probe('/healthz');
 assert.equal(health.status,200,'live HTTPS /healthz');
 assert.equal(health.body?.service,'leeway-public-mcp-ingress');
 assert.equal(health.body?.process,'RUNNING');
 assert.equal(health.body?.identityBinding,'UNBOUND');
 assert.equal(health.body?.runtimeUpstream,'UNBOUND');
 assert.equal(health.body?.deviceControl,'NOT_AUTHORIZED');
 report.claims.networkTransport='HTTPS_PROCESS_HEALTH_CONFIRMED';

 const scoped=await probe('/.well-known/oauth-protected-resource/mcp');
 assert.equal(scoped.status,503,'missing original issuer must deny OAuth resource');
 assert.ok(FAIL_CODES.has(scoped.body?.reason)||FAIL_CODES.has(scoped.body?.error));
 const alias=await probe('/.well-known/oauth-protected-resource');
 assert.equal(alias.status,503,'missing original issuer must deny alias');

 const denied=await probe('/mcp','POST',{
  jsonrpc:'2.0',id:1,method:'tools/list'
 });
 assert.equal(denied.status,503,'a synthetic bearer must not admit unbound MCP');
 assert.equal(denied.body?.error,'MCP_OAUTH_ENVIRONMENT_INCOMPLETE');
 assert.equal((await probe('/mcp')).status,405,'unsupported GET must fail');
 assert.equal((await probe('/api/mcp')).status,404,'framework handler cannot be bypassed by direct path');
 assert.equal((await probe('/healthz','HEAD')).status,200,'HEAD health must not expose details');

 return Object.freeze({
  ...report,
  outcome:'PUBLIC_TRANSPORT_HEALTH_CONFIRMED_BUT_OAUTH_AND_RUNTIME_UNBOUND',
  checkedPaths:['/healthz','/.well-known/oauth-protected-resource/mcp',
    '/.well-known/oauth-protected-resource','/mcp','/api/mcp'],
  syntheticBearer:'USED_NO_REAL_TOKENS',
  ownerData:'NOT_SENT',
  deviceExecution:'NOT_ATTEMPTED'
 });
}

if(process.argv[1] && import.meta.url===new URL('file://'+process.argv[1]).href){
 qualifyPublicMcpStaging().then(r=>console.log(JSON.stringify(r,null,2)))
 .catch(err=>{console.error(JSON.stringify({status:'LIVE_MCP_STAGING_PROBE_FAILED',
   code:String(err?.code||err?.message||'UNKNOWN').slice(0,130)}));process.exitCode=1;});
}
