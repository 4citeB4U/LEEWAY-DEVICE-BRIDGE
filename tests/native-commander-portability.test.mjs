/*
LEEWAY_HEADER - DO NOT REMOVE
REGION: LEEWAY.DEVICES.DESKTOP_COMMANDER.QUALIFICATION
TAG: NATIVE_COMMANDER_PORTABILITY_ACTUAL_RUNTIME
5WH: WHAT=Qualify the existing native Commander without fixed path/device assumptions;
WHY=Startup/host diagnostics must survive unbound storage and resource relocation;
WHO=Creator-authorized local test Harness; WHERE=tests/native-commander-portability.test.mjs;
WHEN=2026-10-06; HOW=Real loopback child servers, temporary resources, direct Node execution, denial and read-back.
AUTHORIZED_ROLES: Isolated test Harness. LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const source=fileURLToPath(new URL('../providers/desktop-commander/native-host/server.mjs',import.meta.url));
const policy=fileURLToPath(new URL('../providers/desktop-commander/native-host/command-policy.mjs',import.meta.url));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const sourceHash=sha(fs.readFileSync(source)),policyHash=sha(fs.readFileSync(policy));
async function start(t,extra={}){
 const env={...process.env};for(const k of ['LEEWAY_ROOT','LEEWAY_HOST_COMMANDER_ROOT','LEEWAY_BODY_ID','LEEWAY_HOST_COMMANDER_APPS_JSON','LEEWAY_HOST_COMMANDER_TIMEOUT_MS'])delete env[k];
 Object.assign(env,{LEEWAY_HOST_COMMANDER_PORT:'0'},extra);
 const child=spawn(process.execPath,[source],{env,stdio:['ignore','pipe','pipe'],windowsHide:true});let stderr='';child.stderr.on('data',d=>stderr+=d);
 let stopped=false;async function stop(){if(stopped)return;stopped=true;if(child.exitCode!==null||child.signalCode)return;const closed=new Promise(resolve=>child.once('exit',resolve));child.kill();await closed;}
 t.after(stop);
 const ready=await new Promise((resolve,reject)=>{
  let text='';const timer=setTimeout(()=>reject(Error('NATIVE_READY_TIMEOUT '+stderr)),5000);
  child.once('error',e=>{clearTimeout(timer);reject(e)});child.once('exit',code=>{clearTimeout(timer);reject(Error('NATIVE_START_EXIT_'+code+' '+stderr))});
  child.stdout.on('data',d=>{text+=d;const lines=text.split(/\r?\n/);for(const line of lines){try{const v=JSON.parse(line);if(v.event==='LEEWAY_NATIVE_HOST_COMMANDER_READY'){clearTimeout(timer);resolve(v);return;}}catch{}}});
 });
 const endpoint='http://127.0.0.1:'+ready.port;
 const call=async(capability,args={})=>{const r=await fetch(endpoint+'/execute',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({capability,args}),signal:AbortSignal.timeout(10000)});return {http:r.status,value:await r.json()};};
 return {endpoint,ready,stop,call,health:async()=>{const r=await fetch(endpoint+'/health',{signal:AbortSignal.timeout(5000)});return r.json()}};
}
function temporary(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'leeway-native-portable-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;}
function receipt(value){const {receiptHash,...body}=value;assert.equal(receiptHash,sha(JSON.stringify(body)));assert.equal(value.provider,'LEEWAY_NATIVE_HOST_COMMANDER');assert.equal(value.preState.deviceAuthority,'4citeB4U/LEEWAY-DEVICE-BRIDGE');assert.equal(value.signatureState,'UNSIGNED_CONTENT_HASH_ONLY');}

test('native portability: startup and host information require no filesystem root or device id',async t=>{
 const s=await start(t);const h=await s.health();
 await t.test('provider identity is unchanged and logical scopes are empty',()=>{assert.equal(h.status,'PASS');assert.equal(h.provider,'LEEWAY_NATIVE_HOST_COMMANDER');assert.equal(h.root,null);assert.equal(h.bodyId,null);assert.deepEqual(h.logicalScopes,[]);assert.equal(h.portability.fixedRootRequired,false);});
 await t.test('native host information works without a workspace',async()=>{const r=await s.call('leeway.host.info');assert.equal(r.http,200);receipt(r.value);assert.equal(r.value.result.OS,os.type());assert.equal(r.value.result.Architecture,os.arch());assert.ok(r.value.result.FreeMemoryKB>0);assert.equal(r.value.result.DiskUsedPct,null);assert.equal(r.value.result.CpuLoadPct,null);});
 await t.test('unbound filesystem access fails closed instead of preventing startup',async()=>{const r=await s.call('leeway.files.list');assert.equal(r.http,400);assert.equal(r.value.error,'COMMANDER_RESOURCE_SCOPE_UNBOUND');});
 await t.test('unknown capability does not inherit an object prototype method',async()=>{const r=await s.call('toString');assert.equal(r.http,400);assert.equal(r.value.error,'CAPABILITY_NOT_ALLOWED');});
 await t.test('no default app paths are inferred',async()=>{const r=await s.call('leeway.app.open',{app:'chrome'});assert.equal(r.http,400);assert.equal(r.value.error,'APP_NOT_ALLOWLISTED');});
 await t.test('browser-origin requests are denied',async()=>{const r=await fetch(s.endpoint+'/health',{headers:{Origin:'https://untrusted.invalid'}});assert.equal(r.status,403);});
 await t.test('spoofed host headers are denied',async()=>{const status=await new Promise((resolve,reject)=>{http.get(s.endpoint+'/health',{headers:{Host:'untrusted.invalid'}},res=>{res.resume();resolve(res.statusCode)}).on('error',reject)});assert.equal(status,403);});
 await t.test('non-JSON body rejected',async()=>{const r=await fetch(s.endpoint+'/execute',{method:'POST',body:'{}'});assert.equal(r.status,415);});
 await t.test('oversized body rejected',async()=>{const r=await fetch(s.endpoint+'/execute',{method:'POST',headers:{'content-type':'application/json'},body:' '.repeat(65537)});assert.equal(r.status,413);});
 await t.test('malformed argument types rejected',async()=>{const r=await s.call('leeway.host.info',[]);assert.equal(r.http,400);assert.equal(r.value.error,'COMMANDER_ARGUMENTS_INVALID');});
 await t.test('unsupported platform adapters are reported separately',async()=>{const state=h.capabilityStates['leeway.display.inspect'];assert.equal(state,process.platform==='win32'?'WINDOWS_ADAPTER_PRESENT_NOT_HEALTH_PROBED':'PLATFORM_ADAPTER_NOT_QUALIFIED');if(process.platform!=='win32'){const r=await s.call('leeway.display.inspect');assert.equal(r.value.error,'COMMANDER_PLATFORM_CAPABILITY_NOT_QUALIFIED');}});
 await s.stop();
});

test('native portability: logical resources relocate without changing source or request',async t=>{
 const a=temporary(t),b=temporary(t);fs.writeFileSync(path.join(a,'proof.txt'),'ROOT_A');fs.writeFileSync(path.join(b,'proof.txt'),'ROOT_B');
 const request={scope:'workspace',resource:'proof.txt'};
 const one=await start(t,{LEEWAY_HOST_COMMANDER_ROOT:a,LEEWAY_BODY_ID:'test-body-'+crypto.randomUUID()});
 await t.test('relative resource read is bound by the target runtime',async()=>{const r=await one.call('leeway.files.read',request);assert.equal(r.http,200);assert.equal(r.value.result,'ROOT_A');receipt(r.value);});
 await t.test('unknown scope cannot fall back to a physical path',async()=>{const r=await one.call('leeway.files.read',{scope:'other',path:path.join(a,'proof.txt')});assert.equal(r.value.error,'COMMANDER_SCOPE_NOT_BOUND');});
 await t.test('traversal outside the bound root is rejected',async()=>{const r=await one.call('leeway.files.read',{resource:path.join(b,'proof.txt')});assert.equal(r.http,400);assert.equal(r.value.error,'PATH_OUTSIDE_LEEWAY_ROOT');});
 await t.test('ambiguous dual selectors fail closed',async()=>{const r=await one.call('leeway.files.read',{resource:'proof.txt',path:'proof.txt'});assert.equal(r.value.error,'COMMANDER_RESOURCE_SELECTOR_AMBIGUOUS');});
 await t.test('URI selectors are not filesystem grants',async()=>{const r=await one.call('leeway.files.read',{resource:'file:///outside.txt'});assert.equal(r.value.error,'COMMANDER_RESOURCE_SELECTOR_INVALID');});
 await t.test('hash equals independent SHA-256',async()=>{const r=await one.call('leeway.files.hash',request);assert.equal(r.http,200);assert.equal(r.value.result.hash,sha('ROOT_A'));receipt(r.value);});
 await t.test('legacy explicit in-scope path remains compatible',async()=>{const r=await one.call('leeway.files.read',{path:path.join(a,'proof.txt')});assert.equal(r.http,200);assert.equal(r.value.result,'ROOT_A');});
 await t.test('invalid read limit is rejected',async()=>{const r=await one.call('leeway.files.read',{...request,maxChars:-1});assert.equal(r.value.error,'COMMANDER_READ_LIMIT_INVALID');});
 await t.test('single-link file policy rejects aliases',async()=>{const p=path.join(a,'hard.txt');fs.linkSync(path.join(a,'proof.txt'),p);try{const r=await one.call('leeway.files.read',request);assert.equal(r.http,400);assert.equal(r.value.error,'COMMANDER_REGULAR_SINGLE_LINK_FILE_REQUIRED');}finally{fs.unlinkSync(p);}});
 await t.test('directory listing retains typed entries',async()=>{const r=await one.call('leeway.files.list',{scope:'workspace',resource:'.'});assert.equal(r.http,200);assert.ok(r.value.result.some(e=>e.name==='proof.txt'&&e.type==='file'));});
 await t.test('terminal syntax check really runs through native capability',async()=>{fs.writeFileSync(path.join(a,'fixture.mjs'),"import fs from 'node:fs'; fs.writeFileSync(new URL('./executed.txt',import.meta.url),'NATIVE_TEST_RAN');");const r=await one.call('leeway.terminal.execute',{profile:'governed-readonly',command:'node --check fixture.mjs'});assert.equal(r.http,200);receipt(r.value);});
 await t.test('script tests require explicit owner-confirmed execution',async()=>{const r=await one.call('leeway.terminal.execute',{profile:'governed-readonly',command:'node --test fixture.mjs'});assert.equal(r.http,400);assert.equal(r.value.error,'COMMANDER_TEST_EXECUTION_APPROVAL_REQUIRED');});
 await t.test('confirmed scoped test executes without an external Commander implementation',async()=>{const r=await one.call('leeway.terminal.execute',{profile:'governed-readonly',command:'node --test fixture.mjs',humanConfirmed:true});assert.equal(r.http,200);receipt(r.value);const back=await one.call('leeway.files.read',{scope:'workspace',resource:'executed.txt'});assert.equal(back.http,200);assert.equal(back.value.result,'NATIVE_TEST_RAN');});
 await t.test('shell-chain syntax never reaches a shell',async()=>{const r=await one.call('leeway.terminal.execute',{profile:'governed-readonly',command:'git status; whoami'});assert.equal(r.http,400);assert.equal(r.value.error,'COMMAND_CHAIN_NOT_ALLOWED');});
 const oldBody=(await one.health()).bodyId;await one.stop();const two=await start(t,{LEEWAY_HOST_COMMANDER_ROOT:b,LEEWAY_BODY_ID:'test-body-'+crypto.randomUUID()});
 await t.test('identical logical request follows the new authorized binding',async()=>{const r=await two.call('leeway.files.read',request);assert.equal(r.http,200);assert.equal(r.value.result,'ROOT_B');assert.notEqual(r.value.preState.bodyId,oldBody);assert.equal(r.value.provider,'LEEWAY_NATIVE_HOST_COMMANDER');});
 await two.stop();assert.equal(sha(fs.readFileSync(source)),sourceHash);assert.equal(sha(fs.readFileSync(policy)),policyHash);
});

test('native portability: host-bound app identifier needs no workspace root',async t=>{
 const apps=JSON.stringify({'runtime-probe':{executable:process.execPath,args:['--version']}});const s=await start(t,{LEEWAY_HOST_COMMANDER_APPS_JSON:apps});
 const r=await s.call('leeway.app.open',{app:'runtime-probe'});assert.equal(r.http,200);receipt(r.value);assert.ok(r.value.result.pid>0);assert.equal(r.value.result.executionState,'SPAWN_ACKNOWLEDGED_NOT_UI_VERIFIED');await s.stop();
});
test('native portability: no embedded drive, home, device label or filesystem default',()=>{
 const text=fs.readFileSync(source,'utf8');assert.doesNotMatch(text,/[A-Za-z]:\\|\/home\/|\/Users\//);assert.doesNotMatch(text,/Cerebral|pc-primary|C:\\Program Files/);assert.equal(sha(fs.readFileSync(policy)),policyHash);
});
