import { nativeCommandPlan } from './command-policy.mjs';
/*
LEEWAY HEADER ΓÇö DO NOT REMOVE
REGION: LEEWAY.DEVICES.DESKTOP_COMMANDER
TAG: LEEWAY.RUNTIME.HOST_COMMANDER.NATIVE_V0
5WH:
WHAT = Native Windows executor for the canonical leeway-host-commander capability contract
WHY = Remove Desktop Commander as a single point of failure while preserving governed abstract host capabilities
WHO = LeeWay Device Bridge / Tool Gateway
WHERE = providers/desktop-commander/native-host/server.mjs
WHEN = 2026-10-04
HOW = Loopback HTTP -> normalized LeeWay verbs -> authority tier -> deterministic PowerShell/native execution -> evidence envelope
AGENTS: ASSESS EXECUTE VERIFY
LICENSE: MIT
*/
import http from 'node:http';import {spawn} from 'node:child_process';import fs from 'node:fs';import crypto from 'node:crypto';import path from 'node:path';
const PORT=Number(process.env.LEEWAY_HOST_COMMANDER_PORT||8891);
const ROOT=process.env.LEEWAY_HOST_COMMANDER_ROOT||process.env.LEEWAY_ROOT;
if(!ROOT||!path.isAbsolute(ROOT)||!fs.existsSync(ROOT)||!fs.statSync(ROOT).isDirectory())throw new Error('COMMANDER_ROOT_BINDING_REQUIRED');
const BODY=process.env.LEEWAY_BODY_ID||'UNBOUND_BODY';
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const APPS={notepad:'notepad.exe',calculator:'calc.exe',chrome:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',edge:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',vscode:'code.cmd'};
const CAPABILITIES={
 'leeway.files.list':'READ','leeway.files.read':'READ','leeway.files.hash':'READ','leeway.process.inspect':'READ','leeway.service.inspect':'READ','leeway.display.inspect':'READ','leeway.host.info':'READ',
 'leeway.app.open':'OPERATE','leeway.terminal.execute':'OPERATE'
};
function insideRoot(p){
 if(typeof p!=='string'||!p)return false;
 try{const root=fs.realpathSync(ROOT),full=fs.realpathSync(p),relative=path.relative(root,full);return relative===''||(!path.isAbsolute(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep))}catch{return false}
}
function run(cmd,args=[],cwd){return new Promise((resolve,reject)=>{const p=spawn(cmd,args,{cwd,windowsHide:true});let out='',err='';p.stdout.on('data',d=>{out+=d});p.stderr.on('data',d=>{err+=d});p.on('error',reject);p.on('close',code=>{if(code===0)resolve(out.trim());else reject(new Error(err.trim()||('exit '+code)))})})}
async function execute(cap,args={}){
 if(!CAPABILITIES[cap])throw new Error('CAPABILITY_NOT_ALLOWED');
 const pre={at:new Date().toISOString(),capability:cap,authorityTier:CAPABILITIES[cap],root:ROOT,bodyId:BODY,deviceAuthority:'4citeB4U/LEEWAY-DEVICE-BRIDGE'};
 let result;
 if(cap==='leeway.files.list'){const p=args.path||ROOT;if(!insideRoot(p))throw new Error('PATH_OUTSIDE_LEEWAY_ROOT');result=fs.readdirSync(p,{withFileTypes:true}).map(e=>({name:e.name,type:e.isDirectory()?'directory':'file'}))}
 else if(cap==='leeway.files.read'){const p=args.path;if(!p||!insideRoot(p))throw new Error('PATH_OUTSIDE_LEEWAY_ROOT');result=fs.readFileSync(p,'utf8').slice(0,Number(args.maxChars||20000))}
 else if(cap==='leeway.files.hash'){const p=args.path;if(!p||!insideRoot(p))throw new Error('PATH_OUTSIDE_LEEWAY_ROOT');result={algorithm:'SHA-256',hash:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}}
 else if(cap==='leeway.process.inspect')result=await run('powershell.exe',['-NoProfile','-Command','Get-Process | Select -First 200 Id,ProcessName,CPU | ConvertTo-Json -Compress']);
 else if(cap==='leeway.service.inspect')result=await run('powershell.exe',['-NoProfile','-Command','Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Select LocalAddress,LocalPort,OwningProcess | ConvertTo-Json -Compress']);
 else if(cap==='leeway.display.inspect')result=JSON.parse(await run('powershell.exe',['-NoProfile','-Command','Get-CimInstance Win32_DesktopMonitor | Select Name,ScreenWidth,ScreenHeight,Status | ConvertTo-Json -Compress']));
 else if(cap==='leeway.host.info')result=JSON.parse(await run('powershell.exe',['-NoProfile','-Command','$o=Get-CimInstance Win32_OperatingSystem;$cpu=(Get-CimInstance Win32_Processor|Measure-Object LoadPercentage -Average).Average;$mem=[math]::Round((1-($o.FreePhysicalMemory/$o.TotalVisibleMemorySize))*100,2);$d=Get-CimInstance Win32_LogicalDisk -Filter "DeviceID=\'E:\'";$disk=if($d.Size){[math]::Round((1-($d.FreeSpace/$d.Size))*100,2)}else{$null};$gpu=@(Get-CimInstance Win32_VideoController|Select Name,AdapterRAM,DriverVersion);[pscustomobject]@{ComputerName=$env:COMPUTERNAME;OS=$o.Caption;Version=$o.Version;FreeMemoryKB=$o.FreePhysicalMemory;CpuLoadPct=$cpu;MemoryUsedPct=$mem;DiskUsedPct=$disk;AlertCount=0;Gpu=$gpu}|ConvertTo-Json -Compress -Depth 5']));
 else if(cap==='leeway.app.open'){const id=String(args.app||'').toLowerCase();if(!APPS[id])throw new Error('APP_NOT_ALLOWLISTED');spawn(APPS[id],[],{detached:true,stdio:'ignore'}).unref();result={opened:id,executable:APPS[id]}}
 else if(cap==='leeway.terminal.execute'){if(args.profile!=='governed-readonly')throw new Error('TERMINAL_PROFILE_NOT_ALLOWED');const plan=nativeCommandPlan({command:args.command,root:ROOT,cwd:args.cwd||ROOT,humanConfirmed:args.humanConfirmed});result=await run(plan.exe,plan.args,plan.cwd)}
 const envelope={provider:'LEEWAY_NATIVE_HOST_COMMANDER',ownership:'LEEWAY_NATIVE',executionIdentity:'host-commander-v0',preState:pre,result,postState:{at:new Date().toISOString()},verified:'ADAPTER_EXECUTED'};envelope.receiptHash=hash(envelope);return envelope
}
const json=(res,c,v)=>{res.writeHead(c,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(v))};
http.createServer(async(req,res)=>{try{if(req.headers.origin||![('127.0.0.1:'+PORT),('localhost:'+PORT)].includes(req.headers.host))return json(res,403,{error:'LOCAL_NATIVE_CALLER_REQUIRED'});const u=new URL(req.url,'http://127.0.0.1');if(req.method==='GET'&&u.pathname==='/health')return json(res,200,{status:'PASS',provider:'LEEWAY_NATIVE_HOST_COMMANDER',root:ROOT,bodyId:BODY,deviceAuthority:'4citeB4U/LEEWAY-DEVICE-BRIDGE',transport:'LOOPBACK_ONLY',remotePairingQualified:false,capabilities:CAPABILITIES});if(req.method==='POST'&&u.pathname==='/execute'){if(!String(req.headers['content-type']||'').startsWith('application/json'))return json(res,415,{error:'JSON_REQUIRED'});let b='',size=0;for await(const c of req){size+=c.length;if(size>65536)return json(res,413,{error:'REQUEST_TOO_LARGE'});b+=c;}const d=JSON.parse(b||'{}');return json(res,200,await execute(d.capability,d.args||{}))}return json(res,404,{error:'not found'})}catch(e){return json(res,400,{error:e.message})}}).listen(PORT,'127.0.0.1',()=>console.log('LeeWay Host Commander http://127.0.0.1:'+PORT));