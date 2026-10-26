/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.DESKTOP
TAG: LEEWAY.DESKTOP_PARITY_BATCH3_ACCEPTANCE_V1
WHO: LeeWay Industries reviewer.
WHAT: File move, exact text edit, SHA256 and binary range/create acceptance.
WHEN: 2026-10-24; WHERE: tests/mcp/desktop-parity-batch3.test.mjs.
WHY: Prove bounded Desktop Commander parity without production authorization.
HOW: Disposable workspace with invalid-input, no-overwrite and MCP fail-closed tests.
AUTHORITY: SYNTHETIC_FIXTURES_ONLY; never owner consent, Formula or independent Veritas.
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
const batch=['device.files.hash','device.files.read_binary','device.files.write_binary','device.files.move','device.files.edit'];
async function fixture(t){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'leeway-dc-parity3-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true,maxRetries:4,retryDelay:100}));
  return {root,adapter:new DesktopAdapter(root)};
}
test('all five bounded file capabilities are advertised and schemas reject overflow',async t=>{
  const {adapter}=await fixture(t);
  const listed=await adapter.discover();
  for(const name of batch){assert.ok(listed.includes(name),name);assert.ok(schemas[name],name);}
  assert.equal(schemas['device.files.read_binary'].safeParse({path:'a',length:262145}).success,false);
  assert.equal(schemas['device.files.move'].safeParse({from:'a',to:'b',expectedSha256:'bad'}).success,false);
  assert.equal(schemas['device.files.edit'].safeParse({path:'a',oldText:'',newText:'z',expectedReplacements:1,expectedSha256:sha('a')}).success,false);
});
test('binary range reading and create-only write preserve bytes and disallow malformed digests',async t=>{
  const {root,adapter}=await fixture(t);
  const bytes=Buffer.from([0,255,254,1,8,10,65,20]);
  const digest=sha(bytes);
  const parsed=schemas['device.files.write_binary'].parse({path:'bytes.dat',base64:bytes.toString('base64'),expectedSha256:digest});
  const created=await adapter.execute('device.files.write_binary',parsed);
  assert.equal(created.created,true);
  assert.equal(created.sha256,digest);
  assert.deepEqual(await fs.readFile(path.join(root,'bytes.dat')),bytes);
  await assert.rejects(adapter.execute('device.files.write_binary',parsed),/EEXIST/);
  await assert.rejects(adapter.execute('device.files.write_binary',{...parsed,path:'bad.dat',expectedSha256:sha('other')}),/BINARY_DIGEST_MISMATCH/);
  await assert.rejects(adapter.execute('device.files.write_binary',{...parsed,path:'bad.dat',base64:'----'}),/INVALID_BASE64/);
  const part=await adapter.execute('device.files.read_binary',{path:'bytes.dat',offset:2,length:3});
  assert.equal(part.base64,bytes.subarray(2,5).toString('base64'));
  assert.equal(part.chunkSha256,sha(bytes.subarray(2,5)));
  assert.equal(part.eof,false);
  const tail=await adapter.execute('device.files.read_binary',{path:'bytes.dat',offset:7,length:10});
  assert.equal(tail.eof,true);
  assert.equal(tail.length,1);
  const hash=await adapter.execute('device.files.hash',{path:'bytes.dat'});
  assert.equal(hash.sha256,digest);
  assert.equal(hash.size,8);
  await assert.rejects(adapter.execute('device.files.read_binary',{path:'../bad',offset:0,length:3}),/INVALID_PATH|OUTSIDE_WORKSPACE/);
  await assert.rejects(adapter.execute('device.files.read_binary',{path:'bytes.dat',offset:9,length:3}),/OFFSET_OUTSIDE_FILE/);
});
test('move rejects overwrite, modified source and linked source, then moves exact bytes',async t=>{
  const {root,adapter}=await fixture(t);
  await fs.writeFile(path.join(root,'source.txt'),'original');
  await fs.writeFile(path.join(root,'occupied.txt'),'existing');
  const digest=sha('original');
  const args={from:'source.txt',to:'moved.txt',expectedSha256:digest};
  await assert.rejects(adapter.execute('device.files.move',{...args,expectedSha256:sha('wrong')}),/SOURCE_CHANGED|FILE_VERSION_MISMATCH/);
  await assert.rejects(adapter.execute('device.files.move',{...args,to:'occupied.txt'}),/EEXIST|TARGET_ALREADY_EXISTS/);
  assert.equal(await fs.readFile(path.join(root,'occupied.txt'),'utf8'),'existing');
  const moved=await adapter.execute('device.files.move',args);
  assert.equal(moved.moved,true);
  await assert.rejects(fs.stat(path.join(root,'source.txt')),{code:'ENOENT'});
  assert.equal(await fs.readFile(path.join(root,'moved.txt'),'utf8'),'original');
  await assert.rejects(adapter.execute('device.files.move',{from:'moved.txt',to:'moved.txt',expectedSha256:digest}),/SOURCE_EQUALS_DESTINATION|SAME_SOURCE_AND_TARGET/);
  try{
    await fs.link(path.join(root,'moved.txt'),path.join(root,'linked.txt'));
    await assert.rejects(adapter.execute('device.files.move',{from:'moved.txt',to:'another.txt',expectedSha256:digest}),/LINK_NOT_ALLOWED/);
  }catch(e){if(!['EPERM','EACCES'].includes(e.code))throw e;}
});
test('exact-block edit requires current SHA and exact replacement count; rejects invalid UTF8',async t=>{
  const {root,adapter}=await fixture(t);
  const initial='hello world\nhello moon\n';
  await fs.writeFile(path.join(root,'note.txt'),initial);
  const base={path:'note.txt',oldText:'hello',newText:'LeeWay',expectedReplacements:2,expectedSha256:sha(initial)};
  await assert.rejects(adapter.execute('device.files.edit',{...base,expectedReplacements:1}),/EDIT_MATCH_COUNT_MISMATCH/);
  await assert.rejects(adapter.execute('device.files.edit',{...base,expectedSha256:sha('wrong')}),/EDIT_SOURCE_CHANGED/);
  const done=await adapter.execute('device.files.edit',base);
  assert.equal(done.replacements,2);
  assert.equal(await fs.readFile(path.join(root,'note.txt'),'utf8'),'LeeWay world\nLeeWay moon\n');
  await assert.rejects(adapter.execute('device.files.edit',base),/EDIT_SOURCE_CHANGED/);
  await fs.writeFile(path.join(root,'invalid.bin'),Buffer.from([0xff,0xfe]));
  await assert.rejects(adapter.execute('device.files.edit',{...base,path:'invalid.bin',oldText:'x',expectedReplacements:1,expectedSha256:sha(Buffer.from([0xff,0xfe]))}),/encoded|encoding|valid|UTF/i);
});
test('MCP exposes all five tools but the default missing authority denies execution',async t=>{
  const {root,adapter}=await fixture(t);
  await fs.writeFile(path.join(root,'read.txt'),'test');
  const device={id:'dc-parity-host',grants:batch,adapter};
  const server=createServer(new Bridge([device],{receiptSink:async()=>{}}));
  const client=new Client({name:'leeway-parity3-test',version:'1.0.0'});
  const [a,b]=InMemoryTransport.createLinkedPair();
  t.after(()=>Promise.all([client.close(),server.close()]));
  await server.connect(b);await client.connect(a);
  const tools=(await client.listTools()).tools.map(x=>x.name);
  for(const name of batch)assert.ok(tools.includes(name.replaceAll('.','_')),name);
  const res=await client.callTool({name:'device_files_move',arguments:{deviceId:device.id,arguments:{from:'read.txt',to:'moved.txt',expectedSha256:sha('test')}}});
  assert.equal(JSON.parse(res.content[0].text).error,'ADMISSION_DENIED');
  assert.equal(await fs.readFile(path.join(root,'read.txt'),'utf8'),'test');
});
