/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.MCP.AUTHENTICATED.QUALIFICATION
TAG: LEEWAY.MCP.AUTHENTICATED_DISCOVERY_TOOL_GATE.V1
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
5WH:
WHAT = Verify authenticated public MCP actually exposes owner-scoped Device Bridge discovery, not only runtime_health.
WHY = A live OAuth challenge or successful token verification alone must not be mistaken for a usable Device Bridge connection.
WHO = LeeWay Industries, trusted owner-authorized deployment operator
WHERE = operator/identity/qualify-authenticated-bridge-tools.mjs
WHEN = 2026-10-28
HOW = Exact HTTPS resource guard, bounded authenticated Streamable HTTP initialize and tools/list, deny any mutation tool.
AUTHORITY: Read-only discovery qualification, never authorizes computer execution or proves physical device health.
LICENSE: MIT
*/
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const MAX_BYTES=128*1024;
const ALLOWED=new Set(['bridge_devices','bridge_capabilities','runtime_health']);
const REQUIRED=['bridge_devices','bridge_capabilities'];
const fail=reason=>{throw Object.assign(new Error(reason),{code:reason});};
function parseResource(value,reason){
 let url;
 try{url=new URL(String(value||''));}catch{fail(reason);}
 if(url.protocol!=='https:'||!url.hostname||url.username||url.password||url.search||url.hash||url.pathname!=='/mcp'){
  fail(reason);
 }
 return url.toString();
}
async function boundedJson(response){
 const len=Number(response.headers.get('content-length')||0);
 if(len>MAX_BYTES)fail('MCP_QUALIFIER_RESPONSE_TOO_LARGE');
 const contentType=response.headers.get('content-type')||'';
 if(!/^application\/json(?:\s*;|$)/i.test(contentType))fail('MCP_QUALIFIER_JSON_REQUIRED');
 const reader=response.body?.getReader?.();
 if(!reader)fail('MCP_QUALIFIER_RESPONSE_STREAM_REQUIRED');
 const chunks=[];
 let size=0;
 try{
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   size+=value.byteLength;
   if(size>MAX_BYTES){
    await reader.cancel();
    fail('MCP_QUALIFIER_RESPONSE_TOO_LARGE');
   }
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);
 let offset=0;
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}
 catch{fail('MCP_QUALIFIER_INVALID_JSON');}
}
export async function qualifyAuthenticatedBridgeTools({endpoint,expectedResource,accessToken,fetchImpl=globalThis.fetch}={}){
 const target=parseResource(endpoint,'MCP_QUALIFIER_ENDPOINT_INVALID');
 const expected=parseResource(expectedResource,'MCP_QUALIFIER_RESOURCE_INVALID');
 if(target!==expected)fail('MCP_QUALIFIER_RESOURCE_MISMATCH');
 if(typeof accessToken!=='string'||accessToken.length<8||accessToken.length>16384||
    !/^[A-Za-z0-9_.~+\/-]+={0,2}$/.test(accessToken))fail('MCP_QUALIFIER_OWNER_TOKEN_REQUIRED');
 if(typeof fetchImpl!=='function')fail('MCP_QUALIFIER_FETCH_REQUIRED');
 async function request(id,method,params={}){
  let response;
  try{
   response=await fetchImpl(target,{
    method:'POST',
    redirect:'error',
    headers:{
     authorization:'Bearer '+accessToken,
     'content-type':'application/json',
     accept:'application/json, text/event-stream',
     'mcp-protocol-version':'2025-03-26'
    },
    body:JSON.stringify({jsonrpc:'2.0',id,method,params}),
    signal:AbortSignal.timeout(10000)
   });
  }catch{fail('MCP_QUALIFIER_UPSTREAM_UNREACHABLE');}
  if(response.status!==200)fail('MCP_QUALIFIER_HTTP_'+response.status);
  const body=await boundedJson(response);
  if(body?.jsonrpc!=='2.0'||body.id!==id||body.error||typeof body.result!=='object'||!body.result)fail('MCP_QUALIFIER_INVALID_RESPONSE');
  return body.result;
 }
 await request(1,'initialize',{
  protocolVersion:'2025-03-26',capabilities:{},
  clientInfo:{name:'leeway-qualified-bridge-readonly',version:'1.0.0'}
 });
 const found=await request(2,'tools/list');
 if(!Array.isArray(found.tools))fail('MCP_QUALIFIER_TOOLS_INVALID');
 const names=found.tools.map(x=>x?.name);
 if(!names.every(x=>typeof x==='string')||new Set(names).size!==names.length)fail('MCP_QUALIFIER_TOOL_NAMES_INVALID');
 if(!REQUIRED.every(x=>names.includes(x)))fail('MCP_QUALIFIER_BRIDGE_DISCOVERY_UNBOUND');
 if(!names.every(x=>ALLOWED.has(x)))fail('MCP_QUALIFIER_UNAUTHORIZED_TOOL_EXPOSURE');
 return Object.freeze({
  status:'AUTHENTICATED_READONLY_DISCOVERY_TOOLS_OBSERVED',
  resource:target,
  tools:names.slice().sort(),
  deviceConnectivity:'NOT_PROBED',
  continuumReadback:'NOT_PROBED',
  runtimeExecution:'NOT_AUTHORIZED',
  veritas:'NOT_PROBED',
  receiptLedger:'NOT_PROBED',
  learningLedger:'NOT_PROBED'
 });
}
if(process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 qualifyAuthenticatedBridgeTools({
  endpoint:process.env.LEEWAY_PUBLIC_MCP_ENDPOINT,
  expectedResource:process.env.LEEWAY_MCP_AUDIENCE,
  accessToken:process.env.LEEWAY_MCP_OWNER_ACCESS_TOKEN
 }).then(result=>console.log(JSON.stringify(result,null,2)))
  .catch(error=>{
   // Never print token or raw upstream response.
   console.error(JSON.stringify({status:'FAIL',code:error?.code||'MCP_QUALIFIER_FAILED'}));
   process.exitCode=1;
  });
}
