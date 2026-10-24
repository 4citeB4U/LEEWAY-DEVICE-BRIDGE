/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.DESKTOP
TAG: LEEWAY.LOCAL_RECEIPT_HISTORY_USAGE_READONLY_V1
WHO: LeeWay Industries; WHAT: bounded sanitized Bridge receipt audit reads.
WHEN: 2026-10-24; WHERE: apps/desktop/audit-parity.mjs.
WHY: Desktop Commander parity requires operation history and usage reporting.
HOW: Read-only local JSONL window, no raw arguments/results, no source mutation.
AUTHORITY: CONTROLLER_OBSERVATION_ONLY; never independent Veritas or Learning admission.
LICENSE: MIT
*/
import fs from 'node:fs/promises';
const MAX_BYTES=4*1024*1024,MAX_ROWS=5000;
const SAFE_FIELD=s=>typeof s==='string'&&s.length<=128?s:null;
function summarize(event){
 if(!event||typeof event!=='object'||Array.isArray(event))return null;
 if(!Number.isInteger(event.version)||typeof event.sha256!=='string'||
    !/^[a-f0-9]{64}$/.test(event.sha256))return null;
 if(typeof event.time!=='string'||Number.isNaN(Date.parse(event.time)))return null;
 return {id:SAFE_FIELD(event.id),time:event.time,
  deviceId:SAFE_FIELD(event.deviceId),capability:SAFE_FIELD(event.capability),
  outcome:SAFE_FIELD(event.outcome),error:SAFE_FIELD(event.error),
  controllerReceiptSha256:event.sha256,
  independentVeritasVerified:false};
}
export async function readHistory(receiptPath){
 if(!receiptPath)return {rows:[],observed:0,sourceState:'NO_RECEIPT_FILE_CONFIGURED'};
 let handle;
 try{handle=await fs.open(receiptPath,'r');}
 catch(e){if(e?.code==='ENOENT')return {rows:[],observed:0,sourceState:'RECEIPT_FILE_NOT_YET_CREATED'};throw Error('AUDIT_SOURCE_UNAVAILABLE');}
 try{
  const stat=await handle.stat();
  if(!stat.isFile()||stat.nlink!==1)throw Error('AUDIT_SOURCE_UNTRUSTED');
  const length=Math.min(stat.size,MAX_BYTES),start=stat.size-length;
  const buffer=Buffer.alloc(length);
  if(length){
   const n=await handle.read(buffer,0,length,start);
   if(n.bytesRead!==length)throw Error('AUDIT_READ_INCOMPLETE');
  }
  const source=buffer.toString('utf8'),all=source.split(/\r?\n/);
  if(start>0)all.shift();
  const endsWithNewline=source.endsWith('\n');
  if(!endsWithNewline&&all.length)all.pop();
  const rows=[];
  for(const line of all.slice(-MAX_ROWS)){
   if(!line.trim())continue;
   let value;
   try{value=JSON.parse(line);}catch{throw Error('AUDIT_RECORD_MALFORMED');}
   const rec=summarize(value);
   if(!rec)throw Error('AUDIT_RECORD_SCHEMA_INVALID');
   rows.push(rec);
  }
  return {rows,observed:rows.length,sourceState:stat.size>length?'TRUNCATED_READ_WINDOW':'LOCAL_FILE_READ',
    trailingPartialDiscarded:!endsWithNewline,fullHistoryVerified:false};
 }finally{await handle.close();}
}
export async function recentAudit(receiptPath,args){
 const source=await readHistory(receiptPath);
 const last=source.rows.slice().reverse();
 const results=last.slice(args.offset,args.offset+args.limit);
 return {authority:'CONTROLLER_OBSERVATION_UNVERIFIED',...source,
   rows:undefined,records:results,nextOffset:args.offset+results.length,
   moreAvailable:args.offset+results.length<last.length};
}
export async function usageAudit(receiptPath){
 const source=await readHistory(receiptPath);
 const counts={};
 for(const row of source.rows){
  const key=row.outcome||'UNKNOWN';
  counts[key]=(counts[key]||0)+1;
 }
 return {authority:'CONTROLLER_OBSERVATION_UNVERIFIED',
  observedEvents:source.observed,sampledOutcomeCounts:counts,
  sourceState:source.sourceState,fullHistoryVerified:false,
  excludesRemoteProviderBilling:true};
}
