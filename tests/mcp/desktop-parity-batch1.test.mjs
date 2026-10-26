import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { DesktopAdapter } from '../../apps/desktop/adapter.mjs';

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
 const first=await a.execute('device.files.read',{path:'left/source.txt'});
 assert.equal(first.sha256,createHash('sha256').update('before').digest('hex'));
 await a.execute('device.files.replace',{path:'left/source.txt',text:'after',expectedSha256:first.sha256});
 const current=await a.execute('device.files.read',{path:'left/source.txt'});
 assert.equal(current.text,'after');
 await assert.rejects(a.execute('device.files.replace',{path:'left/source.txt',text:'stale',expectedSha256:first.sha256}),/FILE_VERSION_MISMATCH/);
 const digest=createHash('sha256').update('after').digest('hex');
 await a.execute('device.files.move',{from:'left/source.txt',to:'right/renamed.txt',expectedSha256:digest});
 assert.equal((await a.execute('device.files.read',{path:'right/renamed.txt'})).text,'after');
 await fs.writeFile(path.join(root,'right','occupied.txt'),'keep');
 await assert.rejects(a.execute('device.files.move',{from:'right/renamed.txt',to:'right/occupied.txt',expectedSha256:digest}),/TARGET_ALREADY_EXISTS/);
 await assert.rejects(a.execute('device.files.move',{from:'right/renamed.txt',to:'../escaped.txt',expectedSha256:digest}),/INVALID_PATH|PATH_OUTSIDE_WORKSPACE/);
});

test('long-running jobs accept bounded interactive stdin and close input explicitly',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'leeway-job-input-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const a=new DesktopAdapter(root);
 const script='process.stdin.setEncoding("utf8");process.stdin.on("data",d=>process.stdout.write("echo:"+d));process.stdin.on("end",()=>process.exit(0));';
 const started=await a.execute('device.job.start',{executable:'node',arguments:['-e',script],cwd:'.',timeoutMs:10000});
 assert.equal((await a.execute('device.job.status',{jobId:started.jobId})).inputOpen,true);
 const input=await a.execute('device.job.write',{jobId:started.jobId,text:'hello\n',closeInput:true});
 assert.deepEqual(input,{accepted:true,bytes:6,inputClosed:true});
 let status;
 for(let attempt=0;attempt<80;attempt++){
  status=await a.execute('device.job.status',{jobId:started.jobId});
  if(status.state==='EXITED')break;
  await new Promise(resolve=>setTimeout(resolve,25));
 }
 assert.match(status.stdout,/echo:hello/);
 assert.equal(status.inputOpen,false);
 assert.equal(status.state,'EXITED');
 await assert.rejects(a.execute('device.job.write',{jobId:started.jobId,text:'again'}),/JOB_INPUT_CLOSED/);
});
