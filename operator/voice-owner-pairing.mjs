/*
LEEWAY HEADER — DO NOT REMOVE
REGION: DEVICE.BRIDGE.VOICE.OWNER.PAIRING
TAG: SHORT_LIVED_APP_SPECIFIC_OWNER_APPROVAL
WHO: LeeWay Industries; WHAT: explicit passwordless owner-device pairing
WHY: applications must not share a passphrase or receive computer-control authority
WHERE: Device Bridge owner gateway; WHEN: 2026-10-24
HOW: ephemeral challenge, signed approval artifact on owner-controlled disk,
HMAC validation, single-use exchange, per-app scoped browser session
AUTHORITY: owner desktop approval required; never autoapprove.
LICENSE: MIT
*/
import {randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';

const TOKEN=/^[a-f0-9]{64}$/;
const ID=/^[a-f0-9]{32}$/;
const APP=/^[a-z][a-z0-9._-]{2,79}$/;
const MAC=/^[a-f0-9]{64}$/;
const hash=(key,msg)=>createHmac('sha256',key).update(msg).digest('hex');
const same=(a,b)=>{if(!MAC.test(a||'')||!MAC.test(b||''))return false;return timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'))};
const pathFor=(root,id,ext)=>path.join(root,id+'.'+ext);
export function createVoicePairing({
 root,approvalKey,registeredApps={'leeway.voice.studio':'https://4citeb4u.github.io'},clock=()=>Date.now(),ttlMs=120_000,maxPending=4
}={}){
 if(!root||!Buffer.isBuffer(approvalKey)||approvalKey.length<32)
  throw Error('LOCAL_OWNER_PAIRING_KEY_REQUIRED');
 const requests=new Map(),rates=new Map();
 const expiry=()=>clock()+ttlMs;
 async function start({appId,origin}={}){
  if(!APP.test(appId||'')||!Object.hasOwn(registeredApps,appId)||registeredApps[appId]!==origin)
   throw Error('APP_NOT_REGISTERED');
  for(const [k,v] of requests)if(v.expires<=clock())requests.delete(k);
  if(requests.size>=maxPending)throw Error('PAIRING_CAPACITY_LIMIT');
  if([...requests.values()].some(v=>v.appId===appId))throw Error('PAIRING_ALREADY_PENDING');
  const prior=rates.get(appId)||0;
  if(rates.has(appId)&&clock()-prior<30000)throw Error('PAIRING_RATE_LIMIT');
  rates.set(appId,clock());
  const id=randomBytes(16).toString('hex');
  const token=randomBytes(32).toString('hex');
  const displayCode=String(randomBytes(4).readUInt32BE(0)%1000000).padStart(6,'0');
  const request={id,appId,origin,displayCode,scope:'voice:turn:readonly',expires:expiry(),used:false,
   tokenHash:hash(approvalKey,'token:'+token)};
  requests.set(id,request);
  await mkdir(root,{recursive:true});
  await writeFile(pathFor(root,id,'request.json'),JSON.stringify({
   schema:'leeway.voice.owner-approval.v1',id,appId,origin,
   scope:request.scope,expires:request.expires,displayCode:request.displayCode
  }),{flag:'wx',mode:0o600});
  return {schema:'leeway.voice.pair-start.v1',id,token,expires:request.expires,
   displayCode,status:'WAITING_FOR_OWNER_APPROVAL'};
 }
 async function check({id,token,origin}={}){
  if(!ID.test(id||'')||!TOKEN.test(token||''))return {status:'INVALID_REQUEST'};
  const request=requests.get(id);
  if(!request||request.used||request.expires<=clock()||origin!==request.origin||
    !same(hash(approvalKey,'token:'+token),request.tokenHash))return {status:'INVALID_OR_EXPIRED'};
  let approval;try{approval=JSON.parse(await readFile(pathFor(root,id,'approved.json'),'utf8'))}
   catch{return {status:'WAITING_FOR_OWNER_APPROVAL'}};
  const payload=[id,request.appId,request.origin,request.scope,String(request.expires)].join('|');
  if(approval.id!==id||approval.approved!==true||!same(approval.signature,hash(approvalKey,'approve:'+payload)))
   return {status:'INVALID_OWNER_APPROVAL'};
  request.used=true;
  await Promise.allSettled([
   rm(pathFor(root,id,'approved.json'),{force:true}),
   rm(pathFor(root,id,'request.json'),{force:true}),
  ]);
  return {status:'APPROVED',appId:request.appId,origin:request.origin,scope:request.scope};
 }
 return {start,check};
}
export async function signVoiceOwnerApproval({root,approvalKey,id,
 registeredApps={'leeway.voice.studio':'https://4citeb4u.github.io'},clock=()=>Date.now()}={}){
 if(!ID.test(id||'')||!Buffer.isBuffer(approvalKey)||approvalKey.length<32)
  throw Error('LOCAL_OWNER_APPROVAL_INVALID');
 const record=JSON.parse(await readFile(pathFor(root,id,'request.json'),'utf8'));
 if(record.schema!=='leeway.voice.owner-approval.v1'||record.id!==id||
    registeredApps[record.appId]!==record.origin||!APP.test(record.appId)||
    record.scope!=='voice:turn:readonly'||record.expires<=clock())
  throw Error('OWNER_APPROVAL_SCOPE_OR_EXPIRY_INVALID');
 const payload=[record.id,record.appId,record.origin,record.scope,String(record.expires)].join('|');
 await writeFile(pathFor(root,id,'approved.json'),JSON.stringify({
  id,approved:true,signature:hash(approvalKey,'approve:'+payload)
 }),{flag:'wx',mode:0o600});
 return {approved:true,appId:record.appId,scope:record.scope};
}
