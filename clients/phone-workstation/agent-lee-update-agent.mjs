/*
REGION: LEEWAY.PHONE.UPDATE
TAG: LEEWAY.AGENT_LEE.UPDATE_AGENT
WHAT: Loopback-only updater that fetches CI artifacts, verifies source hash, LeeWay-signs the next required APK, and serves it privately.
WHY: One update path without manual Downloads or exposing the signing key.
WHO: LeeWay Industries / Creator-authorized phone runtime.
WHERE: Android Termux; canonical source in LEEWAY-DEVICE-BRIDGE.
WHEN: Persistent phone runtime; prepares only when UPDATE AGENT LEE requests it.
HOW: HTTPS metadata -> version gate -> private temp download -> SHA-256 -> apksigner -> signed SHA-256 -> loopback manifest/package.
*/
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';

const HOME=process.env.HOME;
const PORT=Number(process.env.LEEWAY_UPDATE_PORT||8791);
const ROOT=path.join(HOME,'.leeway','update-agent');
const CACHE=path.join(ROOT,'cache');
const SIGN=path.join(HOME,'.leeway','signing','android');
const KEYSTORE=path.join(SIGN,'leeway-android-signing.jks');
const PASS=path.join(SIGN,'.keystore-pass');
const SHIM=path.join(HOME,'.leeway','java-android16-shim');
const APKSIGNER=process.env.PREFIX?path.join(process.env.PREFIX,'bin','apksigner'):'apksigner';

const sources=[
  {
    id:'pocket-agent',
    packageName:'industries.leeway.pocket',
    env:'LEEWAY_POCKET_METADATA_URL',
    defaultUrl:'https://4citeb4u.github.io/LeeWay-Pocket-Agent/download/LeeWay-Pocket-Agent-latest.json',
    codeParam:'pocketCode'
  },
  {
    id:'device-bridge',
    packageName:'industries.leeway.devicebridge',
    env:'LEEWAY_BRIDGE_METADATA_URL',
    defaultUrl:'https://4citeb4u.github.io/LEEWAY-DEVICE-BRIDGE/docs/downloads/leeway-device-bridge-android-latest.json',
    codeParam:'bridgeCode'
  }
];

fs.mkdirSync(CACHE,{recursive:true,mode:0o700});
const shaFile=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const safeJson=(res,status,value)=>{
  const body=JSON.stringify(value,null,2);
  res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','content-length':Buffer.byteLength(body)});
  res.end(body);
};
const fetchJson=async url=>{
  const r=await fetch(url,{headers:{'cache-control':'no-cache','user-agent':'LeeWay-Agent-Update/1.0'}});
  if(!r.ok)throw Error('METADATA_HTTP_'+r.status);
  return {body:await r.json(),finalUrl:r.url};
};
const resolveUrl=(base,raw)=>new URL(raw,base).toString();
const validSha=v=>/^[a-f0-9]{64}$/.test(String(v||'').toLowerCase());

async function download(url,target){
  const r=await fetch(url,{headers:{'cache-control':'no-cache','user-agent':'LeeWay-Agent-Update/1.0'}});
  if(!r.ok)throw Error('APK_HTTP_'+r.status);
  const tmp=target+'.part';
  const file=fs.createWriteStream(tmp,{mode:0o600});
  for await(const chunk of r.body)file.write(chunk);
  await new Promise((resolve,reject)=>{file.end(resolve);file.on('error',reject)});
  fs.renameSync(tmp,target);
}
function signApk(unsigned,signed){
  if(!fs.existsSync(KEYSTORE)||!fs.existsSync(PASS))throw Error('SIGNING_AUTHORITY_MISSING');
  fs.rmSync(signed,{force:true});fs.rmSync(signed+'.idsig',{force:true});
  const args=['sign','--ks',KEYSTORE,'--ks-key-alias','leeway-android','--ks-pass','file:'+PASS,'--out',signed,unsigned];
  const env={...process.env,LD_LIBRARY_PATH:SHIM};
  const sign=spawnSync(APKSIGNER,args,{env,encoding:'utf8'});
  if(sign.status!==0)throw Error('APK_SIGN_FAILED');
  const verify=spawnSync(APKSIGNER,['verify','--verbose','--print-certs',signed],{env,encoding:'utf8'});
  if(verify.status!==0)throw Error('APK_VERIFY_FAILED');
  const cert=(verify.stdout+verify.stderr).match(/Signer #1 certificate SHA-256 digest:\s*([a-f0-9]+)/i)?.[1]?.toLowerCase();
  if(!cert)throw Error('SIGNER_CERT_UNAVAILABLE');
  return cert;
}
async function prepareOne(source,currentCode){
  const metadataUrl=process.env[source.env]||source.defaultUrl;
  const {body:meta,finalUrl}=await fetchJson(metadataUrl);
  const versionCode=Number(meta.versionCode);
  const versionName=String(meta.versionName||'').trim();
  const sourceSha=String(meta.sha256||'').trim().toLowerCase();
  if(!Number.isInteger(versionCode)||versionCode<1||!versionName||!validSha(sourceSha))throw Error('METADATA_INVALID');
  if(versionCode<=currentCode)return {state:'CURRENT_OR_NEWER',componentId:source.id,versionCode,versionName};
  const raw=String(meta.downloadUrl||'').trim();
  const downloadUrl=resolveUrl(finalUrl,raw);
  if(!downloadUrl.startsWith('https://'))throw Error('APK_HTTPS_REQUIRED');
  const unsigned=path.join(CACHE,source.id+'-'+sourceSha+'.unsigned.apk');
  const signed=path.join(CACHE,source.id+'-'+sourceSha+'.signed.apk');
  if(!fs.existsSync(signed)){
    await download(downloadUrl,unsigned);
    const actual=shaFile(unsigned);
    if(actual!==sourceSha){fs.rmSync(unsigned,{force:true});throw Error('SOURCE_SHA256_MISMATCH')}
    const signerCertSha256=signApk(unsigned,signed);
    fs.rmSync(unsigned,{force:true});
    fs.writeFileSync(signed+'.json',JSON.stringify({sourceSha256:sourceSha,signerCertSha256},null,2),{mode:0o600});
  }
  const side=JSON.parse(fs.readFileSync(signed+'.json','utf8'));
  return {
    state:'UPDATE_AVAILABLE',
    componentId:source.id,
    packageName:source.packageName,
    versionName,
    versionCode,
    sourceSha256:sourceSha,
    sha256:shaFile(signed),
    signerCertSha256:side.signerCertSha256,
    sizeBytes:fs.statSync(signed).size,
    sourceCommit:String(meta.sourceCommit||''),
    sourceRunId:String(meta.sourceRunId||''),
    packagePath:signed,
    packageUrl:'http://127.0.0.1:'+PORT+'/package/'+source.id+'.apk'
  };
}
async function prepare(url){
  const current={
    'pocket-agent':Number(url.searchParams.get('pocketCode')||0),
    'device-bridge':Number(url.searchParams.get('bridgeCode')||0)
  };
  const errors=[];
  for(const source of sources){
    try{
      const item=await prepareOne(source,current[source.id]||0);
      if(item.state==='UPDATE_AVAILABLE')return {components:[item],errors};
    }catch(error){errors.push({componentId:source.id,error:String(error.message||error)})}
  }
  return {components:[],errors};
}
let lastPrepared=null;
const runtimeState=async()=>{
  const [formula,cognition]=await Promise.all([
    fetch('http://127.0.0.1:4001/runtime/formula/v1/health').then(r=>r.json()).catch(()=>null),
    fetch('http://127.0.0.1:8789/api/state').then(r=>r.json()).catch(()=>null)
  ]);
  return {
    formula:formula?.status==='LEEWAY_FORMULA_V1_PASS'?'VERIFIED':'UNVERIFIED',
    cognition:cognition?.continuityVerified===true?'ACTIVE_OBSERVE_ONLY':'UNVERIFIED',
    cognitionAuthority:cognition?.authority?.mode||'UNVERIFIED',
    llm:'STANDBY_PENDING_COGNITION_PROMOTION',
    voiceOne:'REQUIRES_PHYSICAL_PLAYBACK_GATE'
  };
};

const server=http.createServer(async(req,res)=>{
  if(req.socket.remoteAddress!=='127.0.0.1' && req.socket.remoteAddress!=='::ffff:127.0.0.1' && req.socket.remoteAddress!=='::1'){
    return safeJson(res,403,{ok:false,error:'LOOPBACK_ONLY'});
  }
  try{
    const url=new URL(req.url,'http://127.0.0.1:'+PORT);
    if(req.method==='GET'&&url.pathname==='/health'){
      return safeJson(res,200,{ok:true,state:'LEEWAY_UPDATE_AGENT_READY',bind:'127.0.0.1',port:PORT});
    }
    if(req.method==='GET'&&url.pathname==='/prepare'){
      const prepared=await prepare(url);
      const components=prepared.components.map(({packagePath,...x})=>x);
      lastPrepared=prepared.components[0]||null;
      return safeJson(res,200,{ok:true,generatedAt:new Date().toISOString(),components,errors:prepared.errors,runtime:await runtimeState()});
    }
    const m=url.pathname.match(/^\/package\/(pocket-agent|device-bridge)\.apk$/);
    if(req.method==='GET'&&m){
      if(!lastPrepared||lastPrepared.componentId!==m[1]||!fs.existsSync(lastPrepared.packagePath))return safeJson(res,404,{ok:false,error:'PACKAGE_NOT_PREPARED'});
      const stat=fs.statSync(lastPrepared.packagePath);
      res.writeHead(200,{'content-type':'application/vnd.android.package-archive','content-length':stat.size,'cache-control':'no-store'});
      fs.createReadStream(lastPrepared.packagePath).pipe(res);
      return;
    }
    safeJson(res,404,{ok:false,error:'NOT_FOUND'});
  }catch(error){safeJson(res,500,{ok:false,error:String(error.message||error)})}
});
server.listen(PORT,'127.0.0.1',()=>process.stdout.write(JSON.stringify({state:'LEEWAY_UPDATE_AGENT_READY',port:PORT})+'\n'));
