/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.DESKTOP
TAG: LEEWAY.LOCAL_AUDIT_READBACK_USAGE_ACCEPTANCE_V1
WHO: LeeWay Industries; WHAT: protected read-only usage/history source qualification.
WHEN: 2026-10-24; WHERE: tests/mcp/audit-history-parity.test.mjs.
WHY: Desktop Commander parity includes recent calls and usage, without false Veritas.
HOW: Disposable JSONL, redacted schema, source tamper, MCP missing-authority tests.
AUTHORITY: CONTROLLER_OBSERVATION_ONLY. Not a production audit or authorization.
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {receipt,schemas,Bridge} from '../../packages/protocol/index.mjs';
import {DesktopAdapter} from '../../apps/desktop/adapter.mjs';
import {createServer} from '../../apps/desktop/mcp-server.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'leeway-audit-test-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const auditPath=path.join(root,'audit.jsonl');
 const records=[
  receipt({deviceId:'pc',capability:'device.info',args:{},outcome:'ADMITTED'}),
  receipt({deviceId:'pc',capability:'device.info',args:{},outcome:'PASS',result:{ok:true}}),
  receipt({deviceId:'pc',capability:'device.files.read',args:{path:'private-secret.txt'},outcome:'BLOCKED',error:'ADMISSION_DENIED'})
 ];
 await fs.writeFile(auditPath,records.map(x=>JSON.stringify(x)).join('\n')+'\n');
 return {root,auditPath,records,adapter:new DesktopAdapter(root,{receiptPath:auditPath})};
}
test('recent command history is bounded, sanitized and explicitly unverified',async t=>{
 const {adapter,records}=await fixture(t);
 const rows=await adapter.execute('device.audit.recent',
  schemas['device.audit.recent'].parse({offset:0,limit:2}));
 assert.equal(rows.records.length,2);
 assert.equal(rows.records[0].controllerReceiptSha256,records[2].sha256);
 assert.equal(rows.moreAvailable,true);
 assert.equal(rows.authority,'CONTROLLER_OBSERVATION_UNVERIFIED');
 assert.equal(rows.records[0].independentVeritasVerified,false);
 assert.ok(!JSON.stringify(rows.records).includes('private-secret.txt'));
 const next=await adapter.execute('device.audit.recent',{offset:2,limit:2});
 assert.equal(next.records[0].controllerReceiptSha256,records[0].sha256);
 const counts=await adapter.execute('device.audit.usage',{});
 assert.equal(counts.observedEvents,3);
 assert.deepEqual(counts.sampledOutcomeCounts,{ADMITTED:1,PASS:1,BLOCKED:1});
 assert.equal(counts.fullHistoryVerified,false);
});
test('malformed audit record cannot be reported as a trusted history result',async t=>{
 const {adapter,auditPath}=await fixture(t);
 await fs.appendFile(auditPath,'not-json\n');
 await assert.rejects(adapter.execute('device.audit.recent',{offset:0,limit:20}),/AUDIT_RECORD_MALFORMED/);
 const absent=new DesktopAdapter(path.dirname(auditPath),{receiptPath:path.join(path.dirname(auditPath),'missing.jsonl')});
 assert.equal((await absent.execute('device.audit.usage',{})).sourceState,'RECEIPT_FILE_NOT_YET_CREATED');
});
test('MCP can discover history tools but protected access remains denied',async t=>{
 const {adapter}=await fixture(t);
 const dev={id:'audit-host',grants:['device.audit.recent','device.audit.usage'],adapter};
 const server=createServer(new Bridge([dev],{receiptSink:async()=>{}}));
 const client=new Client({name:'audit-test',version:'1.0'});
 const [a,b]=InMemoryTransport.createLinkedPair();
 t.after(()=>Promise.all([client.close(),server.close()]));
 await server.connect(b);await client.connect(a);
 const names=(await client.listTools()).tools.map(x=>x.name);
 assert.ok(names.includes('device_audit_recent'));assert.ok(names.includes('device_audit_usage'));
 const r=await client.callTool({name:'device_audit_recent',
   arguments:{deviceId:dev.id,arguments:{offset:0,limit:2}}});
 assert.equal(JSON.parse(r.content[0].text).error,'ADMISSION_DENIED');
});
