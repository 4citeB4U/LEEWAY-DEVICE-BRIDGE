/*
LEEWAY_HEADER - DO NOT REMOVE
REGION: LEEWAY.DEVICES.DESKTOP_COMMANDER
TAG: LEEWAY.RUNTIME.HOST_COMMANDER.NATIVE_V0
5WH: WHAT=Portability repair of the existing bound native Commander, retaining provider/HTTP identity;
WHY=Startup and host diagnostics must not require a drive, workspace path, named device or external Commander;
WHO=LeeWay Device Bridge / Tool Gateway; WHERE=providers/desktop-commander/native-host/server.mjs;
WHEN=2026-10-06; HOW=Optional runtime resource binding -> existing command policy -> native APIs -> evidence.
AUTHORIZED_ROLES: Target-local trusted controller; remote pairing is not provided by loopback HTTP.
LICENSE: MIT
*/
import http from 'node:http';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import path from 'node:path';
import {nativeCommandPlan,confinedPath} from './command-policy.mjs';

const PORT=Number(process.env.LEEWAY_HOST_COMMANDER_PORT??0);
if(!Number.isInteger(PORT)||PORT<0||PORT>65535)throw Error('COMMANDER_PORT_BINDING_INVALID');
const rawRoot=process.env.LEEWAY_HOST_COMMANDER_ROOT||process.env.LEEWAY_ROOT;
let ROOT=null;
if(rawRoot){
 if(!path.isAbsolute(rawRoot)||!fs.existsSync(rawRoot)||!fs.statSync(rawRoot).isDirectory())throw Error('COMMANDER_ROOT_BINDING_INVALID');
 ROOT=fs.realpathSync(rawRoot);
}
const BODY=process.env.LEEWAY_BODY_ID||null;
const MAX_BYTES=64*1024*1024,MAX_OUTPUT=4*1024*1024;
const TIMEOUT=Number(process.env.LEEWAY_HOST_COMMANDER_TIMEOUT_MS??30000);
if(!Number.isInteger(TIMEOUT)||TIMEOUT<100||TIMEOUT>120000)throw Error('COMMANDER_TIMEOUT_BINDING_INVALID');
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const APPS=Object.create(null);
if(process.env.LEEWAY_HOST_COMMANDER_APPS_JSON){
 const values=JSON.parse(process.env.LEEWAY_HOST_COMMANDER_APPS_JSON);
 if(!values||typeof values!=='object'||Array.isArray(values))throw Error('COMMANDER_APP_BINDING_INVALID');
 for(const [id,value] of Object.entries(values)){
  const v=typeof value==='string'?{executable:value,args:[]}:value;
  if(!/^[a-z][a-z0-9.-]{0,63}$/.test(id)||!v||typeof v.executable!=='string'||!v.executable||/[\x00-\x1f]/.test(v.executable)||!Array.isArray(v.args??[])||(v.args??[]).length>64||(v.args??[]).some(a=>typeof a!=='string'||a.length>8192||a.includes('\0')))throw Error('COMMANDER_APP_BINDING_INVALID');
  APPS[id]=Object.freeze({executable:v.executable,args:Object.freeze(v.args??[])});
 }
}
const CAPABILITIES=Object.freeze({
 'leeway.files.list':'READ','leeway.files.read':'READ','leeway.files.hash':'READ',
 'leeway.process.inspect':'READ','leeway.service.inspect':'READ','leeway.display.inspect':'READ','leeway.host.info':'READ',
 'leeway.app.open':'OPERATE','leeway.terminal.execute':'OPERATE'
});
function requireScope(args={}){
 if(args.scope!==undefined&&args.scope!=='workspace')throw Error('COMMANDER_SCOPE_NOT_BOUND');
 if(!ROOT)throw Error('COMMANDER_RESOURCE_SCOPE_UNBOUND');return ROOT;
}
function resource(args,optional=false){
 const root=requireScope(args);
 if(args.resource!==undefined&&args.path!==undefined)throw Error('COMMANDER_RESOURCE_SELECTOR_AMBIGUOUS');
 const value=args.resource??args.path??(optional?'.':undefined);
 if(typeof value!=='string'||!value||/[\x00-\x1f]/.test(value)||(/^[a-z][a-z0-9+.-]*:/i.test(value)&&!(process.platform==='win32'&&/^[a-z]:[\\/]/i.test(value))))throw Error('COMMANDER_RESOURCE_SELECTOR_INVALID');
 if(process.platform==='win32'&&(value.startsWith('\\\\')||value.slice(2).includes(':')))throw Error('COMMANDER_RESOURCE_SELECTOR_INVALID');
 return confinedPath(root,value);
}
function readRegular(target){
 const before=fs.lstatSync(target);if(!before.isFile()||before.isSymbolicLink()||before.nlink!==1)throw Error('COMMANDER_REGULAR_SINGLE_LINK_FILE_REQUIRED');
 if(before.size>MAX_BYTES)throw Error('COMMANDER_FILE_SIZE_LIMIT');
 const fd=fs.openSync(target,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0));
 try{
  const opened=fs.fstatSync(fd);if(opened.dev!==before.dev||opened.ino!==before.ino||opened.nlink!==1||opened.size>MAX_BYTES)throw Error('COMMANDER_RESOURCE_CHANGED');
  const data=Buffer.alloc(opened.size);let off=0;while(off<data.length){const n=fs.readSync(fd,data,off,data.length-off,off);if(!n)break;off+=n;}
  const after=fs.fstatSync(fd),current=fs.lstatSync(target);
  if(off!==opened.size||after.size!==opened.size||after.mtimeMs!==opened.mtimeMs||current.dev!==opened.dev||current.ino!==opened.ino||current.nlink!==1)throw Error('COMMANDER_RESOURCE_CHANGED');
  return data;
 }finally{fs.closeSync(fd);}
}
function run(cmd,args=[],cwd){return new Promise((resolve,reject)=>{
 // A scoped standalone command must not inherit Node's parent test-runner channel.
 const env={...process.env};delete env.NODE_TEST_CONTEXT;
 const child=spawn(cmd,args,{cwd,windowsHide:true,shell:false,env,stdio:['ignore','pipe','pipe']});
 let out=[],err=[],size=0,timedOut=false,overflow=false,failure=null;
 const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL');},TIMEOUT);
 const collect=dest=>data=>{size+=data.length;if(size>MAX_OUTPUT){overflow=true;child.kill('SIGKILL');}else dest.push(data);};
 child.stdout.on('data',collect(out));child.stderr.on('data',collect(err));child.on('error',e=>{failure=e;});
 child.on('close',code=>{clearTimeout(timer);const stdout=Buffer.concat(out).toString('utf8').trim(),stderr=Buffer.concat(err).toString('utf8').trim();
  if(failure||timedOut||overflow||code!==0){const error=Error(timedOut?'COMMANDER_EXECUTION_TIMEOUT':overflow?'COMMANDER_OUTPUT_LIMIT':'COMMANDER_EXECUTION_FAILED');error.native={code,stdout,stderr,error:failure?.message??null};reject(error);}else resolve(stdout);
 });
});}
function qualified(cap){
 if(cap.startsWith('leeway.files.')||cap==='leeway.terminal.execute')return ROOT?'RUNTIME_SCOPE_BOUND':'SCOPE_UNBOUND';
 if(cap==='leeway.app.open')return Object.keys(APPS).length?'HOST_APP_BINDINGS_PRESENT':'APP_BINDINGS_UNBOUND';
 if(['leeway.process.inspect','leeway.service.inspect','leeway.display.inspect'].includes(cap))return process.platform==='win32'?'WINDOWS_ADAPTER_PRESENT_NOT_HEALTH_PROBED':'PLATFORM_ADAPTER_NOT_QUALIFIED';
 return 'PORTABLE_NATIVE';
}
async function execute(cap,args={}){
 if(!Object.hasOwn(CAPABILITIES,cap))throw Error('CAPABILITY_NOT_ALLOWED');
 if(!args||typeof args!=='object'||Array.isArray(args))throw Error('COMMANDER_ARGUMENTS_INVALID');
 const pre={at:new Date().toISOString(),capability:cap,authorityTier:CAPABILITIES[cap],root:ROOT,bodyId:BODY,deviceAuthority:'4citeB4U/LEEWAY-DEVICE-BRIDGE'};
 let result;
 if(cap==='leeway.files.list'){
  const target=resource(args,true);if(!fs.statSync(target).isDirectory())throw Error('COMMANDER_DIRECTORY_REQUIRED');
  const entries=fs.readdirSync(target,{withFileTypes:true});if(entries.length>10000)throw Error('COMMANDER_DIRECTORY_SIZE_LIMIT');
  result=entries.map(e=>({name:e.name,type:e.isSymbolicLink()?'link':e.isDirectory()?'directory':e.isFile()?'file':'other'}));
 }else if(cap==='leeway.files.read'){
  const max=args.maxChars??20000;if(!Number.isInteger(max)||max<1||max>20000)throw Error('COMMANDER_READ_LIMIT_INVALID');
  result=readRegular(resource(args)).toString('utf8').slice(0,max);
 }else if(cap==='leeway.files.hash')result={algorithm:'SHA-256',hash:crypto.createHash('sha256').update(readRegular(resource(args))).digest('hex')};
 else if(cap==='leeway.host.info'){
  let disk=null;if(ROOT){try{const s=fs.statfsSync(ROOT);disk=s.blocks?Math.round((1-s.bavail/s.blocks)*10000)/100:null;}catch{}}
  result={ComputerName:os.hostname(),OS:os.type(),Version:os.release(),Architecture:os.arch(),FreeMemoryKB:Math.floor(os.freemem()/1024),CpuLoadPct:null,CpuCount:os.cpus().length,MemoryUsedPct:Math.round((1-os.freemem()/os.totalmem())*10000)/100,DiskUsedPct:disk,LoadAverage:os.loadavg(),Gpu:null,measurementScope:'PORTABLE_NODE_HOST_INFORMATION; CPU_PERCENT_AND_GPU_NOT_MEASURED'};
 }else if(['leeway.process.inspect','leeway.service.inspect','leeway.display.inspect'].includes(cap)){
  if(process.platform!=='win32')throw Error('COMMANDER_PLATFORM_CAPABILITY_NOT_QUALIFIED');
  const commands={
   'leeway.process.inspect':'Get-Process | Select -First 200 Id,ProcessName,CPU | ConvertTo-Json -Compress',
   'leeway.service.inspect':'Get-NetTCPConnection -State Listen -ErrorAction Stop | Select LocalAddress,LocalPort,OwningProcess | ConvertTo-Json -Compress',
   'leeway.display.inspect':'Get-CimInstance Win32_DesktopMonitor | Select Name,ScreenWidth,ScreenHeight,Status | ConvertTo-Json -Compress'
  };
  const value=await run('powershell.exe',['-NoProfile','-Command',commands[cap]]);result=cap==='leeway.display.inspect'?JSON.parse(value):value;
 }else if(cap==='leeway.app.open'){
  const id=args.app;if(typeof id!=='string'||!Object.hasOwn(APPS,id))throw Error('APP_NOT_ALLOWLISTED');
  const selected=APPS[id];const child=spawn(selected.executable,[...selected.args],{detached:true,stdio:'ignore',shell:false,windowsHide:true});
  await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject)});child.unref();
  result={opened:id,pid:child.pid,executionState:'SPAWN_ACKNOWLEDGED_NOT_UI_VERIFIED'};
 }else if(cap==='leeway.terminal.execute'){
  requireScope(args);if(args.profile!=='governed-readonly')throw Error('TERMINAL_PROFILE_NOT_ALLOWED');
  const plan=nativeCommandPlan({command:args.command,root:ROOT,cwd:args.cwd||ROOT,humanConfirmed:args.humanConfirmed});result=await run(plan.exe,plan.args,plan.cwd);
 }
 const envelope={provider:'LEEWAY_NATIVE_HOST_COMMANDER',ownership:'LEEWAY_NATIVE',executionIdentity:'host-commander-v0',preState:pre,result,postState:{at:new Date().toISOString()},verified:'ADAPTER_EXECUTED',signatureState:'UNSIGNED_CONTENT_HASH_ONLY'};
 envelope.receiptHash=hash(envelope);return envelope;
}
const json=(res,code,value)=>{res.writeHead(code,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(value));};
const server=http.createServer(async(req,res)=>{try{
 const port=server.address()?.port;
 if(req.headers.origin||!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host))return json(res,403,{error:'LOCAL_NATIVE_CALLER_REQUIRED'});
 const u=new URL(req.url,'http://127.0.0.1');
 if(req.method==='GET'&&u.pathname==='/health')return json(res,200,{status:'PASS',healthScope:'LISTENER_AND_PROVIDER_IDENTITY_NOT_ALL_CAPABILITIES',provider:'LEEWAY_NATIVE_HOST_COMMANDER',root:ROOT,bodyId:BODY,deviceAuthority:'4citeB4U/LEEWAY-DEVICE-BRIDGE',transport:'LOOPBACK_ONLY',remotePairingQualified:false,logicalScopes:ROOT?['workspace']:[],capabilities:CAPABILITIES,capabilityStates:Object.fromEntries(Object.keys(CAPABILITIES).map(c=>[c,qualified(c)])),portability:{fixedRootRequired:false,fixedDeviceRequired:false,hostInformationBackend:'node:os',platform:process.platform}});
 if(req.method==='POST'&&u.pathname==='/execute'){
  if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return json(res,415,{error:'JSON_REQUIRED'});
  let chunks=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>65536)return json(res,413,{error:'REQUEST_TOO_LARGE'});chunks.push(chunk);}
  const d=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');return json(res,200,await execute(d.capability,d.args??{}));
 }
 return json(res,404,{error:'NOT_FOUND'});
}catch(e){return json(res,400,{error:e.message,native:e.native??undefined});}});
server.listen(PORT,'127.0.0.1',()=>console.log(JSON.stringify({event:'LEEWAY_NATIVE_HOST_COMMANDER_READY',provider:'LEEWAY_NATIVE_HOST_COMMANDER',port:server.address().port,logicalScopes:ROOT?['workspace']:[],bodyId:BODY})));
