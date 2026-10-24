/*
REGION: LEEWAY.DEVICES.COMMANDER.QUALIFICATION
TAG: NATIVE_COMMANDER_INTEGRATION_TEST
WHO: Agent Lee qualification
WHAT: Execute the staged real native server and existing provider adapter.
WHEN: Before live migration; WHERE: temporary local workspace and loopback port.
WHY: Prove real file reads/hashes and authority confinement, not source string presence.
HOW: Spawn native provider; positive/negative HTTP and direct-argument policy tests; teardown.
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {DesktopCommanderAdapter} from '../providers/desktop-commander/index.mjs';
import {NativeHostCommanderTransport} from '../providers/desktop-commander/native-host-transport.mjs';
import {nativeCommandPlan,confinedPath} from '../providers/desktop-commander/native-host/command-policy.mjs';
const serverFile=fileURLToPath(new URL('../providers/desktop-commander/native-host/server.mjs',import.meta.url));
const sha=value=>createHash('sha256').update(value).digest('hex');
async function freePort(){const server=net.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));return port;}

test('native Commander remains one Device Bridge provider with actual execution',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'leeway-native-commander-'));
 const file=path.join(root,'read-proof.txt');fs.writeFileSync(file,'LeeWay native Commander read-back proof.');
 const outside=path.join(os.tmpdir(),'outside-'+path.basename(root)+'.txt');fs.writeFileSync(outside,'not authorized');
 const port=await freePort(),endpoint='http://127.0.0.1:'+port;
 const proc=spawn(process.execPath,[serverFile],{env:{...process.env,LEEWAY_ROOT:'D:\\obsolete',LEEWAY_HOST_COMMANDER_ROOT:root,LEEWAY_HOST_COMMANDER_PORT:String(port),LEEWAY_BODY_ID:'qualification-host'},stdio:['ignore','pipe','pipe']});
 let errors='';proc.stderr.on('data',d=>errors+=d);
 t.after(async()=>{proc.kill();await new Promise(resolve=>{if(proc.exitCode!==null)resolve();else proc.once('exit',resolve)});fs.rmSync(root,{recursive:true,force:true});fs.rmSync(outside,{force:true});});
 let ready=false;
 for(let i=0;i<100;i++){try{const r=await fetch(endpoint+'/health');if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,50));}
 assert.ok(ready,errors);
 const transport=new NativeHostCommanderTransport({endpoint,bodyId:'qualification-host'});
 const adapter=new DesktopCommanderAdapter({transport});
 await t.test('actual native identity and corrected explicit root',async()=>{const r=await adapter.ping('qualification-host');assert.equal(r.root,root);assert.equal(r.deviceAuthority,'4citeB4U/LEEWAY-DEVICE-BRIDGE');assert.equal(r.remotePairingQualified,false)});
 await t.test('read actual file through existing DesktopCommanderAdapter',async()=>{const r=await adapter.readFile('qualification-host',file);assert.equal(r.result,fs.readFileSync(file,'utf8'));assert.match(r.receiptHash,/^[0-9a-f]{64}$/)});
 await t.test('hash matches independent SHA-256',async()=>{const r=await transport.invoke('hashFile',{target:'qualification-host',path:file});assert.equal(r.result.hash,sha(fs.readFileSync(file)))});
 await t.test('target identity cannot be changed by payload',async()=>{await assert.rejects(()=>adapter.ping('other-host'),/TARGET_NOT_BOUND/)});
 await t.test('outside-root read is rejected',async()=>{await assert.rejects(()=>adapter.readFile('qualification-host',outside),/PATH_OUTSIDE_LEEWAY_ROOT/)});
 await t.test('browser-origin requests rejected',async()=>{const r=await fetch(endpoint+'/health',{headers:{origin:'https://untrusted.invalid'}});assert.equal(r.status,403)});
 await t.test('host-header spoofing rejected',async()=>{const status=await new Promise((resolve,reject)=>{const req=http.get(endpoint+'/health',{headers:{Host:'attacker.invalid'}},res=>{res.resume();resolve(res.statusCode)});req.on('error',reject)});assert.equal(status,403)});
 await t.test('non-JSON request rejected',async()=>{const r=await fetch(endpoint+'/execute',{method:'POST',body:'{}'});assert.equal(r.status,415)});
 await t.test('oversized request rejected',async()=>{const r=await fetch(endpoint+'/execute',{method:'POST',headers:{'content-type':'application/json'},body:' '.repeat(65537)});assert.equal(r.status,413)});
 await t.test('symlink escape cannot pass root confinement',()=>{const link=path.join(root,'outside-link');try{fs.symlinkSync(path.dirname(outside),link,'junction');}catch(e){if(e.code==='EPERM')return t.skip('OS denied creating test junction');throw e}assert.throws(()=>confinedPath(root,path.join(link,path.basename(outside))),/PATH_OUTSIDE_LEEWAY_ROOT/)});
 await t.test('shell chaining is rejected',()=>{for(const c of ['git status; whoami','git status | whoami','git status\nwhoami','git status $(whoami)','git status & whoami'])assert.throws(()=>nativeCommandPlan({command:c,root}),/COMMAND_CHAIN_NOT_ALLOWED/)});
 await t.test('explicit command families use direct argument vectors',()=>{const p=nativeCommandPlan({command:'git status --short --branch',root});assert.deepEqual(p.args,['status','--short','--branch']);assert.equal(p.exe,'git')});
 await t.test('unknown git flags and script execution are not readonly',()=>{assert.throws(()=>nativeCommandPlan({command:'git -c alias.x=bad status',root}),/COMMAND_NOT_ALLOWLISTED/);assert.throws(()=>nativeCommandPlan({command:'node --test test.mjs',root}),/APPROVAL_REQUIRED/)});
 await t.test('public hosts cannot enter native loopback transport',()=>{assert.throws(()=>new NativeHostCommanderTransport({endpoint:'http://example.com:8891',bodyId:'x'}),/LOOPBACK_ENDPOINT_REQUIRED/)});
});
