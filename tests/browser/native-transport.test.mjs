/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.BROWSER.NATIVE_TRANSPORT.TEST
TAG: LEEWAY.BRIDGE_NATIVE_STDIO_AND_REGISTRATION.TEST.V1
5WH:
WHAT = Exercise native-browser bounded framing and explicit Chrome/Edge installer registration manifests.
WHY = Deny malformed browser messages, arbitrary extension origins and hardcoded machine root assumptions.
WHO = Creator-authorized Device Bridge QA; source-only fixtures and no OS installation.
WHERE = tests/browser/native-transport.test.mjs.
WHEN = 2026-11-23.
HOW = Node buffers/EventEmitter and manifest input validation; no real device or credentials.
LICENSE = MIT; no physical device proof.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createNativeMessageDecoder,encodeNativeFrame,runNativeBrowserSession} from '../../operator/browser/native-message-transport.mjs';
import {createNativeHostManifest,LEEWAY_BROWSER_HOST_NAME} from '../../operator/browser/native-host-manifest.mjs';

test('native messaging framing accepts bounded split and combined payloads',()=>{
 const messages=[];
 const decoder=createNativeMessageDecoder(x=>messages.push(x));
 const first=encodeNativeFrame({type:'hello',version:3});
 decoder.push(first.subarray(0,2));decoder.push(first.subarray(2,6));decoder.push(first.subarray(6));
 const second=encodeNativeFrame({type:'bridge-snapshot-request',version:3});
 decoder.push(Buffer.concat([first,second]));
 assert.equal(messages.length,3);
 assert.equal(messages[2].type,'bridge-snapshot-request');
});
test('native framing denies zero, malformed JSON, and excessive frame size',()=>{
 assert.throws(()=>encodeNativeFrame({data:'a'.repeat(1024*1024+1)}),/FRAME_INVALID/);
 const bad=Buffer.alloc(4);bad.writeUInt32LE(1024*1024+1);
 assert.throws(()=>createNativeMessageDecoder(()=>{}).push(bad),/FRAME_SIZE_DENIED/);
 const invalid=Buffer.concat([Buffer.from([3,0,0,0]),Buffer.from('BAD')]);
 assert.throws(()=>createNativeMessageDecoder(()=>{}).push(invalid),/FRAME_JSON_INVALID/);
});
test('stdio host adapter routes only through supplied original session handler',async()=>{
 const input=new EventEmitter();
 const frames=[];
 const output={write:x=>frames.push(x)};
 const session={handle:async request=>({type:'host-reply',echo:request.type})};
 const run=await runNativeBrowserSession({input,output,session});
 input.emit('data',encodeNativeFrame({type:'native-hello'}));
 await run.drain();
 assert.equal(frames.length,1);
 const replies=[];createNativeMessageDecoder(x=>replies.push(x)).push(frames[0]);
 assert.equal(replies[0].echo,'native-hello');
 run.stop();
});
test('Chrome/Edge host registration requires real exact published IDs, not wildcard',()=>{
 const a='a'.repeat(32),b='b'.repeat(32);
 const approved=createNativeHostManifest({
  installedExecutable:'/opt/approved-leeway/native-bridge-host',
  chromeStoreId:a,edgeStoreId:b
 });
 assert.equal(approved.name,LEEWAY_BROWSER_HOST_NAME);
 assert.deepEqual(approved.allowed_origins,[
  'chrome-extension://'+a+'/','chrome-extension://'+b+'/'
 ]);
 for(const id of ['*','test','a'.repeat(31),'https://example.com']){
  assert.throws(()=>createNativeHostManifest({
   installedExecutable:'/opt/approved-leeway/native-bridge-host',
   chromeStoreId:id,edgeStoreId:b
  }),/PUBLISHED_EXTENSION_ID_REQUIRED/);
 }
 assert.throws(()=>createNativeHostManifest({
  installedExecutable:'relative/runtime/host',
  chromeStoreId:a,edgeStoreId:b
 }),/INSTALLER_EXE_PATH_UNBOUND/);
});
