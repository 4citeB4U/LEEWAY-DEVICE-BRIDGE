/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.EXTENSION.TEST
TAG: LEEWAY.EXTENSION.V2.NEGATIVE.TESTS
5WH:
WHAT = Verify the exact browser-extension manifests and fail-closed courier primitives.
WHY = Prevent silent page access or fake native-host admission.
WHO = Creator-authorized Device Bridge contributors.
WHERE = tests/extension-v2.test.mjs.
WHEN = 2026-11-16.
HOW = Node native test runner; no fake physical device or canonical receipt.
LICENSE = Existing repository terms; no new license asserted.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
const base=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','apps','extension');
const js=p=>readFileSync(path.join(base,p),'utf8');
const manifest=p=>JSON.parse(js(p));
const source=js('browser-polyfill.js');
const sandbox={URL,globalThis:null};sandbox.globalThis=sandbox;
vm.runInNewContext(source,sandbox,{filename:'browser-polyfill.js'});
const B=sandbox.LeewayExtensionV2;
for (const file of ['manifest.json','manifest.firefox.json']) test(`${file}: bounded MV3 permissions`,()=>{
  const m=manifest(file);
  assert.equal(m.manifest_version,3);assert.equal(m.version,'0.2.0');
  assert.deepEqual(m.permissions.sort(),['activeTab','nativeMessaging','scripting'].sort());
  assert.equal(m.content_scripts,undefined);assert.equal(m.host_permissions,undefined);
  assert.ok(m.background?.service_worker||m.background?.scripts);
});
test('Chromium and Firefox have distinct background packaging',()=>{
  assert.equal(manifest('manifest.json').background.service_worker,'background.js');
  assert.deepEqual(manifest('manifest.firefox.json').background.scripts,['browser-polyfill.js','background.js']);
});
test('selection requires explicit bounded content',()=>{
  const ok=B.pageExcerpt({href:'https://example.com/a',title:'safe',selection:'selected text'});
  assert.equal(ok.selection,'selected text');
  for (const payload of [
    {href:'file:///private',title:'',selection:'text'},
    {href:'https://x.test',title:'',selection:''},
    {href:'https://x.test',title:'',selection:'a'.repeat(8193)},
    {href:'https://user:pass@x.test',title:'',selection:'foo'},
    {href:'javascript:alert(1)',title:'',selection:'foo'}
  ]) assert.throws(()=>B.pageExcerpt(payload));
});
test('native hello requires authenticated v2 and capability',()=>{
  const correct={type:'leeway.extension.hello-ack',version:2,authenticated:true,sessionId:'enrolled-session',capabilities:['page.excerpt.submit']};
  assert.equal(B.validateHelloAck(correct).sessionId,'enrolled-session');
  for(const field of ['authenticated','version','sessionId','capabilities']){
    const bad={...correct,[field]:field==='capabilities'?[]:null};
    assert.throws(()=>B.validateHelloAck(bad));
  }
});
test('no device singleton, token literal, or hidden page collection',()=>{
  for(const file of ['browser-polyfill.js','background.js','content-courier.js','floating-tablet.js']){
    const c=js(file);
    assert.doesNotMatch(c,/pc-primary|pc-hp-secondary|C:\\Users\\|E:\\|<all_urls>/);
  }
  assert.doesNotMatch(js('content-courier.js'),/innerText|querySelectorAll|keydown|MutationObserver/);
});
test('authorizedSender binds sender extension ID and tab origin',()=>{
  const listeners={};
  const api={runtime:{id:'test-extension-id',onMessage:{addListener:fn=>listeners.message=fn}},action:{onClicked:{addListener:fn=>listeners.click=fn}}};
  const context={URL,crypto:{randomUUID:()=> 'id'},chrome:api,setTimeout,clearTimeout,console};context.globalThis=context;
  vm.runInNewContext(source,context);
  vm.runInNewContext(js('background.js'),context);
  const f=context.LeewayExtensionBackground.authorizedSender;
  assert.equal(f({id:'test-extension-id',tab:{url:'https://example.org/a'}},{href:'https://example.org/b'}),true);
  assert.equal(f({id:'test-extension-id',tab:{url:'https://example.org/a'}},{href:'https://evil.example/b'}),false);
  assert.equal(f({id:'bad',tab:{url:'https://example.org/a'}},{href:'https://example.org/b'}),false);
  assert.equal(f({id:'test-extension-id',tab:{url:'chrome://extensions'}},{href:'chrome://extensions'}),false);
  assert.equal(typeof listeners.message,'function');assert.equal(typeof listeners.click,'function');
});
test('native host exchange: correlated acknowledgement is not Veritas',async()=>{
  const h={};
  const port={
    onMessage:{addListener:f=>h.onMessage=f},
    onDisconnect:{addListener:f=>h.onDisconnect=f},
    postMessage(message){
      if(message.type==='leeway.extension.hello'){
        queueMicrotask(()=>h.onMessage({type:'leeway.extension.hello-ack',version:2,authenticated:true,sessionId:'enrolled-1',capabilities:['page.excerpt.submit']}));
      }
      if(message.type==='leeway.extension.page-excerpt'){
        queueMicrotask(()=>h.onMessage({type:'leeway.extension.receipt',sessionId:'enrolled-1',requestId:message.requestId,accepted:true}));
      }
    }, disconnect(){}
  };
  const r={};
  const api={runtime:{id:'ext-id',onMessage:{addListener:f=>r.message=f},connectNative:()=>port},action:{onClicked:{addListener:f=>r.clicked=f}}};
  const c={URL,crypto:{randomUUID:()=> 'request-42'},chrome:api,setTimeout,clearTimeout,console,queueMicrotask}; c.globalThis=c;
  vm.runInNewContext(source,c); vm.runInNewContext(js('background.js'),c);
  const sender={id:'ext-id',tab:{url:'https://example.org/a'}};
  const call=(type,payload)=>new Promise(resolve=>{r.message({type,payload},sender,resolve)});
  const auth=await call('LEEWAY_V2_CONNECT');
  assert.equal(auth.ok,true);assert.equal(auth.result.connected,true);
  const got=await call('LEEWAY_V2_SHARE_SELECTION',{href:'https://example.org/a',title:'Doc',selection:'Hello Lee'});
  assert.equal(got.ok,true);assert.equal(got.result.requestId,'request-42');
  assert.equal(got.result.authority,'NATIVE_HOST_ACK_NOT_VERITAS');
  const disconnect=await call('LEEWAY_V2_DISCONNECT');
  assert.equal(disconnect.result.connected,false);
  const denied=await call('LEEWAY_V2_SHARE_SELECTION',{href:'https://example.org/a',title:'Doc',selection:'Hello Lee'});
  assert.equal(denied.ok,false);
});
test('native host denies unqualified hello',async()=>{
  const handlers={};
  const port={onMessage:{addListener:f=>handlers.msg=f},onDisconnect:{addListener:f=>handlers.dis=f},postMessage(){queueMicrotask(()=>handlers.msg({type:'leeway.extension.hello-ack',version:2,authenticated:false,sessionId:'x',capabilities:['page.excerpt.submit']}));},disconnect(){}};
  const r={};const api={runtime:{id:'ext-id',onMessage:{addListener:f=>r.msg=f},connectNative:()=>port},action:{onClicked:{addListener(){}}}};
  const c={URL,crypto:{randomUUID:()=> 'req'},chrome:api,setTimeout,clearTimeout,queueMicrotask,console};c.globalThis=c;
  vm.runInNewContext(source,c);vm.runInNewContext(js('background.js'),c);
  const denied=await new Promise(resolve=>r.msg({type:'LEEWAY_V2_CONNECT'},{id:'ext-id',tab:{url:'https://example.org'}},resolve));
  assert.equal(denied.ok,false);
  assert.match(denied.error,/NATIVE_AUTHENTICATION_NOT_QUALIFIED/);
});
