import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { DesktopAdapter } from '../../apps/desktop/adapter.mjs';
import { guardedMoveForTest } from '../../apps/desktop/file-parity.mjs';

test('directories and filename search remain workspace bounded', async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'leeway-parity-')); t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const a=new DesktopAdapter(root); await a.execute('device.directories.create',{path:'alpha'}); await fs.writeFile(path.join(root,'alpha','needle.txt'),'x');
 assert.ok((await a.execute('device.directories.list',{path:'.',limit:20})).entries.some(e=>e.name==='alpha'));
 assert.deepEqual((await a.execute('device.search.files',{path:'.',query:'needle',limit:10})).matches,['alpha'+path.sep+'needle.txt']);
 await assert.rejects(a.execute('device.directories.list',{path:'..',limit:20}),/INVALID_PATH|PATH_OUTSIDE_WORKSPACE/);
});

test('process list and identity-bound termination work', async()=>{
 const a=new DesktopAdapter(process.cwd()); const listed=await a.execute('device.process.list',{limit:10}); assert.ok(listed.output.length>0);
 const child=(await import('node:child_process')).spawn(process.execPath,['-e','setInterval(()=>{},1000)']);
 try { await assert.rejects(a.execute('device.process.terminate',{pid:child.pid,expectedCommand:'definitely-wrong'})); }
 finally { child.kill(); }
});

test('long-running jobs expose status and stop through opaque job id', async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'leeway-job-')); t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const a=new DesktopAdapter(root);
 const started=await a.execute('device.job.start',{executable:'node',arguments:['-e','setInterval(()=>{},1000)'],cwd:'.',timeoutMs:10000});
 assert.equal((await a.execute('device.job.status',{jobId:started.jobId})).state,'RUNNING');
 await a.execute('device.job.stop',{jobId:started.jobId});
 await new Promise(r=>setTimeout(r,150));
 assert.ok(['EXITED','STOPPING'].includes((await a.execute('device.job.status',{jobId:started.jobId})).state));
 await assert.rejects(a.execute('device.job.status',{jobId:'00000000-0000-4000-8000-000000000000'}),/UNKNOWN_JOB/);
});

test('file edit uses compare-and-swap and move never replaces an existing target',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'leeway-file-edit-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const a=new DesktopAdapter(root);await fs.mkdir(path.join(root,'left'));await fs.mkdir(path.join(root,'right'));
 await fs.writeFile(path.join(root,'left','source.txt'),'before');
 const first=await a.execute('device.files.hash',{path:'left/source.txt'});
 assert.equal(first.sha256,createHash('sha256').update('before').digest('hex'));
 await a.execute('device.files.edit',{path:'left/source.txt',oldText:'before',newText:'after',expectedReplacements:1,expectedSha256:first.sha256});
 const current=await a.execute('device.files.read',{path:'left/source.txt'});
 assert.equal(current.text,'after');
 await assert.rejects(a.execute('device.files.edit',{path:'left/source.txt',oldText:'before',newText:'stale',expectedReplacements:1,expectedSha256:first.sha256}),/EDIT_SOURCE_CHANGED/);
 const digest=(await a.execute('device.files.hash',{path:'left/source.txt'})).sha256;
 await a.execute('device.files.move',{from:'left/source.txt',to:'right/renamed.txt',expectedSha256:digest});
 assert.equal((await a.execute('device.files.read',{path:'right/renamed.txt'})).text,'after');
 await fs.writeFile(path.join(root,'right','occupied.txt'),'keep');
 await assert.rejects(a.execute('device.files.move',{from:'right/renamed.txt',to:'right/occupied.txt',expectedSha256:digest}),/TARGET_ALREADY_EXISTS/);
 await assert.rejects(a.execute('device.files.move',{from:'right/renamed.txt',to:'../escaped.txt',expectedSha256:digest}),/INVALID_PATH|PATH_OUTSIDE_WORKSPACE/);
});

test('hash and guarded move stream sparse files at the 64 MiB boundary and 720 MiB milestone',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'leeway-large-hash-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const a=new DesktopAdapter(root);
 for(const [name,size] of [['above-64m.bin',64*1024*1024+1],['milestone-720m.bin',720*1024*1024]]){
  const filename=path.join(root,name);const handle=await fs.open(filename,'w');
  try{await handle.truncate(size);}finally{await handle.close();}
  const digest=await a.execute('device.files.hash',{path:name});
  assert.equal(digest.size,size);assert.match(digest.sha256,/^[a-f0-9]{64}$/);
  const moved=await a.execute('device.files.move',{from:name,to:`moved-${name}`,expectedSha256:digest.sha256});
  assert.equal(moved.moved,true);assert.equal(moved.bytes,size);
  assert.equal((await fs.stat(path.join(root,`moved-${name}`))).size,size);
  await assert.rejects(fs.stat(filename),{code:'ENOENT'});
 }
});

test('cross-device move interruption cleans staging and retry commits verified bytes without overwriting',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'leeway-exdev-move-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const adapter=new DesktopAdapter(root);await fs.writeFile(path.join(root,'source.bin'),Buffer.from('recovery payload'));
 const digest=createHash('sha256').update('recovery payload').digest('hex');
 const exdevLink=async(from,to)=>{
  if(path.basename(from)==='source.bin'&&path.basename(to)==='target.bin'){
   const error=Error('synthetic cross-device boundary');error.code='EXDEV';throw error;
  }
  return fs.link(from,to);
 };
 await assert.rejects(guardedMoveForTest(adapter,{from:'source.bin',to:'target.bin',expectedSha256:digest},
  {link:exdevLink,afterChunk:()=>{throw Error('synthetic interruption');}}),/synthetic interruption/);
 assert.equal(await fs.readFile(path.join(root,'source.bin'),'utf8'),'recovery payload');
 await assert.rejects(fs.stat(path.join(root,'target.bin')),{code:'ENOENT'});
 assert.deepEqual((await fs.readdir(root)).sort(),['source.bin']);
 const moved=await guardedMoveForTest(adapter,{from:'source.bin',to:'target.bin',expectedSha256:digest},
  {link:exdevLink});
 assert.equal(moved.crossDevice,true);assert.equal(await fs.readFile(path.join(root,'target.bin'),'utf8'),'recovery payload');
 await assert.rejects(fs.stat(path.join(root,'source.bin')),{code:'ENOENT'});
 await fs.writeFile(path.join(root,'occupied.bin'),'preserve existing');
 await assert.rejects(guardedMoveForTest(adapter,{from:'target.bin',to:'occupied.bin',expectedSha256:digest},
  {link:async(from,to)=>{
   if(path.basename(from)==='target.bin'&&path.basename(to)==='occupied.bin'){
    const error=Error('cross device');error.code='EXDEV';throw error;
   }
   return fs.link(from,to);
  }}),/TARGET_ALREADY_EXISTS/);
 assert.equal(await fs.readFile(path.join(root,'occupied.bin'),'utf8'),'preserve existing');
});

test('cross-device move fails closed before copying when destination capacity is insufficient',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'leeway-space-move-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const adapter=new DesktopAdapter(root);await fs.writeFile(path.join(root,'source.bin'),'keep');
 const digest=createHash('sha256').update('keep').digest('hex');let copyCalled=false;
 const error=Object.assign(Error('synthetic cross-device boundary'),{code:'EXDEV'});
 await assert.rejects(guardedMoveForTest(adapter,{from:'source.bin',to:'target.bin',expectedSha256:digest},
  {link:async()=>{throw error;},statfs:async()=>({bavail:0n,bsize:4096n}),copy:async()=>{copyCalled=true;}}),/INSUFFICIENT_DESTINATION_SPACE/);
 assert.equal(copyCalled,false);assert.equal(await fs.readFile(path.join(root,'source.bin'),'utf8'),'keep');
 await assert.rejects(fs.stat(path.join(root,'target.bin')),{code:'ENOENT'});
});

test('interactive sessions accept bounded stdin and close input explicitly',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'leeway-job-input-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const a=new DesktopAdapter(root);
 const script='process.stdin.setEncoding("utf8");process.stdin.on("data",d=>process.stdout.write("echo:"+d));process.stdin.on("end",()=>process.exit(0));';
 const started=await a.execute('device.session.start',{executable:'node',arguments:['-e',script],cwd:'.',timeoutMs:10000});
 assert.equal(started.state,'RUNNING');
 const input=await a.execute('device.session.input',{sessionId:started.sessionId,text:'hello',appendNewline:true,closeInput:true});
 assert.equal(input.acceptedBytes,6);
 assert.equal(input.inputClosed,true);
 let status;
 for(let attempt=0;attempt<80;attempt++){
  status=await a.execute('device.session.read',{sessionId:started.sessionId,stdoutOffset:0,stderrOffset:0,maxBytes:1024});
  if(status.state==='EXITED')break;
  await new Promise(resolve=>setTimeout(resolve,25));
 }
 assert.match(status.stdout.text,/echo:hello/);
 assert.equal(status.state,'EXITED');
 await assert.rejects(a.execute('device.session.input',{sessionId:started.sessionId,text:'again'}),/SESSION_NOT_WRITABLE/);
});
