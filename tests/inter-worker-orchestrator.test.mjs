import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { dispatchAndAuditWorkerTurn } from '../operator/inter-worker-orchestrator.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');

test('orchestrator uses the canonical device-scoped Bridge contract', async () => {
  const calls=[];
  const bridge={call:async(deviceId,capability,args)=>{
    calls.push({deviceId,capability,args});
    if(capability==='device.windows.window.list')return{windows:[{pid:12052,title:'Visual Studio Code'}]};
    if(capability==='device.windows.window.observe')return{
      observationId:'11111111-1111-4111-8111-111111111111',
      editableTargets:[{targetId:'22222222-2222-4222-8222-222222222222',name:'Chat Input'}],
      actionTargets:[{targetId:'33333333-3333-4333-8333-333333333333',name:'Send'}],
    };
    if(capability==='device.windows.window.input')return{textSha256:hash(args.text)};
    if(capability==='device.windows.window.submit')return{submitted:true};
    if(capability==='device.windows.window.read')return{responseText:`FACT operator/file.mjs:42 NONCE ${args.responseNonce}`};
    throw new Error('UNEXPECTED_CAPABILITY');
  }};
  const result=await dispatchAndAuditWorkerTurn({bridge,deviceId:'portable-node-1',fromWorker:'w-codex',toWorker:'w-copilot',promptText:'Review the bridge.'});
  assert.equal(result.status,'EVIDENCE_SHAPE_ACCEPTED_PENDING_INDEPENDENT_VERITAS');
  assert.deepEqual(calls.map(value=>value.capability),[
    'device.windows.window.list','device.windows.window.observe','device.windows.window.input',
    'device.windows.window.submit','device.windows.window.read',
  ]);
  assert.ok(calls.every(value=>value.deviceId==='portable-node-1'));
  assert.equal(calls[2].args.observationId,'11111111-1111-4111-8111-111111111111');
  assert.equal(calls[3].args.expectedTextSha256,calls[2].args.text ? hash(calls[2].args.text) : null);
});

test('orchestrator refuses ambiguous worker windows before mutation',async()=>{
  const bridge={call:async()=>({windows:[{pid:1},{pid:2}]})};
  await assert.rejects(()=>dispatchAndAuditWorkerTurn({bridge,deviceId:'node',fromWorker:'a',toWorker:'b',promptText:'x'}),/WORKER_WINDOW_NOT_UNIQUE/);
});
