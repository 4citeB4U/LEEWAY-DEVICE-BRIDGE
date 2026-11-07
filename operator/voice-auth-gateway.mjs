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
const ROUTES=Object.freeze({login:'/v1/voice/login',session:'/v1/voice/session',turn:'/v1/voice/turn',interrupt:'/v1/voice/interrupt',pairStart:'/v1/voice/pair/start',pairClaim:'/v1/voice/pair/claim',capabilities:'/v1/voice/capabilities',synthesize:'/v1/voice/synthesize',synthesisStatus:'/v1/voice/synthesis-status'});
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
 passwordHash,passwordSalt,fetchImpl=fetch,pairing=null,
 registeredApps={'leeway.voice.studio':FRONTEND},sessionDurationMs=30*60*1000,
 voiceFabric='http://127.0.0.1:8890',clock=now,sourceCommit=null
}={}){
 if(sourceCommit!==null&&!/^[a-f0-9]{40}$/.test(sourceCommit))throw Error('VOICE_SOURCE_COMMIT_INVALID');
 if(!/^[a-f0-9]{128}$/.test(passwordHash||'')||!(/^[a-f0-9]{32,128}$/.test(passwordSalt||'')))
  throw Error('VOICE_AUTH_HASH_AND_SALT_REQUIRED');
 const vf=new URL(voiceFabric);
 if(vf.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(vf.hostname)||
  !vf.port||vf.pathname!=='/'||vf.search||vf.hash||vf.username||vf.password)
  throw Error('UNTRUSTED_VOICE_FABRIC');
 const sessions=new Map(),failures=new Map();
 let productionConversationProof=null,c3Proof=null;
 const restoreProductionConversationProof=async()=>{
  try{
   const query=new URL('/api/continuum/search',vf);query.searchParams.set('query','Agent Lee voice telemetry');query.searchParams.set('limit','32');
   const found=await fetchImpl(query,{method:'GET',headers:{origin:vf.origin},signal:AbortSignal.timeout(4000),redirect:'error'});
   if(!found.ok)return null;
   const hits=(await found.json())?.result?.hits;
   if(!Array.isArray(hits))return null;
   for(const hit of hits){
    if(typeof hit?.recordId!=='string'||!/^([a-f0-9]{64})$/i.test(hit.contentSha256||''))continue;
    const contentUrl=new URL('/api/continuum/content',vf);contentUrl.searchParams.set('recordId',hit.recordId);
    const content=await fetchImpl(contentUrl,{method:'GET',headers:{origin:vf.origin},signal:AbortSignal.timeout(4000),redirect:'error'});
    if(!content.ok)continue;
    const raw=await content.text();if(sha(Buffer.from(raw,'utf8'))!==hit.contentSha256)continue;
    let document;try{document=JSON.parse(raw)}catch{continue}
    const t=document?.telemetry;
    if(document?.schema!=='leeway.machine-consciousness.voice-input-telemetry.v1'||
     document?.identity!=='Agent Lee'||t?.type!=='transcript.final'||t?.source!=='LEEWAY_EDGE_RTC'||
     t?.transcriptSource!=='LEEWAY_EDGE_GPU_ASR'||t?.inferenceRoute!=='LEEWAY_EDGE_GPU'||
     t?.inferenceAuthority!=='LEEWAY_EDGE_GPU_ONLY'||t?.storageAuthority!=='LEEWAY_CONTINUUM_ONLY'||
     t?.result!=='RESPONSE_RENDERED'||!/^([a-f0-9]{64})$/i.test(t.audioHash||'')||
     !t.voicePackageId||!t.responseHash||!t.ownerDeviceId||!t.capture?.audioRecordId||
     !/^([a-f0-9]{64})$/i.test(t.capture.audioSha256||'')||!t.capture.captureStartedAt||!t.capture.captureEndedAt)continue;
    return {qualified:true,evidence:'CONTINUUM_READBACK_AUTHENTICATED_GPU_ASR_AGENT_LEE_TURN',recordId:hit.recordId};
   }
  }catch{}
  return null;
 };
 const permittedOrigins=new Set(Object.values(registeredApps));
 const allowOrigin=req=>permittedOrigins.has(req.headers.origin);
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
 async function handler(req,res){
  const headers=allowOrigin(req)?{'access-control-allow-origin':req.headers.origin,
   'access-control-allow-credentials':'true'}:{};
  const deny=(res,code,error)=>json(res,code,{ok:false,error},headers);
  const method=req.method||'GET',route=new URL(req.url||'/', 'http://127.0.0.1').pathname;
  if(route!=='/health' && !Object.values(ROUTES).includes(route))
   return deny(res,404,'NOT_FOUND');
  if(route==='/health'){
   if(!productionConversationProof)productionConversationProof=await restoreProductionConversationProof();
   let upstreamQualified=false,probe='UPSTREAM_UNAVAILABLE';
   try{
    const [carrierReply,bindingReply,telemetryReply]=await Promise.all([
     fetchImpl(new URL('/health',vf),{method:'GET',signal:AbortSignal.timeout(2500),redirect:'error'}),
     fetchImpl(new URL('/voice/binding',vf),{method:'GET',signal:AbortSignal.timeout(2500),redirect:'error'}),
     fetchImpl(new URL('/voice/telemetry',vf),{method:'GET',signal:AbortSignal.timeout(2500),redirect:'error'})
    ]);
    const [carrierState,bindingState,telemetryState]=await Promise.all([carrierReply.json(),bindingReply.json(),telemetryReply.json()]);
    const binding=bindingState?.voiceBinding,telemetry=telemetryState?.gateway;
    upstreamQualified=carrierReply.ok&&carrierState?.identity==='LEEWAY_MACHINE_CONSCIOUSNESS'&&
     carrierState?.voice?.ready===true&&bindingReply.ok&&binding?.authority==='LEEWAY_VOICE_FABRIC'&&
     binding?.agentId==='agent-lee'&&binding?.productionAdmitted===true&&binding?.qualificationOnly===false&&
     telemetryReply.ok&&telemetry?.identity==='Agent Lee'&&telemetry?.inferenceAuthority==='LEEWAY_EDGE_GPU_ONLY'&&
     telemetry?.storageAuthority==='LEEWAY_CONTINUUM_ONLY';
    probe=upstreamQualified?'READ_ONLY_PRODUCTION_CARRIER_BINDING_CHECK_PASS':'PRODUCTION_CARRIER_BINDING_MISMATCH';
   }catch{}
   return json(res,200,{ready:true,authority:'LEEWAY_DEVICE_BRIDGE_VOICE',internetPublished:false,
    upstreamQualified,upstreamQualificationScope:'OWNER_LOCAL_MACHINE_CONSCIOUSNESS_AND_VOICE_BINDING_READINESS',
    upstreamProbe:probe,productionConversationQualified:productionConversationProof?.qualified===true,
    productionConversationEvidence:productionConversationProof?.evidence||'AUTHENTICATED_PRODUCTION_TURN_NOT_YET_OBSERVED',
    c3Qualified:c3Proof?.qualified===true,c3Evidence:c3Proof?.evidence||'LIVE_DUPLEX_VERITAS_AND_RECEIPT_ADMISSION_NOT_YET_OBSERVED',sourceCommit});
  }
  if(!allowOrigin(req))return deny(res,403,'VOICE_ORIGIN_DENIED');
  if(method==='OPTIONS'){
   if(!Object.values(ROUTES).includes(route))return deny(res,404,'NOT_FOUND');
   res.writeHead(204,{...headers,'access-control-allow-methods':'GET, POST, OPTIONS',
    'access-control-allow-headers':'content-type,x-leeway-voice-csrf',
    'access-control-max-age':'300','vary':'Origin'});return res.end();
  }
  if(route===ROUTES.capabilities&&method==='GET')return json(res,200,{
   schema:'leeway.voice.api.v1',status:'AUTHENTICATION_REQUIRED',
   authorization:'OWNER_DEVICE_APPROVAL',
   scope:'voice:turn:readonly',session:ROUTES.session,
    pairStart:ROUTES.pairStart,pairClaim:ROUTES.pairClaim,turn:ROUTES.turn,interrupt:ROUTES.interrupt,
   registeredAppCount:Object.keys(registeredApps).length,
   deviceActionsAllowed:false
  },headers);
  if(pairing&&route===ROUTES.pairStart&&method==='POST'){
   let data;try{data=await boundedBody(req)}catch{return deny(res,400,'PAIRING_REQUEST_INVALID')}
   try{return json(res,202,await pairing.start({appId:data.appId,origin:req.headers.origin}),headers)}
   catch{return deny(res,429,'PAIRING_START_REJECTED')}
  }
  if(pairing&&route===ROUTES.pairClaim&&method==='POST'){
   let data;try{data=await boundedBody(req)}catch{return deny(res,400,'PAIRING_CLAIM_INVALID')}
   const decision=await pairing.check({id:data.id,token:data.token,origin:req.headers.origin});
   if(decision.status==='WAITING_FOR_OWNER_APPROVAL')return json(res,202,{status:decision.status},headers);
   if(decision.status!=='APPROVED')return deny(res,403,'PAIRING_APPROVAL_NOT_ESTABLISHED');
   const token=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex');
   sessions.set(sha(token),{csrf,expires:clock()+sessionDurationMs,appId:decision.appId,scope:decision.scope});
   return json(res,200,{schema:'leeway.voice.session.v1',authenticated:true,
    authority:'LEEWAY_DEVICE_BRIDGE_VOICE',csrfToken:csrf,
    appId:decision.appId,scope:decision.scope},
    {...headers,'set-cookie':'__Host-leeway-voice='+token+'; Path=/; HttpOnly; Secure; SameSite=None; Max-Age='+Math.floor(sessionDurationMs/1000)});
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
    authority:'LEEWAY_DEVICE_BRIDGE_VOICE',csrfToken:session.csrf,
    appId:session.appId||'owner',scope:session.scope||'voice:turn:readonly'},headers);
  }
  if(route===ROUTES.synthesisStatus&&method==='GET'){
   if(!session)return deny(res,401,'VOICE_SESSION_REQUIRED');
   try{
    const [healthReply,bindingReply]=await Promise.all([
     fetchImpl(new URL('/health',vf),{signal:AbortSignal.timeout(5000),redirect:'error'}),
     fetchImpl(new URL('/voice/binding',vf),{signal:AbortSignal.timeout(5000),redirect:'error'})
    ]);
    if(!healthReply.ok||!bindingReply.ok)return deny(res,503,'LEEWAY_VOICE_FABRIC_UNAVAILABLE');
    const [health,bindingDoc]=await Promise.all([healthReply.json(),bindingReply.json()]);
    const binding=bindingDoc?.voiceBinding;
    const ready=health?.identity==='LEEWAY_MACHINE_CONSCIOUSNESS'&&health?.voice?.ready===true&&
     binding?.authority==='LEEWAY_VOICE_FABRIC'&&binding?.agentId==='agent-lee'&&
     binding?.productionAdmitted===true&&binding?.qualificationOnly===false&&
     typeof binding?.voicePackageId==='string';
    if(!ready)return deny(res,503,'LEEWAY_VOICE_BINDING_UNQUALIFIED');
    return json(res,200,{schema:'leeway.voice.synthesis-status.v1',ready:true,
     authority:'LEEWAY_VOICE_FABRIC',agentId:binding.agentId,
     voicePackageId:binding.voicePackageId,provider:binding.provider,voiceId:binding.voiceId,
     selectionRevision:binding.selectionRevision,playbackVerified:false},headers);
   }catch{return deny(res,503,'KOKORO_UNAVAILABLE')}
  }
  if(route===ROUTES.synthesize&&method==='POST'){
   if(!session)return deny(res,401,'VOICE_SESSION_REQUIRED');
   if(session.scope&&session.scope!=='voice:turn:readonly')return deny(res,403,'VOICE_SCOPE_DENIED');
   if(!equal(req.headers['x-leeway-voice-csrf']||'',session.csrf))return deny(res,403,'VOICE_CSRF_DENIED');
   if(!(req.headers['content-type']||'').startsWith('application/json'))return deny(res,415,'JSON_REQUIRED');
   let data;try{data=await boundedBody(req)}catch{return deny(res,400,'VOICE_BODY_INVALID')}
   if(data?.schema!=='leeway.voice.synthesize.v1'||data.agentId!=='agent-lee'||
    !/^kokoro-(?:af|am|bf|bm)_[a-z0-9]+$/.test(data.voicePackageId||'')||typeof data.text!=='string'||!data.text.trim()||data.text.length>1200)
    return deny(res,422,'VOICE_SYNTHESIS_INVALID');
   try{
    const [healthReply,bindingReply]=await Promise.all([
     fetchImpl(new URL('/health',vf),{signal:AbortSignal.timeout(5000),redirect:'error'}),
     fetchImpl(new URL('/voice/binding',vf),{signal:AbortSignal.timeout(5000),redirect:'error'})
    ]);
    if(!healthReply.ok||!bindingReply.ok)return deny(res,503,'LEEWAY_VOICE_FABRIC_UNAVAILABLE');
    const [health,bindingDoc]=await Promise.all([healthReply.json(),bindingReply.json()]);
    const binding=bindingDoc?.voiceBinding;
    if(health?.identity!=='LEEWAY_MACHINE_CONSCIOUSNESS'||health?.voice?.ready!==true||
     binding?.authority!=='LEEWAY_VOICE_FABRIC'||binding?.agentId!==data.agentId||
     binding?.productionAdmitted!==true||binding?.qualificationOnly!==false)
     return deny(res,503,'LEEWAY_VOICE_BINDING_UNQUALIFIED');
    if(binding.voicePackageId!==data.voicePackageId)return deny(res,409,'VOICE_SELECTION_MISMATCH');
    const reply=await fetchImpl(new URL('/render-voice',vf),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:data.text}),signal:AbortSignal.timeout(90000),redirect:'error'});
    if(!reply.ok)return deny(res,503,'LEEWAY_VOICE_RENDER_UNAVAILABLE');
    const size=Number(reply.headers?.get?.('content-length')||0);
    if(size>24000000)return deny(res,502,'LEEWAY_AUDIO_TOO_LARGE');
    const raw=await reply.text();if(raw.length>24000000)return deny(res,502,'LEEWAY_AUDIO_TOO_LARGE');
    const audio=JSON.parse(raw);
    if(audio?.voiceAuthority!=='LEEWAY_VOICE_FABRIC'||audio?.agentId!==data.agentId||
     audio?.voicePackageId!==binding.voicePackageId||audio?.selectionRevision!==binding.selectionRevision||
     audio?.productionAdmitted!==true||audio?.qualificationOnly!==false||audio?.format!=='wav'||
     typeof audio.audioContent!=='string'||audio.audioContent.length>23000000||
     !/^[A-Za-z0-9+/]+={0,2}$/.test(audio.audioContent)||!Number.isFinite(audio.sampleRate))
     return deny(res,502,'LEEWAY_AUDIO_IDENTITY_OR_FORMAT_INVALID');
    return json(res,200,{schema:'leeway.voice.synthesis-result.v1',agentId:audio.agentId,
     authority:audio.voiceAuthority,voicePackageId:audio.voicePackageId,
     selectionRevision:audio.selectionRevision,audioContent:audio.audioContent,
     sampleRate:audio.sampleRate,format:audio.format,state:audio.state,
     playbackVerified:false},headers);
   }catch{return deny(res,503,'KOKORO_SYNTHESIS_UNAVAILABLE')}
  }
  if(route===ROUTES.interrupt&&method==='POST'){
   if(!session)return deny(res,401,'VOICE_SESSION_REQUIRED');
   if(session.scope&&session.scope!=='voice:turn:readonly')return deny(res,403,'VOICE_SCOPE_DENIED');
   if(!equal(req.headers['x-leeway-voice-csrf']||'',session.csrf))return deny(res,403,'VOICE_CSRF_DENIED');
   if(!(req.headers['content-type']||'').startsWith('application/json'))return deny(res,415,'JSON_REQUIRED');
   let data;try{data=await boundedBody(req)}catch{return deny(res,400,'VOICE_BODY_INVALID')}
   if(data?.schema!=='leeway.voice.interrupt.v1'||data.source!=='LEEWAY_EDGE_RTC'||
    data.transcriptSource!=='LEEWAY_EDGE_GPU_ASR'||data.inferenceRoute!=='LEEWAY_EDGE_GPU'||
    data.inferenceAuthority!=='LEEWAY_EDGE_GPU_ONLY'||data.storageAuthority!=='LEEWAY_CONTINUUM_ONLY'||
    typeof data.ownerDeviceId!=='string'||typeof data.segmentId!=='string')return deny(res,422,'VOICE_INTERRUPT_INVALID');
   try{
    const reply=await fetchImpl(new URL('/voice/input',vf),{method:'POST',headers:{origin:vf.origin,'content-type':'application/json'},
     body:JSON.stringify({...data,type:'speech.interrupt'}),signal:AbortSignal.timeout(15000),redirect:'error'});
    if(!reply.ok)return deny(res,503,'LEEWAY_VOICE_INTERRUPT_UNAVAILABLE');
    const result=await reply.json();
    if(result?.state!=='VERIFIED'||result?.type!=='speech.interrupt'||!Number.isInteger(result?.interruptionEpoch))return deny(res,502,'LEEWAY_VOICE_INTERRUPT_UNVERIFIED');
    return json(res,200,{schema:'leeway.voice.interrupt-result.v1',authority:'LEEWAY_MACHINE_CONSCIOUSNESS',
     interruptionEpoch:result.interruptionEpoch,continuum:result.continuum||null,staleOutputGuard:'EPOCH_ADVANCED'},headers);
   }catch{return deny(res,503,'LEEWAY_VOICE_INTERRUPT_UNAVAILABLE')}
  }
  if(route===ROUTES.turn&&method==='POST'){
   if(!session)return deny(res,401,'VOICE_SESSION_REQUIRED');
   if(session.scope&&session.scope!=='voice:turn:readonly')return deny(res,403,'VOICE_SCOPE_DENIED');
   if(!equal(req.headers['x-leeway-voice-csrf']||'',session.csrf))return deny(res,403,'VOICE_CSRF_DENIED');
   if(!(req.headers['content-type']||'').startsWith('application/json'))return deny(res,415,'JSON_REQUIRED');
   let data;try{data=await boundedBody(req)}catch{return deny(res,400,'VOICE_BODY_INVALID')}
   if(data?.schema!=='leeway.voice.turn.v1'||data.final!==true||data.allowDeviceActions!==false||
    data.source!=='LEEWAY_EDGE_RTC'||data.transcriptSource!=='LEEWAY_EDGE_GPU_ASR'||
    data.inferenceRoute!=='LEEWAY_EDGE_GPU'||data.inferenceAuthority!=='LEEWAY_EDGE_GPU_ONLY'||
    data.storageAuthority!=='LEEWAY_CONTINUUM_ONLY'||typeof data.ownerDeviceId!=='string'||
    typeof data.segmentId!=='string'||typeof data.text!=='string'||!data.text.trim()||data.text.length>2500||
    typeof data.audioRecordId!=='string'||!/^([a-f0-9]{64})$/i.test(data.audioSha256||'')||
    !Number.isFinite(Date.parse(data.captureStartedAt))||!Number.isFinite(Date.parse(data.captureEndedAt))||
    Date.parse(data.captureEndedAt)<Date.parse(data.captureStartedAt))
    return deny(res,422,'VOICE_REQUEST_INVALID');
   try{
    const upstreamReply=await fetchImpl(new URL('/voice/input',vf),{method:'POST',
     headers:{origin:vf.origin,'content-type':'application/json'},
     body:JSON.stringify({type:'transcript.final',segmentId:data.segmentId,ownerDeviceId:data.ownerDeviceId,
      requestId:data.requestId,source:data.source,transcriptSource:data.transcriptSource,
      inferenceRoute:data.inferenceRoute,inferenceAuthority:data.inferenceAuthority,
      storageAuthority:data.storageAuthority,transcript:data.text,startedAt:data.startedAt,
      audioRecordId:data.audioRecordId,audioSha256:data.audioSha256,captureStartedAt:data.captureStartedAt,
      captureEndedAt:data.captureEndedAt,playbackTelemetry:data.playbackTelemetry,
      interruptionTelemetry:data.interruptionTelemetry,latencyTelemetry:data.latencyTelemetry,
      deliveryTelemetry:data.deliveryTelemetry}),
     signal:AbortSignal.timeout(90000),redirect:'error'});
    if(!upstreamReply.ok)return deny(res,503,'LEEWAY_VOICE_UPSTREAM_UNAVAILABLE');
    const output=await upstreamReply.json();
    const machine=output?.state==='VERIFIED'&&output?.type==='transcript.final'&&
     output?.response?.personaDelivery?.state==='VERIFIED'&&output?.response?.personaDelivery?.identity==='Agent Lee'&&
     Boolean(output?.continuum?.recordId)&&output?.telemetry?.result==='RESPONSE_RENDERED'&&
     output?.telemetry?.transcriptSource==='LEEWAY_EDGE_GPU_ASR'&&output?.telemetry?.inferenceRoute==='LEEWAY_EDGE_GPU'&&
     output?.telemetry?.capture?.audioRecordId===data.audioRecordId&&
     output?.telemetry?.capture?.audioSha256===data.audioSha256&&
     typeof output?.voice?.voicePackageId==='string'&&typeof output?.voice?.audioContent==='string';
    if(!machine||typeof output.response.text!=='string'||!output.response.text.trim()||output.response.text.length>4000)
     return deny(res,503,'LEEWAY_VOICE_RESPONSE_UNVERIFIED');
    productionConversationProof={qualified:true,evidence:'AUTHENTICATED_AGENT_LEE_TURN_VOICE_FABRIC_AND_CONTINUUM_READBACK',at:clock()};
    return json(res,200,{schema:'leeway.voice.turn-result.v1',
     source:'LEEWAY_MACHINE_CONSCIOUSNESS',identity:'Agent Lee',text:output.response.text,verified:true,
     veritasStatus:'NOT_ASSERTED',status:output.state,requestId:output.requestId||data.requestId||null,
     continuumRecordId:output.continuum.recordId,voice:{authority:'LEEWAY_VOICE_FABRIC',agentId:'agent-lee',
      voicePackageId:output.voice.voicePackageId,audioContent:output.voice.audioContent,
      sampleRate:output.voice.sampleRate,format:output.voice.format,playbackVerified:false},
     evidence:productionConversationProof.evidence},headers);
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
