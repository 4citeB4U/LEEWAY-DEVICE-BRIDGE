/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.DESKTOP
TAG: LEEWAY.BINARY_APPEND_RECONNECT_AND_DIRECTORY_SNAPSHOT_V1
WHO: LeeWay Industries; WHAT: digest-bound binary append and snapshot-paged listings.
WHEN: 2026-10-24; WHERE: apps/desktop/transfer-parity.mjs.
WHY: Enable larger resumable file transfers and reliable directory pagination.
HOW: Exclusive append lock, exact prior offset/hash, on-disk fsync and byte hash;
     stable directory-page snapshots that reject intervening directory changes.
AUTHORITY: Adapters only. No Formula, owner consent or Veritas bypass.
LICENSE: MIT
*/
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const MAX_CHUNK=262144,MAX_FILE=128*1024*1024;
const sha=data=>createHash('sha256').update(data).digest('hex');
const goodBase64=s=>typeof s==='string'&&s.length%4===0&&s.length<=349528&&/^[A-Za-z0-9+/]*={0,2}$/.test(s);
async function digestFile(handle,limit){
  const stat=await handle.stat();
  if(!stat.isFile()||stat.nlink!==1||stat.size>limit)throw Error('TRANSFER_SOURCE_UNTRUSTED');
  const h=createHash('sha256'),buf=Buffer.alloc(65536);
  let offset=0;
  while(offset<stat.size){
    const r=await handle.read(buf,0,Math.min(buf.length,stat.size-offset),offset);
    if(r.bytesRead<=0)throw Error('TRANSFER_INCOMPLETE_READ');
    h.update(buf.subarray(0,r.bytesRead));offset+=r.bytesRead;
  }
  return {size:stat.size,sha256:h.digest('hex'),ino:stat.ino};
}
export async function appendBinary(adapter,args){
  if(!goodBase64(args.base64))throw Error('INVALID_BASE64');
  const bytes=Buffer.from(args.base64,'base64');
  if(bytes.length<1||bytes.length>MAX_CHUNK||bytes.toString('base64')!==args.base64)
    throw Error('INVALID_BINARY_CHUNK');
  if(sha(bytes)!==args.expectedChunkSha256)throw Error('TRANSFER_CHUNK_HASH_MISMATCH');
  const target=await adapter.safePath(args.path);
  const lockPath=target+'.leeway-append.lock';
  // A persistent exclusive lock refuses unsafe automatic recovery after crash.
  // The owner must inspect file hash before clearing an orphan lock.
  const lock=await fs.open(lockPath,'wx',0o600);
  try{
    const fd=await fs.open(target,'r+');
    try{
      const pre=await digestFile(fd,MAX_FILE);
      if(pre.size!==args.expectedOffset||pre.sha256!==args.expectedSha256)
        throw Error('TRANSFER_OFFSET_OR_HASH_MISMATCH');
      if(pre.size+bytes.length>MAX_FILE)throw Error('TRANSFER_SIZE_LIMIT');
      const repeat=await adapter.safePath(args.path);
      if(repeat!==target)throw Error('TRANSFER_SOURCE_CHANGED');
      let written=0;
      while(written<bytes.length){
        const n=await fd.write(bytes,written,bytes.length-written,pre.size+written);
        if(n.bytesWritten<1)throw Error('TRANSFER_WRITE_UNCERTAIN');
        written+=n.bytesWritten;
      }
      await fd.sync();
      const after=await digestFile(fd,MAX_FILE);
      if(after.size!==pre.size+bytes.length)throw Error('TRANSFER_POST_LENGTH_MISMATCH');
      return {appended:true,previousBytes:pre.size,sizeBytes:after.size,
        appendedBytes:bytes.length,sha256:after.sha256,expectedNextOffset:after.size,
        persistentResume:true};
    }finally{await fd.close();}
  }finally{
    await lock.close();
    await fs.unlink(lockPath).catch(()=>{});
  }
}
export async function directoryPage(adapter,args){
  const dir=await adapter.safeDirectory(args.path);
  const entries=await fs.readdir(dir,{withFileTypes:true});
  if(entries.length>50000)throw Error('DIRECTORY_ENTRY_LIMIT');
  const names=entries.map(e=>e.name).sort();
  const snapshotSha256=sha(Buffer.from(JSON.stringify(names),'utf8'));
  if(args.expectedSnapshotSha256&&args.expectedSnapshotSha256!==snapshotSha256)
    throw Error('DIRECTORY_SNAPSHOT_CHANGED');
  if(args.offset>entries.length)throw Error('DIRECTORY_PAGE_OUT_OF_RANGE');
  const map=new Map(entries.map(e=>[e.name,e]));
  const selected=names.slice(args.offset,args.offset+args.limit);
  return {path:args.path,entries:selected.map(name=>{
      const e=map.get(name);
      return {name,type:e.isDirectory()?'directory':e.isFile()?'file':e.isSymbolicLink()?'symlink':'other'};
    }),total:names.length,snapshotSha256,nextOffset:args.offset+selected.length,
    moreAvailable:args.offset+selected.length<names.length};
}
