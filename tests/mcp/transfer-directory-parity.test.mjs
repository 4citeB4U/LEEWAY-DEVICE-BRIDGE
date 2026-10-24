/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.DESKTOP
TAG: LEEWAY.RESTART_RESUMABLE_BINARY_TRANSFER_AND_DIR_PAGING_TEST_V1
WHO: LeeWay Industries; WHAT: Verify resumable append and directory snapshots.
WHEN: 2026-10-24; WHERE: tests/mcp/transfer-directory-parity.test.mjs.
WHY: File parity must preserve bytes and never silently replay after reconnection.
HOW: Disposable fixtures, two independent adapter instances, SHA cursor tamper tests.
AUTHORITY: SYNTHETIC_TEST_ONLY; no production device action.
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {DesktopAdapter} from '../../apps/desktop/adapter.mjs';
import {schemas,Bridge} from '../../packages/protocol/index.mjs';
import {createServer} from '../../apps/desktop/mcp-server.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
const sha=b=>createHash('sha256').update(b).digest('hex');
async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'leeway-transfer-test-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true,maxRetries:5,retryDelay:100}));
 return {root,adapter:new DesktopAdapter(root)};
}
test('SHA-bound binary append survives adapter reconstruction; stale replay denied',async t=>{
 const {root,adapter}=await fixture(t);
 const first=Buffer.from([0,1,2,255]);
 const second=Buffer.from([5,6,0,13,10,255,252]);
 const name='transfer.dat';
 await adapter.execute('device.files.write_binary',
  schemas['device.files.write_binary'].parse({path:name,base64:first.toString('base64'),expectedSha256:sha(first)}));
 const args={path:name,base64:second.toString('base64'),expectedOffset:first.length,expectedSha256:sha(first),expectedChunkSha256:sha(second)};
 const nextAdapter=new DesktopAdapter(root);
 const committed=await nextAdapter.execute('device.files.append_binary',schemas['device.files.append_binary'].parse(args));
 assert.equal(committed.sizeBytes,first.length+second.length);
 assert.equal(committed.sha256,sha(Buffer.concat([first,second])));
 assert.deepEqual(await fs.readFile(path.join(root,name)),Buffer.concat([first,second]));
 await assert.rejects(nextAdapter.execute('device.files.append_binary',args),/TRANSFER_OFFSET_OR_HASH_MISMATCH/);
 await assert.rejects(nextAdapter.execute('device.files.append_binary',{...args,expectedOffset:11,expectedSha256:committed.sha256,expectedChunkSha256:sha('wrong')}),/TRANSFER_CHUNK_HASH_MISMATCH/);
 const status=await new DesktopAdapter(root).execute('device.files.hash',{path:name});
 assert.equal(status.sha256,committed.sha256);
 const range=await new DesktopAdapter(root).execute('device.files.read_binary',{path:name,offset:4,length:16});
 assert.equal(range.base64,second.toString('base64'));
});
test('exclusive append lock fails closed and preserves original',async t=>{
 const {root,adapter}=await fixture(t);
 await fs.writeFile(path.join(root,'lock.dat'),'seed');
 await fs.writeFile(path.join(root,'lock.dat.leeway-append.lock'),'existing lock');
 const args={path:'lock.dat',base64:Buffer.from('add').toString('base64'),
  expectedOffset:4,expectedSha256:sha('seed'),expectedChunkSha256:sha('add')};
 await assert.rejects(adapter.execute('device.files.append_binary',args),/EEXIST/);
 assert.equal(await fs.readFile(path.join(root,'lock.dat'),'utf8'),'seed');
 assert.equal(schemas['device.files.append_binary'].safeParse({...args,expectedOffset:-1}).success,false);
});
test('directory pagination detects changed snapshots before returning stale page',async t=>{
 const {root,adapter}=await fixture(t);
 for(const name of ['a.txt','b.txt','c.txt','d.txt'])await fs.writeFile(path.join(root,name),name);
 const first=await adapter.execute('device.directories.page',schemas['device.directories.page'].parse({path:'.',offset:0,limit:2}));
 assert.deepEqual(first.entries.map(x=>x.name),['a.txt','b.txt']);
 assert.equal(first.moreAvailable,true);
 const second=await new DesktopAdapter(root).execute('device.directories.page',{
  path:'.',offset:first.nextOffset,limit:3,expectedSnapshotSha256:first.snapshotSha256
 });
 assert.deepEqual(second.entries.map(x=>x.name),['c.txt','d.txt']);
 await fs.writeFile(path.join(root,'new.txt'),'new');
 await assert.rejects(adapter.execute('device.directories.page',{
  path:'.',offset:second.nextOffset,limit:3,expectedSnapshotSha256:first.snapshotSha256
 }),/DIRECTORY_SNAPSHOT_CHANGED/);
 assert.equal(schemas['device.directories.page'].safeParse({path:'.',limit:1000}).success,false);
});
test('MCP parity capabilities are advertised yet cannot perform actions without C3 approval',async t=>{
 const {root,adapter}=await fixture(t);
 await fs.writeFile(path.join(root,'readonly.dat'),'seed');
 const devices=[{id:'transfer-host',grants:['device.files.append_binary','device.directories.page'],adapter}];
 const server=createServer(new Bridge(devices,{receiptSink:async()=>{}}));
 const client=new Client({name:'transfer-parity',version:'1.0.0'});
 const [a,b]=InMemoryTransport.createLinkedPair();
 t.after(()=>Promise.all([client.close(),server.close()]));
 await server.connect(b);await client.connect(a);
 const names=(await client.listTools()).tools.map(x=>x.name);
 assert.ok(names.includes('device_files_append_binary'));
 assert.ok(names.includes('device_directories_page'));
 const r=await client.callTool({name:'device_directories_page',arguments:{
  deviceId:'transfer-host',arguments:{path:'.',offset:0,limit:10}}});
 assert.equal(JSON.parse(r.content[0].text).error,'ADMISSION_DENIED');
});
