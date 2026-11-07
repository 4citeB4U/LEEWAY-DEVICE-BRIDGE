import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntimeComplianceCardIntegration } from '../../operator/runtime-compliance-card-provider.mjs';

const manifest = {
  rootObjectId: 'LACF.ROOT.001.LEEWAY_AGENTIC_COMMUNICATIONS_FABRIC',
  receiptRoot: 'receipts/runtime-enforcement',
  actionTypes: ['tool.execution', 'voice.claim', 'service.health', 'gpu.claim'],
  requiredComplianceCardFields: [
    'agentId','taskId','action','reason','rootObjectId','channelObjectId','sourceObjectId',
    'governancePolicy','telemetryKey','verificationMode','proofCommand','receiptPath','riskLevel','failureMode',
  ],
  channels: {
    'LACF.CHANNEL.001.LEEWAY_VOICE': { governancePolicy:'LEEWAY_L2_VOICE_ADMISSION_POLICY', telemetryKey:'L8.LEEWAY.VOICE.PULSE', verificationMode:'VOICEPRINT_PROOF' },
    'LACF.CHANNEL.003.LEEWAY_DATA': { governancePolicy:'LEEWAY_L2_DATA_ADMISSION_POLICY', telemetryKey:'L8.LEEWAY.DATA.PULSE', verificationMode:'SIGNATURE_REQUIRED' },
    'LACF.CHANNEL.005.LEEWAY_GPU': { governancePolicy:'LEEWAY_L2_GPU_ADMISSION_POLICY', telemetryKey:'L8.LEEWAY.GPU.PULSE', verificationMode:'GPU_PROOF' },
    'LACF.CHANNEL.006.LEEWAY_TELEMETRY': { governancePolicy:'LEEWAY_L2_TELEMETRY_ADMISSION_POLICY', telemetryKey:'L8.LEEWAY.TELEMETRY.PULSE', verificationMode:'DETERMINISTIC_CHECKSUM' },
    'LACF.CHANNEL.007.LEEWAY_GOVERNANCE': { governancePolicy:'LEEWAY_L2_GOVERNANCE_ADMISSION_POLICY', telemetryKey:'L8.LEEWAY.GOVERNANCE.PULSE', verificationMode:'SIGNATURE_REQUIRED' },
  },
};

test('trusted provider scopes voice status and speech cards from Runtime manifest', async () => {
  const integration = createRuntimeComplianceCardIntegration({
    baseUrl:'http://127.0.0.1:4011',manifest,idFactory:()=> 'fixed-id',
    fetchImpl:async()=>{ throw new Error('gate-not-used'); },
  });
  const status = await integration.complianceCardProvider({deviceId:'pc-primary',capability:'voice.status',args:{}});
  assert.equal(status.action,'service.health');
  assert.equal(status.channelObjectId,'LACF.CHANNEL.006.LEEWAY_TELEMETRY');
  assert.equal(status.verificationMode,'DETERMINISTIC_CHECKSUM');
  const speak = await integration.complianceCardProvider({deviceId:'pc-primary',capability:'voice.speak',args:{text:'hello'}});
  assert.equal(speak.action,'voice.claim');
  assert.equal(speak.channelObjectId,'LACF.CHANNEL.001.LEEWAY_VOICE');
  assert.equal(speak.verificationMode,'VOICEPRINT_PROOF');
  assert.equal(speak.riskLevel,'MEDIUM');
  assert.equal(speak.failureMode,'FAIL_CLOSED');
  for(const card of [status,speak]) {
    for(const field of manifest.requiredComplianceCardFields) assert.ok(String(card[field]||'').trim(),field);
    assert.equal(Object.hasOwn(card,'valid'),false,'the provider does not self-assert Runtime validity');
  }
});

test('Runtime gate marks a card valid only after exact manifest-backed readback', async () => {
  let request;
  const integration = createRuntimeComplianceCardIntegration({
    baseUrl:'http://127.0.0.1:4011',manifest,idFactory:()=> 'gate-id',
    fetchImpl:async(url,init)=>{
      request={url:String(url),init,body:JSON.parse(init.body)};
      return {ok:true,json:async()=>({valid:true,card:request.body.leewayComplianceCard})};
    },
  });
  const card=await integration.complianceCardProvider({deviceId:'pc-primary',capability:'voice.speak',args:{text:'hello'}});
  const decision=await integration.complianceCardGate({complianceCard:card,deviceId:'pc-primary',capability:'voice.speak',args:{text:'hello'}});
  assert.equal(decision.valid,true);
  assert.equal(decision.authority,'LEEWAY_RUNTIME_FABRIC');
  assert.equal(request.url,'http://127.0.0.1:4011/runtime/validate-object-chain');
  assert.deepEqual(request.body,{leewayComplianceCard:card});
  const mismatched=createRuntimeComplianceCardIntegration({
    baseUrl:'http://127.0.0.1:4011',manifest,
    fetchImpl:async()=>({ok:true,json:async()=>({valid:true,card:{...card,action:'tool.execution'}})}),
  });
  assert.equal(await mismatched.complianceCardGate({complianceCard:card}),false);
});
