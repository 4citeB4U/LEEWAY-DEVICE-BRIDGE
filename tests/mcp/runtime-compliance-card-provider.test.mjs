import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Bridge, digest } from '../../packages/protocol/index.mjs';
import { createRuntimeComplianceCardIntegration } from '../../operator/runtime-compliance-card-provider.mjs';

const require = createRequire(import.meta.url);
const runtimeValidationModule = process.env.LEEWAY_RUNTIME_CARD_VALIDATION_MODULE;
const runtimeRoot = process.env.LEEWAY_RUNTIME_ROOT;
const controlToken = 'bridge-card-test-control-token';
const createIntegration = (options = {}) => createRuntimeComplianceCardIntegration({
  controlToken,
  ...options
});
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
  const integration = createIntegration({
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
    assert.equal(card.metadata.schema,'leeway.runtime.operation-context.v1');
  }
  const colonId = await integration.complianceCardProvider({
    deviceId:'edge:primary',capability:'device.info',args:{}
  });
  assert.equal(colonId.metadata.deviceId,'edge:primary');
  assert.match(colonId.receiptPath,/edge-primary-device\.info-fixed-id\.json$/);
});

test('trusted provider requires a startup control-token binding', () => {
  assert.throws(() => createRuntimeComplianceCardIntegration({
    baseUrl:'http://127.0.0.1:4011',manifest
  }), /RUNTIME_CONTROL_TOKEN_REQUIRED/);
});

test('long device identities retain exact metadata and unique bounded receipt paths', async () => {
  const ids = [
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222'
  ];
  const integration = createIntegration({
    baseUrl:'http://127.0.0.1:4011',manifest,idFactory:()=>ids.shift()
  });
  const deviceId = `device-${'x'.repeat(121)}`;
  const cards = await Promise.all([
    integration.complianceCardProvider({deviceId,capability:'device.info',args:{}}),
    integration.complianceCardProvider({deviceId,capability:'device.info',args:{}})
  ]);
  assert.deepEqual(cards.map(card=>card.metadata.deviceId),[deviceId,deviceId]);
  const receiptPaths = cards.map(card=>card.receiptPath);
  assert.notEqual(receiptPaths[0],receiptPaths[1]);
  for (const receiptPath of receiptPaths) {
    const fileName = receiptPath.split('/').at(-1);
    assert.ok(fileName.length <= 240);
    assert.match(fileName,/-(?:11111111-1111-4111-8111-111111111111|22222222-2222-4222-8222-222222222222)\.json$/);
  }
});

test('Runtime gate marks a card valid only after exact manifest-backed readback', async () => {
  let request;
  const integration = createIntegration({
    baseUrl:'http://127.0.0.1:4011',manifest,idFactory:()=> 'gate-id',
    fetchImpl:async(url,init)=>{
      request={url:String(url),init,body:JSON.parse(init.body)};
      return {status:200,json:async()=>({valid:true,card:request.body.leewayComplianceCard})};
    },
  });
  const card=await integration.complianceCardProvider({deviceId:'pc-primary',capability:'voice.speak',args:{text:'hello'}});
  const decision=await integration.complianceCardGate({complianceCard:card,deviceId:'pc-primary',capability:'voice.speak',args:{text:'hello'}});
  assert.equal(decision.valid,true);
  assert.equal(decision.authority,'LEEWAY_RUNTIME_FABRIC');
  assert.equal(request.url,'http://127.0.0.1:4011/runtime/validate-object-chain');
  assert.deepEqual(request.body,{leewayComplianceCard:card});
  assert.equal(request.init.headers.authorization, `Bearer ${controlToken}`);
  const mismatched=createIntegration({
    baseUrl:'http://127.0.0.1:4011',manifest,
    fetchImpl:async()=>({status:200,json:async()=>({valid:true,card:{...card,action:'tool.execution'}})}),
  });
  assert.equal(await mismatched.complianceCardGate({
    complianceCard:card,deviceId:'pc-primary',capability:'voice.speak',args:{text:'hello'}
  }),false);
});

test('operation metadata mismatch fails before Runtime validation request', async () => {
  let requests = 0;
  const integration = createIntegration({
    baseUrl:'http://127.0.0.1:4011',manifest,idFactory:()=> 'context-id',
    fetchImpl:async()=>{ requests++; return {status:401}; }
  });
  const args = { text:'hello' };
  const card = await integration.complianceCardProvider({
    deviceId:'pc-primary',capability:'voice.speak',args
  });

  for (const context of [
    { deviceId:'other-device',capability:'voice.speak',args },
    { deviceId:'pc-primary',capability:'device.files.write',args },
    { deviceId:'pc-primary',capability:'voice.speak',args:{text:'changed'} },
    { deviceId:'pc-primary',capability:'voice.speak',args:undefined },
  ]) {
    assert.equal(await integration.complianceCardGate({complianceCard:card,...context}),false);
  }
  for (const metadata of [
    { ...card.metadata, schema:'v0' },
    { ...card.metadata, argumentsSha256:'A'.repeat(64) },
    { ...card.metadata, deviceId:'not/canonical' }
  ]) {
    assert.equal(await integration.complianceCardGate({
      complianceCard:{...card,metadata},deviceId:'pc-primary',capability:'voice.speak',args
    }),false);
  }
  assert.equal(await integration.complianceCardGate({
    deviceId:'pc-primary',capability:'voice.speak',args
  }),false);
  assert.equal(requests,0);
});

test('Runtime denials and unavailable responses fail closed', async () => {
  const card = await createIntegration({
    baseUrl:'http://127.0.0.1:4011',manifest,idFactory:()=> 'denial-id'
  }).complianceCardProvider({deviceId:'pc-primary',capability:'voice.speak',args:{text:'hello'}});
  for (const fetchImpl of [
    async()=>({status:428}),
    async()=>({status:503}),
    async()=>({status:201,json:async()=>({valid:true,card})}),
    async()=>({status:200,json:async()=>{throw new Error('malformed-json');}}),
    async()=>{throw new Error('connection refused');},
  ]) {
    const integration = createIntegration({
      baseUrl:'http://127.0.0.1:4011',manifest,fetchImpl
    });
    assert.equal(await integration.complianceCardGate({
      complianceCard:card,deviceId:'pc-primary',capability:'voice.speak',args:{text:'hello'}
    }),false);
  }
});

test('Runtime timeout aborts validation and fails closed', async () => {
  let aborted = false;
  const integration = createIntegration({
    baseUrl:'http://127.0.0.1:4011',manifest,timeoutMs:100,
    fetchImpl:async(_url,{signal})=>new Promise((_resolve,reject)=>{
      signal.addEventListener('abort',()=>{
        aborted = true;
        reject(new Error('aborted'));
      },{once:true});
    })
  });
  const args={text:'hello'};
  const card=await integration.complianceCardProvider({
    deviceId:'pc-primary',capability:'voice.speak',args
  });
  assert.equal(await integration.complianceCardGate({
    complianceCard:card,deviceId:'pc-primary',capability:'voice.speak',args
  }),false);
  assert.equal(aborted,true);
});

test('Runtime response card tampering fails closed', async () => {
  const integration = createIntegration({
    baseUrl:'http://127.0.0.1:4011',manifest,idFactory:()=> 'tamper-id',
    fetchImpl:async(_url,init)=>{
      const card=JSON.parse(init.body).leewayComplianceCard;
      return {status:200,json:async()=>({valid:true,card:{...card,taskId:'tampered'}})};
    }
  });
  const args={text:'hello'};
  const card=await integration.complianceCardProvider({
    deviceId:'pc-primary',capability:'voice.speak',args
  });
  assert.equal(await integration.complianceCardGate({
    complianceCard:card,deviceId:'pc-primary',capability:'voice.speak',args
  }),false);
});

test('mismatched operation context is rejected before adapter dispatch', async () => {
  let dispatched = 0;
  let validationRequests = 0;
  const integration = createIntegration({
    baseUrl:'http://127.0.0.1:4011',manifest,idFactory:()=> 'dispatch-id',
    fetchImpl:async(_url,init)=>{
      validationRequests++;
      const card=JSON.parse(init.body).leewayComplianceCard;
      return {status:200,json:async()=>({valid:true,card})};
    }
  });
  const card = await integration.complianceCardProvider({
    deviceId:'host-a',capability:'device.files.read',args:{path:'one.txt'}
  });
  const devices = ['host-a','host-b'].map(id=>({
    id,grants:['device.files.read','device.files.info'],
    adapter:{
      discover:async()=>['device.files.read','device.files.info'],
      execute:async()=>{dispatched++;return {text:'fixture'};}
    }
  }));
  const bridge = new Bridge(devices,{
    complianceCardGate:integration.complianceCardGate,
    admission:async()=>true,receiptSink:async()=>{}
  });

  for (const [deviceId,capability,args] of [
    ['host-b','device.files.read',{path:'one.txt'}],
    ['host-a','device.files.info',{path:'one.txt'}],
    ['host-a','device.files.read',{path:'two.txt'}],
  ]) {
    const result=await bridge.call(deviceId,capability,args,{complianceCard:card});
    assert.equal(result.error,'COMPLIANCE_CARD_INVALID');
    assert.equal(result.operationMayHaveExecuted,false);
  }
  assert.equal(validationRequests,0);
  assert.equal(dispatched,0);
});

test('actual Runtime handler validates device.info but missing native admission still blocks dispatch', {
  skip: runtimeValidationModule && runtimeRoot ? false : 'Runtime source worktree environment is not configured'
}, async () => {
  const {createRuntimeComplianceCardValidationHandler}=require(runtimeValidationModule);
  const handler=createRuntimeComplianceCardValidationHandler({
    rootDir:runtimeRoot,getControlToken:()=>controlToken
  });
  let requests=0;
  const server=createServer(async(req,res)=>{
    requests++;
    const chunks=[];
    for await(const chunk of req) chunks.push(chunk);
    req.body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    handler(req,{
      status(code){res.statusCode=code;return this;},
      json(body){res.setHeader('content-type','application/json');res.end(JSON.stringify(body));return this;}
    });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const {port}=server.address();
  const integration=createIntegration({
    baseUrl:`http://127.0.0.1:${port}`,manifest,idFactory:()=> 'actual-http-id'
  });

  try {
    const args={};
    const card=await integration.complianceCardProvider({
      deviceId:'pc-primary',capability:'device.info',args
    });
    const decision=await integration.complianceCardGate({
      complianceCard:card,deviceId:'pc-primary',capability:'device.info',args
    });
    assert.equal(decision.valid,true);
    assert.equal(decision.cardHash,digest(card));
    assert.equal(decision.authority,'LEEWAY_RUNTIME_FABRIC');
    assert.equal(await integration.complianceCardGate({
      complianceCard:{...card,governancePolicy:'UNTRUSTED_POLICY'},
      deviceId:'pc-primary',capability:'device.info',args
    }),false);
    assert.equal(await integration.complianceCardGate({
      deviceId:'pc-primary',capability:'device.info',args
    }),false);
    assert.equal(requests,2);

    let adapterCalls=0;
    const bridge=new Bridge([{
      id:'pc-primary',
      grants:['device.info'],
      adapter:{
        discover:async()=>['device.info'],
        execute:async()=>{adapterCalls++;return {device:'fixture'};}
      }
    }],{
      complianceCardGate:integration.complianceCardGate,
      admission:async()=>false,
      receiptSink:async()=>{}
    });
    const outcome=await bridge.call('pc-primary','device.info',args,{complianceCard:card});
    assert.equal(outcome.ok,false);
    assert.equal(outcome.error,'ADMISSION_DENIED');
    assert.equal(outcome.operationMayHaveExecuted,false);
    assert.equal(adapterCalls,0);
    assert.equal(requests,3);
  } finally {
    await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  }
});
