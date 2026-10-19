import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn, execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);

// Bounded workspace files and explicitly allowlisted process execution. Never invokes a shell.
export class DesktopAdapter {
  constructor(root) { this.root = path.resolve(root); this.jobs = new Map(); }
  async discover() { await fs.access(this.root); return ['device.screen.info','device.screen.capture','device.ui.click','device.ui.type','device.ui.key','device.health','device.info','device.files.read','device.files.write','device.directories.list','device.directories.create','device.search.files','device.process.list','device.process.terminate','device.process.execute','device.job.start','device.job.status','device.job.stop']; }
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
    const cwd=await this.safeDirectory(args.cwd), id=randomUUID(), child=spawn(this.executableName(args.executable),args.arguments,{cwd,shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});
    const job={id,pid:child.pid,state:'RUNNING',stdout:'',stderr:'',exitCode:null,startedAt:new Date().toISOString(),timer:null,child};
    const add=(k,b)=>{job[k]=(job[k]+b.toString('utf8')).slice(-65536);};
    child.stdout.on('data',b=>add('stdout',b)); child.stderr.on('data',b=>add('stderr',b));
    child.on('close',code=>{job.state='EXITED';job.exitCode=code;clearTimeout(job.timer);job.child=null;});
    job.timer=setTimeout(()=>{if(job.child){job.state='TIMED_OUT';job.child.kill();}},args.timeoutMs);
    this.jobs.set(id,job); return {jobId:id,pid:job.pid,state:job.state};
  }
  jobView(id) { const j=this.jobs.get(id); if(!j)throw new Error('UNKNOWN_JOB'); return {jobId:j.id,pid:j.pid,state:j.state,exitCode:j.exitCode,startedAt:j.startedAt,stdout:j.stdout,stderr:j.stderr}; }
  async windowsAutomation(script, args = []) {
    if (process.platform !== 'win32') throw new Error('WINDOWS_UI_UNAVAILABLE');
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    const { stdout } = await execFileAsync('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',encoded,...args],{windowsHide:true,maxBuffer:8*1024*1024});
    return stdout;
  }
  async screenInfo() {
    const out=await this.windowsAutomation("Add-Type -AssemblyName System.Windows.Forms; $b=[System.Windows.Forms.SystemInformation]::VirtualScreen; [pscustomobject]@{x=$b.X;y=$b.Y;width=$b.Width;height=$b.Height}|ConvertTo-Json -Compress");
    return JSON.parse(out);
  }
  async captureScreen() {
    if(process.platform!=='win32')throw new Error('WINDOWS_UI_UNAVAILABLE');
    const ps="Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $b=[System.Windows.Forms.SystemInformation]::VirtualScreen; $bmp=New-Object System.Drawing.Bitmap($b.Width,$b.Height); $g=[System.Drawing.Graphics]::FromImage($bmp); try{$g.CopyFromScreen($b.X,$b.Y,0,0,$bmp.Size);$ms=New-Object IO.MemoryStream;$bmp.Save($ms,[Drawing.Imaging.ImageFormat]::Png);[Convert]::ToBase64String($ms.ToArray())}finally{$g.Dispose();$bmp.Dispose();if($ms){$ms.Dispose()}}";
    const base64=(await this.windowsAutomation(ps)).trim(); if(base64.length>8*1024*1024)throw new Error('SCREENSHOT_TOO_LARGE'); return {mimeType:'image/png',base64};
  }
  async uiClick(args) {
    const info=await this.screenInfo(); if(args.x<info.x||args.y<info.y||args.x>=info.x+info.width||args.y>=info.y+info.height)throw new Error('UI_COORDINATE_OUTSIDE_SCREEN');
    const flag=args.button==='right'?'0x0008,0x0010':'0x0002,0x0004';
    const ps="Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class LWUI { [DllImport(\"user32.dll\")] public static extern bool SetCursorPos(int X,int Y); [DllImport(\"user32.dll\")] public static extern void mouse_event(uint f,uint dx,uint dy,uint data,UIntPtr extra); }'; [LWUI]::SetCursorPos("+args.x+","+args.y+")|Out-Null; [LWUI]::mouse_event("+flag.split(',')[0]+",0,0,0,[UIntPtr]::Zero); [LWUI]::mouse_event("+flag.split(',')[1]+",0,0,0,[UIntPtr]::Zero)";
    await this.windowsAutomation(ps); return {clicked:true,x:args.x,y:args.y,button:args.button};
  }
  async uiType(args) {
    const payload=Buffer.from(args.text,'utf8').toString('base64');
    const ps="$t=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('"+payload+"')); Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(($t -replace '([+^%~(){}\\[\\]])','{$1}'))";
    await this.windowsAutomation(ps); return {typed:true,characters:args.text.length};
  }
  async uiKey(args) {
    const map={ENTER:'{ENTER}',ESC:'{ESC}',TAB:'{TAB}',UP:'{UP}',DOWN:'{DOWN}',LEFT:'{LEFT}',RIGHT:'{RIGHT}',HOME:'{HOME}',END:'{END}',PAGEUP:'{PGUP}',PAGEDOWN:'{PGDN}',BACKSPACE:'{BACKSPACE}',DELETE:'{DELETE}'};
    await this.windowsAutomation("Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('"+map[args.key]+"')"); return {sent:true,key:args.key};
  }
  async execute(capability, args) {
    if (capability === 'device.screen.info') return this.screenInfo();
    if (capability === 'device.screen.capture') return this.captureScreen();
    if (capability === 'device.ui.click') return this.uiClick(args);
    if (capability === 'device.ui.type') return this.uiType(args);
    if (capability === 'device.ui.key') return this.uiKey(args);
    if (capability === 'device.health') return { ok: true, platform: process.platform, adapter: 'bounded-workspace', uiControl: false };
    if (capability === 'device.info') return { platform: process.platform, architecture: os.arch(), node: process.version, uiControl: false };
    if (capability === 'device.directories.list') return this.listDirectory(args);
    if (capability === 'device.directories.create') return this.createDirectory(args);
    if (capability === 'device.search.files') return this.searchFiles(args);
    if (capability === 'device.process.list') return this.listProcesses(args);
    if (capability === 'device.process.terminate') return this.terminateProcess(args);
    if (capability === 'device.job.start') return this.startJob(args);
    if (capability === 'device.job.status') return this.jobView(args.jobId);
    if (capability === 'device.job.stop') { const j=this.jobs.get(args.jobId); if(!j)throw new Error('UNKNOWN_JOB'); if(j.child){j.state='STOPPING';j.child.kill();} return this.jobView(args.jobId); }
    if (capability === 'device.process.execute') return this.executeProcess(args);
    if (capability === 'device.files.read') {
      const handle = await fs.open(await this.safePath(args.path), 'r');
      try {
        const stat = await handle.stat();
        if (!stat.isFile() || stat.size > 65536) throw new Error('FILE_TOO_LARGE');
        const buffer = Buffer.alloc(65537);
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
        if (bytesRead > 65536) throw new Error('FILE_TOO_LARGE');
        return { text: buffer.subarray(0, bytesRead).toString('utf8') };
      } finally { await handle.close(); }
    }
    if (capability === 'device.files.write') {
      if (Buffer.byteLength(args.text, 'utf8') > 65536) throw new Error('FILE_TOO_LARGE');
      // Create-only prevents replacement of user files. Owner can rename/delete externally.
      await fs.writeFile(await this.safePath(args.path, true), args.text, { flag: 'wx', mode: 0o600 });
      return { created: true, bytes: Buffer.byteLength(args.text, 'utf8') };
    }
    throw new Error('CAPABILITY_UNAVAILABLE');
  }
}
