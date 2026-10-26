import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { fileDigest, binaryRange, binaryCreate, exactEdit } from './file-parity.mjs';
import { DesktopSessions } from './process-sessions.mjs';
import { DesktopSearchSessions } from './search-sessions.mjs';
import { appendBinary, directoryPage } from './transfer-parity.mjs';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);
const MAX_MOVE_BYTES = 64 * 1024 * 1024;
async function hashFile(file,{maxBytes=Number.POSITIVE_INFINITY}={}) {
  const hash=createHash('sha256');let bytes=0;
  for await(const chunk of createReadStream(file)){
    bytes+=chunk.length;if(bytes>maxBytes)throw new Error('FILE_TOO_LARGE');hash.update(chunk);
  }
  return {sha256:hash.digest('hex'),bytes};
}
async function moveNoReplace(source,target,expectedSha256) {
  const before=await fs.stat(source);
  if(!before.isFile()||before.nlink>1||before.size>MAX_MOVE_BYTES)throw new Error('FILE_EXCEEDS_MOVE_LIMIT');
  let handle;
  try { handle=await fs.open(target,'wx',0o600); }
  catch(error) { if(error.code==='EEXIST')throw new Error('TARGET_ALREADY_EXISTS');throw error; }
  const hash=createHash('sha256');
  let open=true,bytes=0;
  try {
    for await(const chunk of createReadStream(source)){
      hash.update(chunk);bytes+=chunk.length;let offset=0;
      while(offset<chunk.length){const written=await handle.write(chunk,offset,chunk.length-offset,null);if(!written.bytesWritten)throw new Error('FILE_MOVE_WRITE_FAILED');offset+=written.bytesWritten;}
    }
    const copiedSha256=hash.digest('hex');
    if(copiedSha256!==expectedSha256)throw new Error('FILE_VERSION_MISMATCH');
    await handle.sync();await handle.close();open=false;
    const [after,sourceReadback,destinationReadback]=await Promise.all([fs.stat(source),hashFile(source),hashFile(target)]);
    if(after.dev!==before.dev||after.ino!==before.ino||after.size!==before.size||after.mtimeMs!==before.mtimeMs||
      sourceReadback.sha256!==copiedSha256||destinationReadback.sha256!==copiedSha256||destinationReadback.bytes!==bytes)
      throw new Error('FILE_CHANGED_DURING_MOVE');
    await fs.unlink(source);
    return {sha256:copiedSha256,bytes};
  } catch(error) {
    if(open)await handle.close().catch(()=>{});
    await fs.rm(target,{force:true}).catch(()=>{});
    throw error;
  }
}

// Bounded workspace files and explicitly allowlisted process execution. Never invokes a shell.
export class DesktopAdapter {
  constructor(root) { this.root = path.resolve(root); this.jobs = new Map(); this.sessions = new DesktopSessions(this); this.searchSessions = new DesktopSearchSessions(this); }
  async discover() { await fs.access(this.root); return ['device.health','device.info','device.files.read','device.files.info','device.files.read_multiple','device.files.write','device.files.replace','device.files.hash','device.files.read_binary','device.files.write_binary','device.files.append_binary','device.files.move','device.files.edit','device.directories.list','device.directories.page','device.directories.create','device.search.files','device.search.content','device.search.start','device.search.next','device.search.stop','device.search.list','device.process.list','device.process.terminate','device.process.execute','device.job.start','device.job.write','device.job.status','device.job.stop','device.session.start','device.session.read','device.session.input','device.session.stop','device.session.list']; }
  async safePath(relative, writing = false) {
    if (path.isAbsolute(relative) || relative.includes(':') || relative.includes('\0')) throw new Error('PATH_OUTSIDE_WORKSPACE');
    const parts = relative.replaceAll('\\', '/').split('/');
    if (parts.some(p => !p || p === '.' || p === '..' || /[. ]$/.test(p) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(p))) throw new Error('INVALID_PATH');
    const root = await fs.realpath(this.root);
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      current = path.join(current, parts[i]);
      try {
        const stat = await fs.lstat(current);
        if (stat.isSymbolicLink()) throw new Error('LINK_NOT_ALLOWED');
        if (i < parts.length - 1 && !stat.isDirectory()) throw new Error('INVALID_PATH');
        if (i === parts.length - 1 && !stat.isFile()) throw new Error('REGULAR_FILE_REQUIRED');
        if (i === parts.length - 1 && stat.nlink > 1) throw new Error('LINK_NOT_ALLOWED');
      } catch (e) { if (!(writing && i === parts.length - 1 && e.code === 'ENOENT')) throw e; }
    }
    return current;
  }
  async safeDirectory(relative) {
    if (path.isAbsolute(relative) || relative.includes(':') || relative.includes('\0')) throw new Error('PATH_OUTSIDE_WORKSPACE');
    const parts = relative === '.' ? [] : relative.replaceAll('\\', '/').split('/');
    if (parts.some(p => !p || p === '.' || p === '..' || /[. ]$/.test(p) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(p))) throw new Error('INVALID_PATH');
    const root = await fs.realpath(this.root);
    let current = root;
    for (const part of parts) {
      current = path.join(current, part);
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink()) throw new Error('LINK_NOT_ALLOWED');
      if (!stat.isDirectory()) throw new Error('WORKING_DIRECTORY_REQUIRED');
    }
    const resolved = await fs.realpath(current);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) throw new Error('PATH_OUTSIDE_WORKSPACE');
    return resolved;
  }
  async executeProcess(args) {
    const cwd = await this.safeDirectory(args.cwd);
    const executable = process.platform === 'win32' && args.executable === 'powershell' ? 'powershell.exe'
      : process.platform === 'win32' && args.executable === 'npm' ? 'npm.cmd'
      : process.platform === 'win32' && args.executable === 'git' ? 'git.exe'
      : process.platform === 'win32' && args.executable === 'node' ? 'node.exe'
      : args.executable;
    return await new Promise((resolve, reject) => {
      const child = spawn(executable, args.arguments, { cwd, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      const limit = 65536;
      let stdout = Buffer.alloc(0), stderr = Buffer.alloc(0), settled = false;
      const append = (prior, chunk) => {
        const next = Buffer.concat([prior, chunk]);
        if (next.length > limit) throw new Error('PROCESS_OUTPUT_TOO_LARGE');
        return next;
      };
      let pendingError = null;
      const fail = error => {
        if (settled || pendingError) return;
        pendingError = error;
        child.kill();
      };
      child.stdout.on('data', chunk => { try { stdout = append(stdout, chunk); } catch (e) { fail(e); } });
      child.stderr.on('data', chunk => { try { stderr = append(stderr, chunk); } catch (e) { fail(e); } });
      child.on('error', () => fail(new Error('PROCESS_SPAWN_FAILED')));
      const timer = setTimeout(() => fail(new Error('PROCESS_TIMEOUT')), args.timeoutMs);
      child.on('close', (code, signal) => {
        clearTimeout(timer);
        if (settled) return;
        settled = true;
        if (pendingError) { reject(pendingError); return; }
        resolve({ exitCode: Number.isInteger(code) ? code : null, signal: signal || null, stdout: stdout.toString('utf8'), stderr: stderr.toString('utf8') });
      });
    });
  }
  executableName(name) {
    return process.platform === 'win32' && name === 'powershell' ? 'powershell.exe'
      : process.platform === 'win32' && name === 'npm' ? 'npm.cmd'
      : process.platform === 'win32' && name === 'git' ? 'git.exe'
      : process.platform === 'win32' && name === 'node' ? 'node.exe' : name;
  }
  async listDirectory(args) {
    const dir = await this.safeDirectory(args.path);
    const entries = await fs.readdir(dir,{withFileTypes:true});
    return { entries: entries.slice(0,args.limit).map(e=>({name:e.name,type:e.isDirectory()?'directory':e.isFile()?'file':'other'})), truncated: entries.length>args.limit };
  }
  async createDirectory(args) {
    const normalized=args.path.replaceAll('\\','/');
    const i=normalized.lastIndexOf('/');
    const parent=i<0?'.':normalized.slice(0,i);
    const name=i<0?normalized:normalized.slice(i+1);
    if(!name||name==='.'||name==='..') throw new Error('INVALID_PATH');
    const base=await this.safeDirectory(parent||'.');
    const target=path.join(base,name);
    await fs.mkdir(target,{recursive:false});
    return {created:true};
  }
  async searchFiles(args) {
    const root=await this.safeDirectory(args.path), q=args.query.toLowerCase(), matches=[];
    const walk=async dir=>{for(const e of await fs.readdir(dir,{withFileTypes:true})){if(matches.length>=args.limit)return;const full=path.join(dir,e.name);if(e.isSymbolicLink?.())continue;if(e.name.toLowerCase().includes(q))matches.push(path.relative(root,full)||e.name);if(e.isDirectory())await walk(full);}};
    await walk(root); return {matches,truncated:matches.length>=args.limit};
  }
  async searchContent(args) {
    const base = await this.safeDirectory(args.path);
    const query = args.query.toLowerCase();
    const matches = [];
    let filesScanned = 0, bytesScanned = 0, truncated = false;
    const visit = async (directory, depth) => {
      if (truncated) return;
      const entries = await fs.readdir(directory, { withFileTypes: true });
      for (const entry of entries) {
        if (matches.length >= args.limit || filesScanned >= 128 || bytesScanned >= 2097152) { truncated = true; return; }
        const full = path.join(directory, entry.name);
        const stat = await fs.lstat(full).catch(() => null);
        if (!stat || stat.isSymbolicLink()) continue;
        if (stat.isDirectory()) {
          if (depth < 6) await visit(full, depth + 1);
          else truncated = true;
          continue;
        }
        if (!stat.isFile() || stat.nlink !== 1 || stat.size > 65536) continue;
        filesScanned++;
        bytesScanned += stat.size;
        if (bytesScanned > 2097152) { truncated = true; return; }
        const contents = await fs.readFile(full, 'utf8');
        if (contents.includes('\0')) continue;
        const lines = contents.split(/\r?\n/);
        for (let n = 0; n < lines.length; n++) {
          if (matches.length >= args.limit) { truncated = true; return; }
          if (lines[n].toLowerCase().includes(query)) {
            matches.push({ path: path.relative(base, full), line: n + 1, excerpt: lines[n].slice(0, 240) });
          }
        }
      }
    };
    await visit(base, 0);
    return { matches, filesScanned, bytesScanned, truncated };
  }
  async listProcesses(args) {
    const command=process.platform==='win32'?'powershell.exe':'ps';
    const argv=process.platform==='win32'?['-NoProfile','-Command','Get-Process | Select-Object -First '+args.limit+' Id,ProcessName | ConvertTo-Json -Compress']:['-eo','pid=,comm='];
    const {stdout}=await execFileAsync(command,argv,{windowsHide:true,maxBuffer:65536});
    return {platform:process.platform,output:stdout.slice(0,65536)};
  }
  async terminateProcess(args) {
    const pid=args.pid;
    if(pid===process.pid) throw new Error('SELF_TERMINATION_BLOCKED');
    if(process.platform==='win32'){const {stdout}=await execFileAsync('powershell.exe',['-NoProfile','-Command',`$p=Get-Process -Id ${pid} -ErrorAction Stop; if($p.ProcessName -ne '${args.expectedCommand.replaceAll("'","''")}'){exit 9}; Stop-Process -Id ${pid} -Force`],{windowsHide:true});return {terminated:true,pid,output:stdout};}
    const {stdout}=await execFileAsync('ps',['-p',String(pid),'-o','comm=']); if(path.basename(stdout.trim())!==args.expectedCommand)throw new Error('PROCESS_IDENTITY_MISMATCH'); process.kill(pid,'SIGTERM'); return {terminated:true,pid};
  }
  async startJob(args) {
    const cwd=await this.safeDirectory(args.cwd), id=randomUUID(), child=spawn(this.executableName(args.executable),args.arguments,{cwd,shell:false,windowsHide:true,stdio:['pipe','pipe','pipe']});
    const job={id,pid:child.pid,state:'RUNNING',stdout:'',stderr:'',exitCode:null,startedAt:new Date().toISOString(),timer:null,child,stdin:child.stdin,stdinEnded:false};
    child.stdin.on('error',()=>{job.stdinEnded=true;});
    const add=(k,b)=>{job[k]=(job[k]+b.toString('utf8')).slice(-65536);};
    child.stdout.on('data',b=>add('stdout',b)); child.stderr.on('data',b=>add('stderr',b));
    child.on('error',()=>{job.state='FAILED';job.spawnError='PROCESS_SPAWN_FAILED';clearTimeout(job.timer);job.child=null;job.stdin=null;});
    child.on('close',code=>{if(job.state!=='FAILED'&&job.state!=='TIMED_OUT')job.state='EXITED';job.exitCode=code;clearTimeout(job.timer);job.child=null;job.stdin=null;});
    job.timer=setTimeout(()=>{if(job.child){job.state='TIMED_OUT';job.child.kill();}},args.timeoutMs);
    this.jobs.set(id,job); return {jobId:id,pid:job.pid,state:job.state};
  }
  async writeJob(args) {
    const job=this.jobs.get(args.jobId);if(!job)throw new Error('UNKNOWN_JOB');
    if(!job.child||!job.stdin||job.stdin.destroyed||job.stdinEnded)throw new Error('JOB_INPUT_CLOSED');
    const bytes=Buffer.byteLength(args.text,'utf8');
    if(job.stdin.writableLength+bytes>65536)throw new Error('JOB_INPUT_BACKPRESSURE');
    await new Promise((resolve,reject)=>job.stdin.write(args.text,error=>error?reject(new Error('JOB_INPUT_FAILED')):resolve()));
    if(args.closeInput){job.stdinEnded=true;job.stdin.end();}
    return {accepted:true,bytes,inputClosed:job.stdinEnded};
  }
  jobView(id) { const j=this.jobs.get(id); if(!j)throw new Error('UNKNOWN_JOB'); return {jobId:j.id,pid:j.pid,state:j.state,exitCode:j.exitCode,startedAt:j.startedAt,stdout:j.stdout,stderr:j.stderr,inputOpen:Boolean(j.stdin&&!j.stdinEnded&&!j.stdin.destroyed),...(j.spawnError?{error:j.spawnError}:{})}; }
  async execute(capability, args) {
    if (capability === 'device.health') return { ok: true, platform: process.platform, adapter: 'bounded-workspace', uiControl: false };
    if (capability === 'device.info') return { platform: process.platform, architecture: os.arch(), node: process.version, uiControl: false };
    if (capability === 'device.directories.list') return this.listDirectory(args);
    if (capability === 'device.directories.page') return directoryPage(this, args);
    if (capability === 'device.directories.create') return this.createDirectory(args);
    if (capability === 'device.search.files') return this.searchFiles(args);
    if (capability === 'device.search.content') return this.searchContent(args);
    if (capability === 'device.search.start') return this.searchSessions.start(args);
    if (capability === 'device.search.next') return this.searchSessions.next(args);
    if (capability === 'device.search.stop') return this.searchSessions.stop(args);
    if (capability === 'device.search.list') return this.searchSessions.list(args);
    if (capability === 'device.process.list') return this.listProcesses(args);
    if (capability === 'device.process.terminate') return this.terminateProcess(args);
    if (capability === 'device.job.start') return this.startJob(args);
    if (capability === 'device.job.write') return this.writeJob(args);
    if (capability === 'device.job.status') return this.jobView(args.jobId);
    if (capability === 'device.job.stop') { const j=this.jobs.get(args.jobId); if(!j)throw new Error('UNKNOWN_JOB'); if(j.child){j.state='STOPPING';j.child.kill();} return this.jobView(args.jobId); }
    if (capability === 'device.session.start') return this.sessions.start(args);
    if (capability === 'device.session.read') return this.sessions.read(args);
    if (capability === 'device.session.input') return this.sessions.input(args);
    if (capability === 'device.session.stop') return this.sessions.stop(args);
    if (capability === 'device.session.list') return this.sessions.list(args);
    if (capability === 'device.process.execute') return this.executeProcess(args);
    if (capability === 'device.files.info') {
      const filename = await this.safePath(args.path);
      const stat = await fs.stat(filename);
      return { path: args.path, type: 'file', sizeBytes: stat.size, modifiedUtc: stat.mtime.toISOString(), createdUtc: stat.birthtime.toISOString(), mode: stat.mode & 0o777 };
    }
    if (capability === 'device.files.read_multiple') {
      if (!Array.isArray(args.paths) || args.paths.length < 1 || args.paths.length > 8) {
        throw new Error('INVALID_BATCH_SIZE');
      }
      const files = [];
      let totalBytes = 0;
      for (const filePath of args.paths) {
        const result = await this.execute('device.files.read', { path: filePath });
        totalBytes += Buffer.byteLength(result.text, 'utf8');
        if (totalBytes > 131072) throw new Error('BATCH_OUTPUT_TOO_LARGE');
        files.push({ path: filePath, text: result.text });
      }
      return { files, totalBytes };
    }
    if (capability === 'device.files.hash') return fileDigest(this, args);
    if (capability === 'device.files.read_binary') return binaryRange(this, args);
    if (capability === 'device.files.write_binary') return binaryCreate(this, args);
    if (capability === 'device.files.append_binary') return appendBinary(this, args);
    if (capability === 'device.files.edit') return exactEdit(this, args);
    if (capability === 'device.files.read') {
      const handle = await fs.open(await this.safePath(args.path), 'r');
      try {
        const stat = await handle.stat();
        if (!stat.isFile() || stat.size > 65536) throw new Error('FILE_TOO_LARGE');
        const buffer = Buffer.alloc(65537);
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
        if (bytesRead > 65536) throw new Error('FILE_TOO_LARGE');
        const text=buffer.subarray(0, bytesRead);
        return { text:text.toString('utf8'),sha256:createHash('sha256').update(text).digest('hex') };
      } finally { await handle.close(); }
    }
    if (capability === 'device.files.write') {
      if (Buffer.byteLength(args.text, 'utf8') > 65536) throw new Error('FILE_TOO_LARGE');
      // Create-only prevents replacement of user files. Owner can rename/delete externally.
      await fs.writeFile(await this.safePath(args.path, true), args.text, { flag: 'wx', mode: 0o600 });
      return { created: true, bytes: Buffer.byteLength(args.text, 'utf8') };
    }
    if (capability === 'device.files.replace') {
      const target=await this.safePath(args.path), before=await fs.lstat(target);
      const existing=await hashFile(target,{maxBytes:65536});
      if(existing.sha256!==args.expectedSha256)throw new Error('FILE_VERSION_MISMATCH');
      if(Buffer.byteLength(args.text,'utf8')>65536)throw new Error('FILE_TOO_LARGE');
      const previous=await fs.readFile(target), temporary=path.join(path.dirname(target),`.leeway-${randomUUID()}.tmp`);
      try {
        await fs.writeFile(temporary,args.text,{flag:'wx',mode:0o600});
        const current=await fs.lstat(target);
        if(current.dev!==before.dev||current.ino!==before.ino||current.size!==before.size||current.mtimeMs!==before.mtimeMs)
          throw new Error('FILE_CHANGED_DURING_REPLACE');
        if((await hashFile(target,{maxBytes:65536})).sha256!==args.expectedSha256)throw new Error('FILE_CHANGED_DURING_REPLACE');
        try { await fs.rename(temporary,target); }
        catch(error) {
          if(!['EPERM','EACCES'].includes(error.code))throw error;
          const handle=await fs.open(target,'r+');let changed=false;
          try {
            const latest=await handle.stat();
            if(latest.dev!==before.dev||latest.ino!==before.ino||latest.size!==before.size||latest.mtimeMs!==before.mtimeMs)
              throw new Error('FILE_CHANGED_DURING_REPLACE');
            if((await hashFile(target,{maxBytes:65536})).sha256!==args.expectedSha256)throw new Error('FILE_CHANGED_DURING_REPLACE');
            await handle.truncate(0);changed=true;await handle.writeFile(args.text,'utf8');await handle.sync();
          } catch(writeError) {
            if(changed){try{await handle.truncate(0);await handle.writeFile(previous);await handle.sync();}
              catch{throw new Error('FILE_REPLACE_RECOVERY_FAILED');}}
            throw writeError;
          } finally { await handle.close(); }
        }
      } finally { await fs.rm(temporary,{force:true}); }
      return {replaced:true,bytes:Buffer.byteLength(args.text,'utf8'),sha256:createHash('sha256').update(args.text,'utf8').digest('hex')};
    }
    if (capability === 'device.files.move') {
      if(args.from===args.to)throw new Error('SAME_SOURCE_AND_TARGET');
      const source=await this.safePath(args.from), target=await this.safePath(args.to,true);
      const moved=await moveNoReplace(source,target,args.expectedSha256);
      return {moved:true,from:args.from,to:args.to,...moved};
    }
    throw new Error('CAPABILITY_UNAVAILABLE');
  }
}
