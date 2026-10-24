/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.DESKTOP
TAG: LEEWAY.DESKTOP_PARITY_SEARCH_SESSIONS_ACCEPTANCE_V1
WHO: LeeWay Industries reviewer.
WHAT: Exercise persistent paged file-name/content search sessions.
WHEN: 2026-10-24; WHERE: tests/mcp/desktop-search-sessions.test.mjs.
WHY: Start/get-more/stop/list search are part of full Desktop Commander parity.
HOW: Disposable file fixtures, pagination, symlink rejection and denied production MCP.
AUTHORITY: SYNTHETIC_TEST_ONLY; does not grant Formula, owner or Veritas authority.
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
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function setup(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'leeway-search-parity-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true,maxRetries:10,retryDelay:100}));
 return {root,adapter:new DesktopAdapter(root)};
}
async function complete(adapter,id){
 for(let i=0;i<120;i++){
  const result=adapter.searchSessions.find(id);
  if(result.state!=='RUNNING')return result;
  await sleep(20);
 }
 throw Error('SEARCH_TEST_TIMEOUT');
}
test('paged file name search preserves cursor and workspace scope',async t=>{
 const {root,adapter}=await setup(t);
 for(const name of ['alpha-1.txt','alpha-2.txt','alpha-3.txt','other.txt'])
  await fs.writeFile(path.join(root,name),'testing');
 const req=schemas['device.search.start'].parse({path:'.',query:'alpha',mode:'name'});
 const started=await adapter.execute('device.search.start',req);
 const done=await complete(adapter,started.searchId);
 assert.equal(done.state,'COMPLETE');
 const page=await adapter.execute('device.search.next',schemas['device.search.next'].parse({searchId:started.searchId,offset:0,limit:2}));
 assert.equal(page.results.length,2);
 assert.equal(page.moreAvailable,true);
 const rest=await adapter.execute('device.search.next',schemas['device.search.next'].parse({searchId:started.searchId,offset:page.nextOffset,limit:2}));
 assert.equal(rest.results.length,1);
 assert.equal(rest.moreAvailable,false);
 const all=page.results.concat(rest.results).map(x=>x.path).sort();
 assert.deepEqual(all,['alpha-1.txt','alpha-2.txt','alpha-3.txt']);
 await assert.rejects(adapter.execute('device.search.next',{searchId:started.searchId,offset:10,limit:2}),/SEARCH_PAGE_OUTSIDE_RESULT/);
 await assert.rejects(adapter.execute('device.search.start',{path:'..',query:'x',mode:'name'}),/INVALID_PATH|PATH_OUTSIDE_WORKSPACE/);
});
test('content search returns lines, ignores linked outsider, and sessions can be enumerated',async t=>{
 const {root,adapter}=await setup(t);
 await fs.mkdir(path.join(root,'nested'));
 await fs.writeFile(path.join(root,'nested','data.txt'),'first\nFormula result\nlast\nFormula receipt\n');
 const outside=await fs.mkdtemp(path.join(os.tmpdir(),'leeway-search-outsider-'));
 t.after(()=>fs.rm(outside,{recursive:true,force:true}));
 await fs.writeFile(path.join(outside,'secret.txt'),'Formula SECRET');
 try{await fs.symlink(outside,path.join(root,'linked-outside'),'dir');}catch(e){if(!['EPERM','EACCES'].includes(e.code))throw e;}
 const s=await adapter.execute('device.search.start',schemas['device.search.start'].parse({path:'.',query:'Formula',mode:'content'}));
 await complete(adapter,s.searchId);
 const p=await adapter.execute('device.search.next',{searchId:s.searchId,offset:0,limit:20});
 assert.equal(p.results.length,2);
 assert.deepEqual(p.results.map(x=>x.line),[2,4]);
 assert.ok(p.results.every(x=>x.path.endsWith('data.txt')));
 const active=await adapter.execute('device.search.list',{limit:10});
 assert.ok(active.searches.some(x=>x.searchId===s.searchId));
 const ended=await adapter.execute('device.search.stop',{searchId:s.searchId});
 assert.equal(ended.state,'COMPLETE');
});
test('search cancellation is bounded and mismatched IDs never return another search',async t=>{
 const {root,adapter}=await setup(t);
 await fs.writeFile(path.join(root,'named-file.txt'),'sample');
 const started=await adapter.execute('device.search.start',{path:'.',query:'named',mode:'name'});
 const stopped=await adapter.execute('device.search.stop',{searchId:started.searchId});
 assert.ok(['CANCELLED','COMPLETE'].includes(stopped.state));
 await assert.rejects(adapter.execute('device.search.stop',{searchId:'d168ee70-8be1-4936-a9ba-d238414b416a'}),/UNKNOWN_SEARCH/);
 assert.equal(schemas['device.search.next'].safeParse({searchId:started.searchId,limit:500}).success,false);
 const stored=adapter.searchSessions.find(started.searchId);
 assert.ok(stored.matches.length<=512);
});
test('MCP exports search lifecycle but cannot execute without production authority',async t=>{
 const {adapter}=await setup(t);
 const caps=['device.search.start','device.search.next','device.search.stop','device.search.list'];
 const server=createServer(new Bridge([{id:'search-host',grants:caps,adapter}],{receiptSink:async()=>{}}));
 const client=new Client({name:'search-session-parity',version:'1.0.0'});
 const [a,b]=InMemoryTransport.createLinkedPair();
 t.after(()=>Promise.all([client.close(),server.close()]));
 await server.connect(b);await client.connect(a);
 const tools=(await client.listTools()).tools.map(x=>x.name);
 for(const name of caps)assert.ok(tools.includes(name.replaceAll('.','_')));
 const res=await client.callTool({name:'device_search_start',arguments:{
  deviceId:'search-host',arguments:{path:'.',query:'secret',mode:'content'}}});
 assert.equal(JSON.parse(res.content[0].text).error,'ADMISSION_DENIED');
 assert.equal(adapter.searchSessions.searches.size,0);
});

