/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.EXTENSION.TESTS
TAG: LEEWAY.EXTENSION.V2.TESTS
5WH:
WHAT = Test bounded extension behaviors and negative admission paths.
WHY = Prevent ambient access and fake execution evidence in the browser client.
WHO = LeeWay Device Bridge extension contributors under Creator authority.
WHERE = tests/extension.test.mjs
WHEN = 2026-11-16.
HOW = Run source in isolated Node VM mocks and inspect deterministic archives.
LICENSE = Not asserted; existing repository terms govern.
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const folder=path.join(root,'apps','extension');
const read=(file)=>fs.readFileSync(path.join(folder,file),'utf8');
const manifest=JSON.parse(read('manifest.json'));
function mockBackground(nativeReply) {
  let onClick, onMsg;const sent=[];const injections=[];
  const api={runtime:{id:'extension-owned-id',lastError:null,
    onMessage:{addListener:fn=>onMsg=fn},
    sendNativeMessage:(host,message,done)=>{sent.push({host,message});done(nativeReply(message));}},
    action:{onClicked:{addListener:fn=>onClick=fn}},
    scripting:{executeScript:async request=>injections.push(request)}};
  const ctx={chrome:api,crypto:{randomUUID:()=> '123e4567-e89b-42d3-a456-426614174000'},setTimeout,clearTimeout,URL,Date,console};
  ctx.globalThis=ctx;vm.runInNewContext(read('background.js'),ctx,{timeout:500});
  const sender={id:api.runtime.id,tab:{id:17},url:'https://chatgpt.com/c/123'};
  const snapshot={protocolVersion:2,category:'CHATGPT',origin:'https://chatgpt.com',pageTitle:'A chat',selectedText:'a selected paragraph',capturedAt:new Date().toISOString(),attribution:'USER_SELECTION_ONLY',interaction:'READ_ONLY'};
  const submit=(s=snapshot, from=sender)=>new Promise(resolve=> {const result=onMsg({type:'leeway.observation.submit',snapshot:s},from,resolve);assert.equal(result,true)});
  return {submit,onClick,sent,injections,sender,snapshot};
}
test('manifest has no ambient host permissions or remote code',()=>{
  assert.equal(manifest.manifest_version,3);
  assert.ok(manifest.permissions.includes('activeTab'));
  assert.ok(!manifest.host_permissions);
  assert.ok(!manifest.content_scripts);
  assert.ok(!manifest.externally_connectable);
  assert.equal(manifest.background.service_worker,'background.js');
});
test('native confirmation reports acceptance, not Veritas execution',async()=>{
  const m=mockBackground(req=>({version:2,requestId:req.requestId,ok:true,admission:'ACCEPTED'}));
  const r=await m.submit();assert.equal(r.ok,true);assert.equal(r.state,'NATIVE_ACCEPTED_NOT_VERITAS_VERIFIED');
  assert.equal(m.sent.length,1);assert.equal(m.sent[0].host,'com.leeway.devicebridge');
});
test('mismatched tab origin is refused without contacting host',async()=>{
  const m=mockBackground(()=>({}));const r=await m.submit({...m.snapshot,origin:'https://evil.example'});
  assert.equal(r.error,'TAB_ORIGIN_MISMATCH');assert.equal(m.sent.length,0);
});
test('untrusted message sender is refused without contacting host',async()=>{
  const m=mockBackground(()=>({}));const r=await m.submit(m.snapshot,{...m.sender,id:'outside'});
  assert.equal(r.error,'SENDER_UNTRUSTED');assert.equal(m.sent.length,0);
});
test('oversize and empty selection are refused',async()=>{
  const m=mockBackground(()=>({}));
  assert.equal((await m.submit({...m.snapshot,selectedText:'x'.repeat(4097)})).error,'SELECTION_INVALID');
  assert.equal((await m.submit({...m.snapshot,selectedText:'  '})).error,'SELECTION_INVALID');
  assert.equal(m.sent.length,0);
});
test('stale observation is refused without contacting host',async()=>{
  const m=mockBackground(()=>({}));const r=await m.submit({...m.snapshot,capturedAt:'2020-01-01T00:00:00Z'});
  assert.equal(r.error,'CAPTURE_STALE');assert.equal(m.sent.length,0);
});
test('native host must supply matching request ID and explicit admission',async()=>{
  const m=mockBackground(()=>({version:2,requestId:'wrong',ok:true,admission:'ACCEPTED'}));
  assert.equal((await m.submit()).error,'NATIVE_ADMISSION_NOT_CONFIRMED');
});
test('toolbar gesture only injects on allowed web tab',async()=>{
  const m=mockBackground(()=>({}));await m.onClick({id:17,url:'https://example.com'});
  assert.equal(m.injections.length,1);
  assert.deepEqual(Array.from(m.injections[0].files),['browser-polyfill.js','content-courier.js','floating-tablet.js']);
  await m.onClick({id:18,url:'chrome://settings'});assert.equal(m.injections.length,1);
});
test('all source files contain governance header',()=>{
  for(const name of ['background.js','browser-polyfill.js','content-courier.js','floating-tablet.js','userscript-bridge.user.js']){
    const body=read(name);assert.match(body,/LEEWAY HEADER — DO NOT REMOVE/);assert.match(body,/5WH:/);
  }
});
test('packaging produces three valid ZIP files and stable digest values',()=>{
  const script=path.join(root,'scripts','build-extension.mjs');
  execFileSync(process.execPath,[script],{cwd:root});
  const hashes=JSON.parse(fs.readFileSync(path.join(root,'dist','SHA256SUMS.json'),'utf8'));
  assert.equal(Object.keys(hashes.artifacts).length,4);
  assert.ok(Object.values(hashes.artifacts).every(x=>/^[0-9a-f]{64}$/.test(x.sha256)));
  const before=fs.readFileSync(path.join(root,'dist','leeway-extension-v2-firefox.zip'));
  execFileSync(process.execPath,[script],{cwd:root});
  assert.ok(before.equals(fs.readFileSync(path.join(root,'dist','leeway-extension-v2-firefox.zip'))));
});
