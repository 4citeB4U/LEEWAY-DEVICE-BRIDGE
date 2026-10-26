/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.SKILLS.TEST
TAG: LEEWAY.SKILLS.INVOKE_FAIL_CLOSED
5WH: WHAT = Qualify fail-closed skills.invoke protocol before production enrollment.
WHY = Existing reference-only adapter must not accidentally execute newly registered capability.
WHO = LeeWay Industries; Leonard Jerome Lee.
WHERE = tests/mcp/skills-invoke-boundary.test.mjs; WHEN = 2026-10-25.
HOW = Node native tests, synthetic bridge and receipt sink.
AUTHORITY: TEST_ONLY. LICENSE: MIT.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import {Bridge,schemas} from '../../packages/protocol/index.mjs';
const args={requestId:'invoke-0001',developerId:'developer-001',skillIds:['leeway-rea-reverse-engineering'],planSha256:'a'.repeat(64),nonce:'b'.repeat(64)};
test('strict invocation schema rejects unknown fields and invalid identifiers',()=>{
 assert.equal(schemas['skills.invoke'].safeParse(args).success,true);
 assert.equal(schemas['skills.invoke'].safeParse({...args,extra:true}).success,false);
 assert.equal(schemas['skills.invoke'].safeParse({...args,skillIds:['../escape']}).success,false);
});
test('registered capability cannot execute without independent admission',async()=>{
 let calls=0;
 const bridge=new Bridge([{id:'device-001',grants:['skills.invoke'],adapter:{discover:async()=>['skills.invoke'],execute:async()=>{calls++;return {ok:true}}}}],{receiptSink:async()=>{}});
 const result=await bridge.call('device-001','skills.invoke',args);
 assert.equal(result.ok,false);
 assert.equal(result.error,'ADMISSION_DENIED');
 assert.equal(calls,0);
});
test('even synthetic admission cannot dispatch without qualified skills.invoke adapter',async()=>{
 let calls=0;
 const bridge=new Bridge([{id:'device-001',grants:['skills.invoke'],adapter:{discover:async()=>['skills.list','skills.read'],execute:async()=>{calls++;return {ok:true}}}}],{admission:async()=>true,receiptSink:async()=>{}});
 const result=await bridge.call('device-001','skills.invoke',args);
 assert.equal(result.ok,false);
 assert.equal(result.error,'CAPABILITY_UNAVAILABLE');
 assert.equal(calls,0);
});
