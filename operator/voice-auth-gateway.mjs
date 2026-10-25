/*
LEEWAY HEADER — DO NOT REMOVE
REGION: DEVICE.BRIDGE.VOICE.HTTPS.AUTH
TAG: VOICE_ONLY_AUTHENTICATED_REVERSE_PROXY_ORIGIN_BOUND
WHO: LeeWay Industries; WHAT: guarded browser voice session + read-only turn
WHY: public Pages cannot use localhost or relay device commands
WHERE: Device Bridge loopback listener, behind operator-managed TLS proxy
WHEN: 2026-10-24; HOW: scrypt login, secure httpOnly cookie, CSRF, origin,
session expiry, rate limits, bounded inputs, verified upstream provenance
AUTHORITY: Voice conversation only, no GPU, desktop control or admin actions
LICENSE: MIT
*/
import http from 'node:http';
import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';

const FRONTEND='https://4citeb4u.github.io';
const ROUTES=Object.freeze({login:'/v1/voice/login',session:'/v1/voice/session',turn:'/v1/voice/turn'});
const now=()=>Date.now();
const sha=data=>createHash('sha256').update(data).digest('hex');
const equal=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y)};
const json=(res,status,body,extra={})=>{
 res.writeHead(status,{'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store','x-content-type-options':'nosniff',
  'vary':'Origin',...extra});res.end(JSON.stringify(body));
};
const boundedBody=async(req)=>{
 let size=0;const chunks=[];
 for await(const c of req){size+=c.length;if(size>8192)throw Error('BODY_TOO_LARGE');chunks.push(c)}
 return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');
};
export function createVoiceAuthGateway({
 passwordHash,passwordSalt,fetchImpl=fetch,sessionDurationMs=30*60*1000,
 upstream='http://127.0.0.1:5173/__leeway/voice-turn',clock=now
}={}){
 if(!/^[a-f0-9]{128}$/.test(passwordHash||'')||!(/^[a-f0-9]{32,128}$/.test(passwordSalt||'')))
  throw Error('VOICE_AUTH_HASH_AND_SALT_REQUIRED');
 const u=new URL(upstream);
 if(u.protocol!=='http:'||u.hostname!=='127.0.0.1'||u.port!=='5173'||
  u.pathname!=='/__leeway/voice-turn'||u.search)throw Error('UNTRUSTED_VOICE_UPSTREAM');
 const sessions=new Map(),failures=new Map();
 const allowOrigin=req=>req.headers.origin===FRONTEND;
 const headers={'access-control-allow-origin':FRONTEND,
  'access-control-allow-credentials':'true'};
 const cookie=req=>{
  const match=/(?:^|;\s*)__Host-leeway-voice=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie||'');
  return match?.[1]||null;
 };
 const verify=req=>{
  const token=cookie(req),session=token&&sessions.get(sha(token));
  if(!session)return null;
  if(session.expires<=clock()){sessions.delete(sha(token));return null}
  return session;
 };
 const deny=(res,code,error)=>json(res,code,{ok:false,error},headers);
 async function handler(req,res){
  const method=req.method||'GET',route=new URL(req.url||'/', 'http://127.0.0.1').pathname;
  if(route!=='/health' && !Object.values(ROUTES).includes(route))
   return deny(res,404,'NOT_FOUND');
  if(route==='/health')return json(res,200,{ready:true,
   authority:'LEEWAY_DEVICE_BRIDGE_VOICE',internetPublished:false,upstreamQualified:false});
  if(!allowOrigin(req))return deny(res,403,'VOICE_ORIGIN_DENIED');
  if(method==='OPTIONS'){
   if(![ROUTES.login,ROUTES.session,ROUTES.turn].includes(route))return deny(res,404,'NOT_FOUND');
   res.writeHead(204,{...headers,'access-control-allow-methods':'GET, POST, OPTIONS',
    'access-control-allow-headers':'content-type,x-leeway-voice-csrf',
    'access-control-max-age':'300','vary':'Origin'});return res.end();
  }
  if(route===ROUTES.login&&method==='POST'){
   const ip=req.socket.remoteAddress||'unknown',window=failures.get(ip)||{count:0,reset:clock()+60000};
   if(window.reset<=clock()){window.count=0;window.reset=clock()+60000}
   if(window.count>=5)return deny(res,429,'LOGIN_RATE_LIMIT');
   let data;try{data=await boundedBody(req)}catch{return deny(res,400,'INVALID_LOGIN_BODY')}
   if(typeof data.password!=='string'||data.password.length<16||data.password.length>256)return deny(res,400,'INVALID_LOGIN');
   const actual=scryptSync(data.password,Buffer.from(passwordSalt,'hex'),64).toString('hex');
   if(!equal(actual,passwordHash)){
    window.count++;failures.set(ip,window);return deny(res,401,'VOICE_LOGIN_REJECTED');
   }
   failures.delete(ip);
   const token=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex');
   sessions.set(sha(token),{csrf,expires:clock()+sessionDurationMs});
   return json(res,200,{schema:'leeway.voice.session.v1',authenticated:true,
    authority:'LEEWAY_DEVICE_BRIDGE_VOICE',csrfToken:csrf},
    {...headers,'set-cookie':'__Host-leeway-voice='+token+'; Path=/; HttpOnly; Secure; SameSite=None; Max-Age='+Math.floor(sessionDurationMs/1000)});
  }
  const session=verify(req);
  if(route===ROUTES.session&&method==='GET'){
   if(!session)return deny(res,401,'VOICE_SESSION_REQUIRED');
   return json(res,200,{schema:'leeway.voice.session.v1',authenticated:true,
    authority:'LEEWAY_DEVICE_BRIDGE_VOICE',csrfToken:session.csrf},headers);
  }
  if(route===ROUTES.turn&&method==='POST'){
   if(!session)return deny(res,401,'VOICE_SESSION_REQUIRED');
   if(!equal(req.headers['x-leeway-voice-csrf']||'',session.csrf))return deny(res,403,'VOICE_CSRF_DENIED');
   if(!(req.headers['content-type']||'').startsWith('application/json'))return deny(res,415,'JSON_REQUIRED');
   let data;try{data=await boundedBody(req)}catch{return deny(res,400,'VOICE_BODY_INVALID')}
   if(data?.schema!=='leeway.voice.turn.v1'||data.final!==true||
    data.allowDeviceActions!==false||!['machine','llm'].includes(data.mode)||
    typeof data.text!=='string'||!data.text.trim()||data.text.length>2500)
    return deny(res,422,'VOICE_REQUEST_INVALID');
   try{
    const upstreamReply=await fetchImpl(upstream,{method:'POST',
     headers:{origin:'http://127.0.0.1:5173','x-leeway-voice-test':'live-conversation',
      'content-type':'application/json'},
     body:JSON.stringify({mode:data.mode,text:data.text,final:true}),
     signal:AbortSignal.timeout(90000),redirect:'error'});
    if(!upstreamReply.ok)return deny(res,503,'LEEWAY_VOICE_UPSTREAM_UNAVAILABLE');
    const output=await upstreamReply.json();
    const machine=output.source==='LEEWAY_MACHINE_CONSCIOUSNESS'&&
      output.results?.some(r=>r.kind==='machine'&&r.valid===true);
    const llm=output.source==='OLLAMA_QWEN35_4B'&&
      output.status==='GENERATED_NOT_VERITAS_VERIFIED'&&output.gpuInferenceVerified===false;
    if((data.mode==='machine'&&!machine)||(data.mode==='llm'&&!llm)||
      typeof output.text!=='string'||!output.text.trim()||output.text.length>4000)
     return deny(res,503,'LEEWAY_VOICE_RESPONSE_UNVERIFIED');
    return json(res,200,{schema:'leeway.voice.turn-result.v1',
     source:output.source,text:output.text,verified:!!machine,
     veritasStatus:machine?'PASS':'NOT_VERIFIED',status:output.status,
     gpuInferenceVerified:false,requestId:output.results?.[0]?.requestId||null,
     receiptHash:output.results?.[0]?.receiptHash||null},headers);
   }catch{return deny(res,503,'LEEWAY_VOICE_UPSTREAM_UNAVAILABLE')}
  }
  return deny(res,405,'METHOD_NOT_ALLOWED');
 }
 return {handler,sessionCount:()=>sessions.size};
}
export function startVoiceAuthGateway({port=5332,host='127.0.0.1',...args}={}){
 if(host!=='127.0.0.1')throw Error('VOICE_HTTPS_PROXY_REQUIRED_NO_PUBLIC_BIND');
 const gateway=createVoiceAuthGateway(args);
 const server=http.createServer((req,res)=>void gateway.handler(req,res));
 return new Promise((resolve,reject)=>{
  server.once('error',reject);server.listen(port,host,()=>resolve({server,gateway,port:server.address().port}));
 });
}
if(process.argv[1]&&import.meta.url===new URL('file:///'+process.argv[1].replaceAll('\\','/')).href){
 try{
  const passwordHash=process.env.LEEWAY_VOICE_AUTH_SCRYPT_HASH;
  const passwordSalt=process.env.LEEWAY_VOICE_AUTH_SCRYPT_SALT;
  const result=await startVoiceAuthGateway({passwordHash,passwordSalt});
  console.log(JSON.stringify({ready:true,localhost:'127.0.0.1',port:result.port,
   remoteAccess:'REQUIRES_SEPARATE_AUTHENTICATED_HTTPS_REVERSE_PROXY'}));
 }catch(error){console.error(error.message);process.exitCode=1}
}
