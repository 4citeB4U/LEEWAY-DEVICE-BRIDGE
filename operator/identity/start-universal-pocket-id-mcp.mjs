/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.HOST
TAG: LEEWAY.POCKET_ID.UNIVERSAL.MCP.START.V1
WHO: LeeWay Industries
WHAT: Start existing universal MCP handler with owner-verified Pocket ID discovery permissions
WHEN: 2026-10-26
WHERE: operator/identity/start-universal-pocket-id-mcp.mjs
WHY: Make PR #72 and #73 entrypoint composable without creating another Bridge or authority
HOW: Existing configured Bridge + JWT + exact approved host allowlist + loopback HTTP
AUTHORITY: Discovery only; no execution grants or public internet listener
LICENSE: MIT
*/
import http from 'node:http';
import { createConfiguredBridge } from '../../apps/desktop/mcp-server.mjs';
import { createPocketIdUniversalHandler } from './create-pocket-id-universal-handler.mjs';
export async function startUniversalPocketIdMcp({configPath,issuer,resource,ownerSubject,port=4272,host='127.0.0.1',fetchImpl}={}){
 if(host!=='127.0.0.1' && host!=='::1') throw Error('PUBLIC_HTTP_BIND_DENIED');
 if(!Number.isInteger(port)||port<1024||port>65535) throw Error('MCP_PORT_INVALID');
 const bridge=await createConfiguredBridge(configPath);
 const handler=createPocketIdUniversalHandler({
   issuer,resource,ownerSubject,fetchImpl,
   resolveBridge:async principal=>principal?.subject===ownerSubject?bridge:null,
   allowedHosts:[host+':'+port],allowedOrigins:[]
 });
 const server=http.createServer(handler);
 try {await new Promise((resolve,reject)=>{
   server.once('error',reject);
   server.listen(port,host,resolve);
 });} catch(e){server.close();throw e}
 return server;
}
