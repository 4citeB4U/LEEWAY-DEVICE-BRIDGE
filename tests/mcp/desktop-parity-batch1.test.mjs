import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
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
