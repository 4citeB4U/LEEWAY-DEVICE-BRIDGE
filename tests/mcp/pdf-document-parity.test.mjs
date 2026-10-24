/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.DESKTOP
TAG: LEEWAY.BOUNDED_PDF_CREATE_ONLY_ACCEPTANCE_V1
WHO: LeeWay Industries; WHAT: verify local text-to-PDF creation and fail-closed admission.
WHEN: 2026-10-24; WHERE: tests/mcp/pdf-document-parity.test.mjs.
WHY: Desktop Commander reference exposes write_pdf; use locally installed ReportLab.
HOW: Temp workspace, PDF structural check, PyMuPDF readback when installed, negative paths.
AUTHORITY: SYNTHETIC_TEST_ONLY. No production PDF or real device command issued.
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {DesktopAdapter} from '../../apps/desktop/adapter.mjs';
import {schemas,Bridge} from '../../packages/protocol/index.mjs';
import {createServer} from '../../apps/desktop/mcp-server.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'leeway-pdf-parity-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true,maxRetries:5,retryDelay:100}));
 return {root,adapter:new DesktopAdapter(root)};
}
test('bounded PDF creation writes valid PDF bytes and never replaces a user file',async t=>{
 const {root,adapter}=await fixture(t);
 const req=schemas['device.documents.write_pdf'].parse({
   path:'report.pdf',title:'LeeWay PDF',text:'Hello from Agent Lee\nFormula valid source'});
 const created=await adapter.execute('device.documents.write_pdf',req);
 assert.equal(created.created,true);
 const bytes=await fs.readFile(path.join(root,'report.pdf'));
 assert.equal(created.sha256,sha(bytes));
 assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
 assert.ok(bytes.subarray(-1024).includes(Buffer.from('%%EOF')));
 assert.equal(created.independentProductionVerified,false);
 await assert.rejects(adapter.execute('device.documents.write_pdf',req),/EEXIST/);
 assert.equal(schemas['device.documents.write_pdf'].safeParse({path:'../bad.pdf',text:'x'}).success,true);
 await assert.rejects(adapter.execute('device.documents.write_pdf',{...req,path:'../bad.pdf'}),/INVALID_PATH|PATH_OUTSIDE_WORKSPACE/);
 const probe=spawnSync('python',['-I','-c',
   'import fitz,sys;doc=fitz.open(sys.argv[1]);print("\\n".join(page.get_text() for page in doc))',
   path.join(root,'report.pdf')],{encoding:'utf8',timeout:5000});
 if(probe.status===0) assert.match(probe.stdout,/Hello from Agent Lee/);
 else t.diagnostic('PDF structural tests pass; independent PyMuPDF text readback unavailable on this host');
});
test('MCP lists PDF writing but refuses operation without production authority',async t=>{
 const {root,adapter}=await fixture(t);
 const server=createServer(new Bridge([{id:'pdf-host',grants:['device.documents.write_pdf'],adapter}],
  {receiptSink:async()=>{}}));
 const client=new Client({name:'pdf-test',version:'1.0'});
 const [a,b]=InMemoryTransport.createLinkedPair();
 t.after(()=>Promise.all([client.close(),server.close()]));
 await server.connect(b);await client.connect(a);
 const listing=(await client.listTools()).tools.map(x=>x.name);
 assert.ok(listing.includes('device_documents_write_pdf'));
 const r=await client.callTool({name:'device_documents_write_pdf',arguments:{
  deviceId:'pdf-host',arguments:{path:'report.pdf',text:'should not create',title:''}}});
 assert.equal(JSON.parse(r.content[0].text).error,'ADMISSION_DENIED');
 await assert.rejects(fs.stat(path.join(root,'report.pdf')),{code:'ENOENT'});
});
