/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.DESKTOP
TAG: LEEWAY.DESKTOP_COMMANDER_PARITY_FILE_OPERATIONS_V1
WHO: LeeWay Industries, creator-authorized Device Bridge maintainer.
WHAT: Bounded binary range reads, create-only binary writes, guarded move and exact-block edit.
WHEN: 2026-10-24; WHERE: apps/desktop/file-parity.mjs.
WHY: Implement missing Desktop Commander file operations without bypassing sovereign admission.
HOW: Workspace containment, no symlinks/hardlinks, source digests, no destination overwrite.
AUTHORITY: Adapter only; Bridge's Formula/consent/Veritas PRE admission still mandatory.
LICENSE: MIT
*/
import fs from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import path from 'node:path';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const HEX=/^[a-f0-9]{64}$/;
const BASE64=/^[A-Za-z0-9+/]*={0,2}$/;
const EDIT_BYTES=65536;
const CHUNK_BYTES=262144;
const MAX_MOVE_BYTES=720*1024*1024;
const MAX_HASH_BYTES=64*1024*1024*1024;
async function checkedFile(adapter,filename){
  const target=await adapter.safePath(filename);
  const stat=await fs.lstat(target);
  if(!stat.isFile()||stat.nlink!==1||stat.isSymbolicLink())throw Error('LINK_OR_NONFILE_REJECTED');
  return {target,stat};
}
async function checkedDigest(filename,{maxBytes=MAX_MOVE_BYTES,limitError='FILE_EXCEEDS_MOVE_DIGEST_LIMIT'}={}){
  const handle=await fs.open(filename,'r');
  try{
    const state=await handle.stat();
    if(!state.isFile()||state.nlink!==1||state.size>maxBytes)
      throw Error(limitError);
    const digest=createHash('sha256');
    const chunk=Buffer.alloc(65536);
    let pos=0;
    while(pos<state.size){
      const r=await handle.read(chunk,0,Math.min(chunk.length,state.size-pos),pos);
      if(!r.bytesRead)throw Error('INCOMPLETE_FILE_READ');
      digest.update(chunk.subarray(0,r.bytesRead));pos+=r.bytesRead;
    }
    return {sha256:digest.digest('hex'),size:state.size,ino:state.ino,dev:state.dev};
  }finally{await handle.close();}
}
export async function fileDigest(adapter,args){
  const {target}=await checkedFile(adapter,args.path);
  return checkedDigest(target,{maxBytes:MAX_HASH_BYTES,limitError:'FILE_EXCEEDS_HASH_DIGEST_LIMIT'});
}
export async function binaryRange(adapter,args){
  const {target,stat}=await checkedFile(adapter,args.path);
  const offset=args.offset,limit=args.length;
  if(!Number.isSafeInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>CHUNK_BYTES)
    throw Error('INVALID_BINARY_RANGE');
  const handle=await fs.open(target,'r');
  try{
    const opened=await handle.stat();
    if(!opened.isFile()||opened.nlink!==1||opened.ino!==stat.ino)throw Error('FILE_IDENTITY_CHANGED');
    if(offset>opened.size)throw Error('OFFSET_OUTSIDE_FILE');
    const buf=Buffer.alloc(Math.min(limit,opened.size-offset));
    const {bytesRead}=await handle.read(buf,0,buf.length,offset);
    const bytes=buf.subarray(0,bytesRead);
    return {offset,length:bytes.length,sizeBytes:opened.size,eof:offset+bytes.length>=opened.size,
      base64:bytes.toString('base64'),chunkSha256:hash(bytes)};
  }finally{await handle.close();}
}
export async function binaryCreate(adapter,args){
  if(typeof args.base64!=='string'||args.base64.length>Math.ceil(CHUNK_BYTES/3)*4||
    args.base64.length%4!==0||!BASE64.test(args.base64))throw Error('INVALID_BASE64');
  const bytes=Buffer.from(args.base64,'base64');
  if(bytes.length>CHUNK_BYTES||bytes.toString('base64')!==args.base64)
    throw Error('INVALID_BASE64');
  const digest=hash(bytes);
  if(args.expectedSha256!==digest)throw Error('BINARY_DIGEST_MISMATCH');
  const target=await adapter.safePath(args.path,true);
  await fs.writeFile(target,bytes,{flag:'wx',mode:0o600});
  return {created:true,bytes:bytes.length,sha256:digest};
}
async function streamedCopy(source,target,expected,{afterChunk}={}){
  const input=await fs.open(source,'r');
  let output;
  try{
    const before=await input.stat();
    if(!before.isFile()||before.nlink!==1||before.size!==expected.size||before.ino!==expected.ino||before.dev!==expected.dev)
      throw Error('MOVE_SOURCE_CHANGED');
    output=await fs.open(target,'wx',0o600);
    const digest=createHash('sha256'),chunk=Buffer.alloc(CHUNK_BYTES);
    let offset=0;
    while(offset<before.size){
      const read=await input.read(chunk,0,Math.min(chunk.length,before.size-offset),offset);
      if(read.bytesRead<1)throw Error('MOVE_COPY_INCOMPLETE_READ');
      const bytes=chunk.subarray(0,read.bytesRead);digest.update(bytes);
      let written=0;
      while(written<bytes.length){
        const result=await output.write(bytes,written,bytes.length-written,offset+written);
        if(result.bytesWritten<1)throw Error('MOVE_COPY_INCOMPLETE_WRITE');
        written+=result.bytesWritten;
      }
      offset+=read.bytesRead;
      if(afterChunk)await afterChunk(offset);
    }
    await output.sync();
    const after=await input.stat();
    const copied=await output.stat();
    const sha256=digest.digest('hex');
    if(after.ino!==before.ino||after.dev!==before.dev||after.size!==before.size||
       copied.size!==before.size||copied.nlink!==1||sha256!==expected.sha256)
      throw Error('MOVE_COPY_VERIFICATION_FAILED');
    return {sha256,size:copied.size,ino:copied.ino,dev:copied.dev};
  }finally{
    if(output)await output.close();
    await input.close();
  }
}

async function guardedMoveWithOperations(adapter,args,operations={}){
  if(!HEX.test(args.expectedSha256))throw Error('SOURCE_DIGEST_REQUIRED');
  const {target:source,stat:initial}=await checkedFile(adapter,args.from);
  const destination=await adapter.safePath(args.to,true);
  if(source===destination)throw Error('SOURCE_EQUALS_DESTINATION');
  const pre=await checkedDigest(source);
  if(pre.sha256!==args.expectedSha256||pre.ino!==initial.ino)throw Error('SOURCE_CHANGED');
  // link() is exclusive: unlike rename(), an existing destination is never replaced.
  // Both paths are in one checked workspace. A failed subsequent unlink retains source.
  try{await (operations.link??fs.link)(source,destination);}
  catch(error){
    if(error?.code==='EEXIST')throw Error('TARGET_ALREADY_EXISTS');
    if(error?.code!=='EXDEV')throw error;
    return copyAndCommitMove(adapter,{args,source,destination,pre,operations});
  }
  try{
    const linked=await fs.lstat(destination);
    const current=await fs.lstat(source);
    if(linked.ino!==pre.ino||current.ino!==pre.ino||
       !linked.isFile()||current.nlink!==2||linked.nlink!==2)throw Error('MOVE_IDENTITY_CHANGED');
    const now=await fs.open(source,'r');
    try{
      const opened=await now.stat();
      if(opened.ino!==pre.ino||opened.size!==pre.size)throw Error('MOVE_SOURCE_CHANGED');
    }finally{await now.close();}
    // The content may be concurrently modified by local actors; the authority
    // boundary is an OS workspace, not a guarantee against local hostile writers.
    await fs.unlink(source);
    return {moved:true,from:args.from,to:args.to,sha256:pre.sha256,bytes:pre.size};
  }catch(error){
    // Preserve the original source and its newly created destination for reconciliation.
    throw Error('MOVE_RECONCILIATION_REQUIRED');
  }
}

async function copyAndCommitMove(adapter,{args,source,destination,pre,operations}){
  const directory=path.dirname(destination),temp=path.join(directory,`.${path.basename(destination)}.leeway-move-${randomUUID()}.partial`);
  let destinationCommitted=false;
  try{
    const capacity=await (operations.statfs??fs.statfs)(directory,{bigint:true});
    if(typeof capacity.bavail!=='bigint'||typeof capacity.bsize!=='bigint'||capacity.bavail*capacity.bsize<BigInt(pre.size))
      throw Error('INSUFFICIENT_DESTINATION_SPACE');
    const copied=operations.copy
      ?await operations.copy(source,temp,pre)
      :await streamedCopy(source,temp,pre,{afterChunk:operations.afterChunk});
    if(copied.sha256!==pre.sha256||copied.size!==pre.size)throw Error('MOVE_COPY_VERIFICATION_FAILED');
    const tempCheck=await checkedDigest(temp);
    if(tempCheck.sha256!==pre.sha256||tempCheck.size!==pre.size||tempCheck.ino!==copied.ino)
      throw Error('MOVE_COPY_VERIFICATION_FAILED');
    const sourceCheck=await checkedDigest(source);
    if(sourceCheck.sha256!==pre.sha256||sourceCheck.ino!==pre.ino)throw Error('MOVE_SOURCE_CHANGED');
    try{await (operations.link??fs.link)(temp,destination);}
    catch(error){if(error?.code==='EEXIST')throw Error('TARGET_ALREADY_EXISTS');throw error;}
    destinationCommitted=true;
    const committed=await fs.lstat(destination),staged=await fs.lstat(temp);
    if(committed.ino!==staged.ino||committed.dev!==staged.dev||committed.size!==pre.size||
       committed.nlink!==2||staged.nlink!==2)throw Error('MOVE_RECONCILIATION_REQUIRED');
    await fs.unlink(temp);
    const finalSource=await checkedDigest(source);
    if(finalSource.sha256!==pre.sha256||finalSource.ino!==pre.ino)throw Error('MOVE_RECONCILIATION_REQUIRED');
    await fs.unlink(source);
    return {moved:true,from:args.from,to:args.to,sha256:pre.sha256,bytes:pre.size,crossDevice:true};
  }catch(error){
    if(destinationCommitted&&error?.message!=='MOVE_RECONCILIATION_REQUIRED')throw Error('MOVE_RECONCILIATION_REQUIRED');
    throw error;
  }finally{
    // A handled interruption removes staging data; the verified source remains retryable.
    await fs.rm(temp,{force:true}).catch(()=>{});
  }
}

export async function guardedMove(adapter,args){
  return guardedMoveWithOperations(adapter,args);
}

// Test-only seam for exercising EXDEV, insufficient-capacity, and interruption
// paths without widening the governed MCP request schema.
export async function guardedMoveForTest(adapter,args,operations){
  return guardedMoveWithOperations(adapter,args,operations);
}
export async function exactEdit(adapter,args){
  if(!HEX.test(args.expectedSha256)||!args.oldText||
     !Number.isInteger(args.expectedReplacements)||args.expectedReplacements<1||args.expectedReplacements>1000)
    throw Error('EDIT_PRECONDITION_REQUIRED');
  const {target,stat}=await checkedFile(adapter,args.path);
  if(stat.size>EDIT_BYTES)throw Error('FILE_TOO_LARGE');
  const original=await fs.readFile(target);
  if(original.length!==stat.size||hash(original)!==args.expectedSha256)throw Error('EDIT_SOURCE_CHANGED');
  const decoded=new TextDecoder('utf-8',{fatal:true}).decode(original);
  if(decoded.includes('\0'))throw Error('TEXT_FILE_REQUIRED');
  const count=decoded.split(args.oldText).length-1;
  if(count!==args.expectedReplacements)throw Error('EDIT_MATCH_COUNT_MISMATCH');
  const next=decoded.replaceAll(args.oldText,args.newText);
  const output=Buffer.from(next,'utf8');
  if(output.length>EDIT_BYTES)throw Error('FILE_TOO_LARGE');
  if(output.equals(original))throw Error('EDIT_NO_CHANGE');
  const tmp=path.join(path.dirname(target),'.leeway-edit-'+randomUUID()+'.tmp');
  await fs.writeFile(tmp,output,{flag:'wx',mode:0o600});
  try{
    const current=await fs.lstat(target);
    if(current.ino!==stat.ino||current.nlink!==1||current.size!==stat.size||
      hash(await fs.readFile(target))!==args.expectedSha256)throw Error('EDIT_SOURCE_CHANGED');
    await fs.rename(tmp,target);
    return {edited:true,replacements:count,bytes:output.length,sha256:hash(output)};
  }finally{await fs.rm(tmp,{force:true}).catch(()=>{});}
}
