/*
LEEWAY HEADER — DO NOT REMOVE

REGION: LEEWAY.DEVICE.BRIDGE
TAG: LEEWAY.DEVICE.BRIDGE.MCP_GATEWAY

5WH:
WHAT = Loopback-only authenticated HTTP adapter from LeeWay Agent Skills device MCP contract to the existing Device Bridge RelayAdapter
WHY = Reuse the existing Device Bridge runtime/relay without creating a parallel device authority
WHO = Leeway Industries / Creator-authorized Agent Lee runtimes
WHERE = clients/remote-controller/device-mcp-gateway.mjs
WHEN = 2026-10-02 onward
HOW = Bearer-authenticated localhost POST -> canonical RelayAdapter -> bounded read-only routes -> evidence response

LICENSE:
MIT
*/

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { RelayAdapter } from '../../packages/agent-relay/index.mjs';

const HOST='127.0.0.1';
const PORT=Number.parseInt(process.env.LEEWAY_DEVICE_MCP_GATEWAY_PORT||'5331',10);
const TOKEN=process.env.LEEWAY_DEVICE_MCP_BEARER_TOKEN||'';
const CREDS=process.env.LEEWAY_DEVICE_RELAY_CREDENTIALS_FILE||path.join(os.homedir(),'.leeway','workstation','credentials.json');

if(!TOKEN || TOKEN.length<24) throw new Error('LEEWAY_DEVICE_MCP_BEARER_TOKEN_REQUIRED');
const creds=JSON.parse(fs.readFileSync(CREDS,'utf8'));
if(!creds.deviceId||!creds.token||!creds.relay) throw new Error('INVALID_DEVICE_RELAY_CREDENTIALS');

const relay=new RelayAdapter({deviceId:creds.deviceId,token:creds.token,url:creds.relay});

function bearerMatches(req){
  const raw=String(req.headers.authorization||'');
  if(!raw.startsWith('Bearer ')) return false;
  const supplied=Buffer.from(raw.slice(7));
  const expected=Buffer.from(TOKEN);
  return supplied.length===expected.length && crypto.timingSafeEqual(supplied,expected);
}
function send(res,status,payload){
  const body=Buffer.from(JSON.stringify(payload));
  res.writeHead(status,{'content-type':'application/json','content-length':String(body.length),'cache-control':'no-store'});
  res.end(body);
}
async function readJson(req){
  let bytes=0; const chunks=[];
  for await(const chunk of req){bytes+=chunk.length;if(bytes>65536)throw new Error('REQUEST_TOO_LARGE');chunks.push(chunk)}
  return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');
}
function requireDevice(args){
  if(args?.device_id!==creds.deviceId) throw new Error('DEVICE_ID_MISMATCH');
}

const server=http.createServer(async(req,res)=>{
  try{
    if(req.method==='GET'&&req.url==='/health'){
      send(res,200,{ok:true,state:'LEEWAY_DEVICE_MCP_GATEWAY_READY',bind:HOST,port:PORT,authority:'4citeB4U/LEEWAY-DEVICE-BRIDGE',mutationRoutesEnabled:false});
      return;
    }
    if(req.method!=='POST'||!req.url?.startsWith('/tools/')){send(res,404,{ok:false,error:'NOT_FOUND'});return}
    if(!bearerMatches(req)){send(res,401,{ok:false,error:'UNAUTHORIZED'});return}
    const route=decodeURIComponent(req.url.slice('/tools/'.length));
    const body=await readJson(req);
    const args=body?.arguments||{};

    if(route==='device.list'){
      send(res,200,{devices:[{device_id:creds.deviceId,state:'AUTHORIZED_RELAY_CONFIGURED'}],receipt:{kind:'gateway-observation',route}});
      return;
    }
    if(route==='device.capabilities'){
      requireDevice(args);
      const upstream=await relay.execute('device.capabilities',{});
      send(res,200,{capabilities:upstream,receipt:{kind:'relay-observation',route,source:'RelayAdapter'}});
      return;
    }

    send(res,501,{ok:false,error:'ROUTE_NOT_QUALIFIED',route,executed:false,claim_boundary:'Gateway currently exposes read-only discovery only; mutation routes remain blocked until separately qualified.'});
  }catch(error){
    send(res,500,{ok:false,error:String(error?.message||error),executed:false});
  }
});

server.listen(PORT,HOST,()=>{
  console.log(JSON.stringify({state:'LEEWAY_DEVICE_MCP_GATEWAY_READY',host:HOST,port:PORT,mutationRoutesEnabled:false}));
});
