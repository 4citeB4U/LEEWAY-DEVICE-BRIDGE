/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.DESKTOP
TAG: LEEWAY.DESKTOP_COMMANDER_INTERACTIVE_SESSION_ACCEPTANCE_V1
WHO: LeeWay Industries maintainer.
WHAT: Test interactive start/read/input/list/stop lifecycle.
WHEN: 2026-10-24; WHERE: tests/mcp/desktop-interactive-sessions.test.mjs.
WHY: Existing one-shot job is not a functional substitute for interactive Desktop Commander.
HOW: Disposable workspace, allowlisted Node child, opaque IDs, paged output and denied MCP calls.
AUTHORITY: TEST_FIXTURE_ONLY. Does not issue Formula, owner grant, or Veritas permission.
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {DesktopAdapter} from '../../apps/desktop/adapter.mjs';
import {schemas,Bridge} from '../../packages/protocol/index.mjs';
import {createServer} from '../../apps/desktop/mcp-server.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function setup(t){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'leeway-session-parity-'));
  t.after(async()=>{await delay(75);await fs.rm(root,{recursive:true,force:true,maxRetries:10,retryDelay:100});});
  return {root,adapter:new DesktopAdapter(root)};
}
async function until(predicate,limit=3000){
  for(let n=0;n<limit/25;n++){const x=await predicate();if(x)return x;await delay(25);}
  throw Error('SESSION_TEST_TIMEOUT');
}
test('five session capabilities are advertised and arguments are restricted',async t=>{
 const {adapter}=await setup(t); const caps=await adapter.discover();
 for(const op of ['start','read','input','stop','list'])
   assert.ok(caps.includes('device.session.'+op));
 assert.equal(schemas['device.session.start'].safeParse({executable:'cmd',arguments:[],cwd:'.'}).success,false);
 assert.equal(schemas['device.session.input'].safeParse({sessionId:'bad',text:'ok'}).success,false);
 assert.equal(schemas['device.session.read'].safeParse({sessionId:'bad',maxBytes:100000}).success,false);
 await assert.rejects(adapter.execute('device.session.start',{
   executable:'node',arguments:['-e','console.log(1)'],cwd:'..',timeoutMs:2000
 }),/PATH_OUTSIDE_WORKSPACE|INVALID_PATH/);
});
test('interactive round trip supports input, paged stdout/stderr and closing stdin',async t=>{
 const {adapter}=await setup(t);
 const script="process.stdin.on('data',chunk=>{process.stdout.write('ACK:'+chunk);process.stderr.write('ERR:'+chunk);});";
 const req=schemas['device.session.start'].parse({
   executable:'node',arguments:['-e',script],cwd:'.',timeoutMs:5000
 });
 const s=await adapter.execute('device.session.start',req);
 assert.equal(s.state,'RUNNING');
 assert.match(s.sessionId,/^[0-9a-f-]{36}$/);
 const queued=schemas['device.session.input'].parse({sessionId:s.sessionId,text:'hello',appendNewline:true,closeInput:true});
 const accepted=await adapter.execute('device.session.input',queued);
 assert.equal(accepted.acceptedBytes,6);
 const readReq={sessionId:s.sessionId,stdoutOffset:0,stderrOffset:0,maxBytes:4};
 const out=await until(()=>{
   const v=adapter.sessions.find(s.sessionId);
   return v.stdoutProduced>=10 && v.stderrProduced>=10;
 });
 assert.ok(out);
 const page=await adapter.execute('device.session.read',readReq);
 assert.equal(Buffer.from(page.stdout.base64,'base64').toString(),'ACK:');
 assert.equal(page.stdout.moreAvailable,true);
 assert.equal(Buffer.from(page.stderr.base64,'base64').toString(),'ERR:');
 const rest=await adapter.execute('device.session.read',{
   ...readReq,stdoutOffset:page.stdout.nextOffset,stderrOffset:page.stderr.nextOffset,maxBytes:16
 });
 assert.equal(rest.stdout.text,'hello\n');
 assert.equal(rest.stderr.text,'hello\n');
 await until(()=>adapter.sessions.find(s.sessionId).state==='EXITED');
 const listing=await adapter.execute('device.session.list',{limit:10});
 assert.ok(listing.sessions.some(x=>x.sessionId===s.sessionId&&x.state==='EXITED'));
 await assert.rejects(adapter.execute('device.session.input',{...queued,closeInput:false}),/SESSION_NOT_WRITABLE/);
});
test('session stop kills a running child and retained output requires a valid cursor',async t=>{
 const {adapter}=await setup(t);
 const req=schemas['device.session.start'].parse({executable:'node',
   arguments:['-e','process.stdout.write("started");setInterval(()=>{},1000)'],
   cwd:'.',timeoutMs:5000});
 const started=await adapter.execute('device.session.start',req);
 await until(()=>adapter.sessions.find(started.sessionId).stdoutProduced>=7);
 await assert.rejects(adapter.execute('device.session.read',{
   sessionId:started.sessionId,stdoutOffset:100,stderrOffset:0,maxBytes:20
 }),/SESSION_OUTPUT_CURSOR_EXPIRED/);
 const stopped=await adapter.execute('device.session.stop',{sessionId:started.sessionId});
 assert.ok(['STOPPING','EXITED'].includes(stopped.state));
 await until(()=>adapter.sessions.find(started.sessionId).state==='EXITED');
 const p=await adapter.execute('device.session.read',{
   sessionId:started.sessionId,stdoutOffset:0,stderrOffset:0,maxBytes:30
 });
 assert.equal(p.stdout.text,'started');
 await assert.rejects(adapter.execute('device.session.stop',{sessionId:'5b52460e-f0a5-4ff5-90de-c1e02fc47d79'}),/UNKNOWN_SESSION/);
});
test('output ring is bounded and stale cursor fails rather than returning false history',async t=>{
 const {adapter}=await setup(t);
 const req=schemas['device.session.start'].parse({executable:'node',
  arguments:['-e','process.stdout.write("A".repeat(290000))'],
  cwd:'.',timeoutMs:8000});
 const started=await adapter.execute('device.session.start',req);
 await until(()=>adapter.sessions.find(started.sessionId).state==='EXITED',5000);
 const saved=adapter.sessions.find(started.sessionId);
 assert.equal(saved.stdoutProduced,290000);
 assert.ok(saved.stdoutBuffer.length<=262144);
 await assert.rejects(adapter.execute('device.session.read',{
   sessionId:started.sessionId,stdoutOffset:0,stderrOffset:0,maxBytes:16384
 }),/SESSION_OUTPUT_CURSOR_EXPIRED/);
 const cursor=saved.stdoutProduced-saved.stdoutBuffer.length;
 const page=await adapter.execute('device.session.read',{
   sessionId:started.sessionId,stdoutOffset:cursor,stderrOffset:0,maxBytes:16384
 });
 assert.equal(page.stdout.nextOffset,cursor+16384);
 assert.equal(page.stdout.text,'A'.repeat(16384));
});
test('production-default MCP rejects interactive command and never starts a child',async t=>{
 const {adapter}=await setup(t);
 const device={id:'parity-host',grants:['device.session.start','device.session.list'],adapter};
 const server=createServer(new Bridge([device],{receiptSink:async()=>{}}));
 const client=new Client({name:'parity-session-test',version:'1.0'});
 const [a,b]=InMemoryTransport.createLinkedPair();
 t.after(()=>Promise.all([client.close(),server.close()]));
 await server.connect(b);await client.connect(a);
 const listing=(await client.listTools()).tools.map(x=>x.name);
 for(const op of ['start','read','input','stop','list'])assert.ok(listing.includes('device_session_'+op));
 const res=await client.callTool({name:'device_session_start',arguments:{
   deviceId:device.id,arguments:{executable:'node',arguments:['-e','console.log(1)'],cwd:'.',timeoutMs:5000}}});
 assert.equal(JSON.parse(res.content[0].text).error,'ADMISSION_DENIED');
 assert.equal(adapter.sessions.sessions.size,0);
});

