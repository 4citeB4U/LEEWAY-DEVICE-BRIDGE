/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.TESTS
TAG: LEEWAY.DEVICE.BRIDGE.TESTS.NOTEBOOK.CAPABILITY
5WH:
WHAT = Exercise fail-closed NotebookLM capability adapter behavior.
WHY = Prevent bypass of explicit scope, owner authorization and verified host session.
WHO = LeeWay Device Bridge test suite under Standards.
WHERE = operator/notebook/notebook-capability-adapter.test.mjs.
WHEN = 2026-10-27.
HOW = Node built-in tests with fake host adapters; no real NotebookLM execution.
LICENSE: MIT.
AUTHORITY: Synthetic source tests only, not production admission or independent Veritas.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import {createNotebookCapabilityAdapter,NOTEBOOK_ALLOWED_OPERATIONS} from './notebook-capability-adapter.mjs';
const id='93b590b7-4df5-44c6-a963-948b8f29de18';
const base={operation:'notebook.status',notebookId:id,requestId:'notebook-test-0001'};
const factories=(overrides={})=>{
  let executions=0;
  const adapter=createNotebookCapabilityAdapter({
    sessionBinding:async()=>({verified:true,notebookId:id}),
    authorize:async()=>true,
    execute:async()=>{executions++;return {executed:true,evidence:{class:'SYNTHETIC'}}},
    ...overrides
  });
  return {adapter,get executions(){return executions;}};
};
test('only four recognized operations and absent adapter fails closed',()=>{
  assert.deepEqual(NOTEBOOK_ALLOWED_OPERATIONS,['notebook.status','notebook.prompt','notebook.studio.capture','notebook.studio.generate']);
  assert.throws(()=>createNotebookCapabilityAdapter(),/NOTEBOOK_ADAPTER_UNBOUND/);
});
test('verified synthetic status preserves independent evidence truth',async()=>{
  const f=factories();
  const out=await f.adapter.invoke(base);
  assert.equal(out.state,'EXECUTION_OBSERVED_UNVERIFIED');
  assert.equal(out.veritas,'NOT_RUN');
  assert.equal(out.receipt,'NOT_VERIFIED');
  assert.equal(f.executions,1);
});
test('unknown operation is refused before execution',async()=>{
  const f=factories();
  await assert.rejects(f.adapter.invoke({...base,operation:'notebook.admin'}),/NOT_QUALIFIED/);
  assert.equal(f.executions,0);
});
test('invalid id or missing request identifier is refused',async()=>{
  const f=factories();
  await assert.rejects(f.adapter.invoke({...base,notebookId:'../../../etc'}),/NOTEBOOK_ID_INVALID/);
  await assert.rejects(f.adapter.invoke({...base,requestId:''}),/NOTEBOOK_REQUEST_ID_INVALID/);
  assert.equal(f.executions,0);
});
test('unverified notebook session cannot execute',async()=>{
  const f=factories({sessionBinding:async()=>({verified:false,notebookId:id})});
  await assert.rejects(f.adapter.invoke(base),/NOTEBOOK_SESSION_NOT_VERIFIED/);
  assert.equal(f.executions,0);
});
test('denied host authorization cannot execute',async()=>{
  const f=factories({authorize:async()=>false});
  await assert.rejects(f.adapter.invoke(base),/NOTEBOOK_ACTION_NOT_AUTHORIZED/);
  assert.equal(f.executions,0);
});
test('prompt needs explicit owner-approved scope even when host authorizes',async()=>{
  const f=factories();
  await assert.rejects(f.adapter.invoke({...base,operation:'notebook.prompt',arguments:{prompt:'Summarize LeeWay'}}),/OWNER_APPROVAL_REQUIRED/);
  assert.equal(f.executions,0);
  const result=await f.adapter.invoke({...base,operation:'notebook.prompt',arguments:{prompt:'Summarize LeeWay'},approval:{authorized:true,notebookId:id}});
  assert.equal(result.veritas,'NOT_RUN');
  assert.equal(f.executions,1);
});
test('approval for another notebook is rejected',async()=>{
  const f=factories();
  await assert.rejects(f.adapter.invoke({...base,operation:'notebook.studio.capture',approval:{authorized:true,notebookId:'different'}}),/OWNER_APPROVAL_REQUIRED/);
  assert.equal(f.executions,0);
});
test('unknown Studio output and empty prompt are rejected before host calls',async()=>{
  const f=factories();
  const approval={authorized:true,notebookId:id};
  await assert.rejects(f.adapter.invoke({...base,operation:'notebook.studio.generate',arguments:{type:'shell'},approval}),/ARTIFACT_TYPE_INVALID/);
  await assert.rejects(f.adapter.invoke({...base,operation:'notebook.prompt',arguments:{prompt:' '},approval}),/PROMPT_INVALID/);
  assert.equal(f.executions,0);
});
test('unobserved downstream execution never receives success envelope',async()=>{
  const f=factories({execute:async()=>({executed:false})});
  await assert.rejects(f.adapter.invoke(base),/NOTEBOOK_EXECUTION_NOT_OBSERVED/);
});
