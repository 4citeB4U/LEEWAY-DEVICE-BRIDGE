/*
REGION: LEEWAY.DEVICES.TRANSPORT
TAG: PAIRED_PHONE_RUNTIME_GATEWAY
WHO: Owner-paired LeeWay bodies. WHAT: TLS-pinned transport from an authorized phone body to the existing Runtime Fabric carrier.
WHEN: Cross-body routing is selected. WHERE: Device Bridge transport adapter; not a second consciousness.
WHY: USB cannot be an execution dependency and raw LAN HTTP is not an acceptable authority boundary.
HOW: TLS + per-body bearer token + loopback-only upstream + bounded request/response + no device voice selection.
LICENSE: MIT
*/
import https from 'node:https';import fs from 'node:fs';import crypto from 'node:crypto';
const port=Number(process.env.LEEWAY_PHONE_GATEWAY_PORT||8892),carrier='http://127.0.0.1:8890';
const state=process.env.LOCALAPPDATA+'\\\\LeeWay\\\\RuntimePairing',token=fs.readFileSync(state+'\\\\phone-fold6.token','utf8').trim(),pairedBody=fs.readFileSync(state+'\\\\phone-fold6.device-id','utf8').trim();
const options={key:fs.readFileSync(state+'\\runtime-gateway.key'),cert:fs.readFileSync(state+'\\runtime-gateway.crt'),minVersion:'TLSv1.2'};
function send(res,code,data){const b=Buffer.from(JSON.stringify(data));res.writeHead(code,{'content-type':'application/json','content-length':b.length,'cache-control':'no-store','x-content-type-options':'nosniff'});res.end(b)}
function authorized(req){const supplied=req.headers.authorization?.replace(/^Bearer\s+/i,'')||'';const a=Buffer.from(supplied),b=Buffer.from(token);return a.length===b.length&&a.length>0&&crypto.timingSafeEqual(a,b)}
async function upstream(path,body){const r=await fetch(carrier+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});const data=await r.json();if(!r.ok)throw new Error(data.error||('UPSTREAM_'+r.status));return data}
// Existing paired body transport also carries the original Studio's bounded JSON API.
let studioOwnerCookie='';
const studio='http://127.0.0.1:8877';
const studioRoutes=new Set(['GET /api/local/status','GET /api/local/voices','GET /api/provider/status','POST /api/local/synthesize','GET /api/agent-lee/selection/session','POST /api/agent-lee/selection']);
async function studioRequest(req,res){
 if(!authorized(req))return send(res,403,{error:'PAIRING_AUTHORITY_REQUIRED'});
 let input='';for await(const c of req){input+=c;if(input.length>12000)throw Error('STUDIO_REQUEST_LIMIT');}
 const d=JSON.parse(input||'{}');
 if(d.bodyId!==pairedBody||!studioRoutes.has(d.method+' '+d.path)||typeof d.body!=='string'||d.body.length>8192||typeof d.csrf!=='string'||d.csrf.length>256)return send(res,400,{error:'STUDIO_REQUEST_NOT_ADMITTED'});
 const headers={'Content-Type':'application/json','Origin':studio,'Sec-Fetch-Site':'same-origin'};
 if(studioOwnerCookie)headers.Cookie=studioOwnerCookie;
 if(d.csrf)headers['X-LeeWay-Owner-CSRF']=d.csrf;
 const response=await fetch(studio+d.path,{method:d.method,headers,body:d.method==='POST'?d.body:undefined,signal:AbortSignal.timeout(155000)});
 const cookie=response.headers.get('set-cookie');if(d.path==='/api/agent-lee/selection/session'&&cookie)studioOwnerCookie=cookie.split(';',1)[0];
 let raw='',size=0;for await(const chunk of response.body){size+=chunk.length;if(size>24000000)throw Error('STUDIO_RESPONSE_LIMIT');raw+=Buffer.from(chunk).toString('utf8');}
 return send(res,200,{status:response.status,body:raw,authority:'LEEWAY_VOICE_FABRIC',route:'OWNER_PAIRED_STUDIO_ADAPTER'});
}
https.createServer(options,async(req,res)=>{try{
 if(req.method==='POST'&&req.url==='/voice-studio/request')return await studioRequest(req,res);
 if(req.method==='GET'&&req.url==='/health')return send(res,200,{identity:'LEEWAY_PAIRED_PHONE_RUNTIME_GATEWAY',transportOnly:true,voiceAuthority:'LEEWAY_VOICE_FABRIC',conversationAuthority:'LEEWAY_MACHINE_CONSCIOUSNESS',usbRequired:false});
 if(req.method!=='POST'||req.url!=='/turn')return send(res,404,{error:'NOT_FOUND'});if(!authorized(req))return send(res,403,{error:'PAIRING_AUTHORITY_REQUIRED'});
 let raw='';for await(const c of req){raw+=c;if(raw.length>8192)throw new Error('REQUEST_TOO_LARGE')}const d=JSON.parse(raw||'{}');if(d.bodyId!==pairedBody||typeof d.text!=='string'||!d.text.trim()||d.text.length>1500)return send(res,400,{error:'INVALID_TURN'});
 const result=await upstream('/speak',{text:d.text,body:'phone-fold6'});if(!result?.response?.text||!result?.voice?.audioContent)throw new Error('UPSTREAM_TURN_INCOMPLETE');
 return send(res,200,{text:result.response.text,intent:result.response.intent,receiptHash:result.response.receiptHash,personaDelivery:result.response.personaDelivery,voice:{voicePackageId:result.voice.voicePackageId,provider:result.voice.provider,voiceId:result.voice.voiceId,audioContent:result.voice.audioContent,format:result.voice.format,selectionRevision:result.voice.selectionRevision,selectionJson:result.voice.selectionJson,acousticEvidence:result.voice.acousticEvidence||null},speechReceipt:result.speechReceipt,route:{from:'phone-fold6',to:'LEEWAY_MACHINE_CONSCIOUSNESS',transport:'PAIRED_TLS',pcDependency:'CURRENT_PROVIDER_ROUTE_NOT_STANDALONE_PHONE_ACCEPTANCE'}})
 }catch(e){send(res,500,{error:String(e.message||e)})}
}).listen(port,'0.0.0.0',()=>console.log('LeeWay paired phone runtime gateway listening '+port));
