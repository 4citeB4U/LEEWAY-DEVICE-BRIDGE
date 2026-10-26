/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.PUBLIC.INGRESS
TAG: LEEWAY.VERCEL.MCP.AUTHENTICATED.FORWARDER.V1
WHO: LeeWay Industries
WHAT: Route Vercel MCP requests to existing authenticated LeeWay Runtime Fabric Device Bridge service
WHY: Reuse one universal dispatcher; no duplicate OAuth signer, database, tools, or execution engine
WHERE: api/mcp.mjs
WHEN: 2026-10-26
HOW: Explicit trusted HTTPS origin from server environment; bounded request relay with bearer token, no redirect
AUTHORITY: Transport only; upstream always verifies JWT, scope, admission and receipts
LICENSE: MIT
*/
const MAX=1024*1024;
const response=(res,code,body,extra={})=>{res.writeHead(code,{'content-type':'application/json','cache-control':'no-store',...extra});res.end(JSON.stringify(body));};
export default async function handler(req,res){
  if(req.method!=='POST')return response(res,405,{error:'METHOD_NOT_ALLOWED'},{allow:'POST'});
  const configured=process.env.LEEWAY_MCP_UPSTREAM;
  if(!configured)return response(res,503,{error:'LEEWAY_RUNTIME_UPSTREAM_UNBOUND'});
  let endpoint;
  try{
    endpoint=new URL(configured);
    if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash||endpoint.pathname!=='/mcp')throw Error('URL');
  }catch{return response(res,503,{error:'LEEWAY_RUNTIME_UPSTREAM_INVALID'});}
  if(typeof req.headers.origin==='string')return response(res,403,{error:'BROWSER_ORIGIN_NOT_ADMITTED'});
  if(typeof req.headers.authorization!=='string'||!/^Bearer [A-Za-z0-9_~+./=-]+$/.test(req.headers.authorization))return response(res,401,{error:'BEARER_REQUIRED'});
  if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return response(res,415,{error:'JSON_REQUIRED'});
  let raw;
  try{
    if(req.body!==undefined)raw=Buffer.from(typeof req.body==='string'?req.body:JSON.stringify(req.body));
    else {const parts=[];let length=0;for await(const p of req){length+=p.length;if(length>MAX)throw Error('LENGTH');parts.push(p)}raw=Buffer.concat(parts)}
    if(raw.length>MAX)throw Error('LENGTH');JSON.parse(raw.toString());
  }catch{return response(res,400,{error:'MCP_BODY_INVALID'});}
  try{
    const upstream=await fetch(endpoint,{method:'POST',headers:{authorization:req.headers.authorization,'content-type':'application/json',accept:'application/json, text/event-stream'},body:raw,redirect:'error',signal:AbortSignal.timeout(15000)});
    const body=Buffer.from(await upstream.arrayBuffer());
    if(body.length>MAX)return response(res,502,{error:'UPSTREAM_BODY_TOO_LARGE'});
    const type=upstream.headers.get('content-type')||'application/json';
    if(!/^(application\/json|text\/event-stream)/i.test(type))return response(res,502,{error:'UPSTREAM_CONTENT_TYPE_INVALID'});
    res.writeHead(upstream.status,{'content-type':type,'cache-control':'no-store'});
    res.end(body);
  }catch{return response(res,502,{error:'LEEWAY_RUNTIME_UPSTREAM_UNAVAILABLE'});}
}
