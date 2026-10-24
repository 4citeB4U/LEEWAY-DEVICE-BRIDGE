// DIAGNOSTIC cross-repository integration: real HTTP/SDK/dispatcher/Runtime
// binding/LDWMD contracts; synthetic device and neural output, ephemeral keys.
import test from 'node:test';
import assert from 'node:assert/strict';
import {isAbsolute, resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {listenGpuService} from './service.mjs';
import {setGpuPreference} from './preferences.mjs';
const gpuRoot = process.env.LEEWAY_GPU_SOURCE_ROOT, runtimeRoot = process.env.LEEWAY_RUNTIME_SOURCE_ROOT,
  modelHubRoot = process.env.LEEWAY_MODEL_HUB_SOURCE_ROOT;
test('existing HTTP service reaches SDK, real signed Runtime binding and original LDWMD',
  {skip: !gpuRoot || !runtimeRoot || !modelHubRoot ? 'Set reviewed GPU, Runtime and Model Hub source roots for integration' : false}, async t => {
    assert(isAbsolute(gpuRoot) && isAbsolute(runtimeRoot) && isAbsolute(modelHubRoot));
    const load = (root, path) => import(pathToFileURL(resolve(root, path)));
    const {createLeeWayGpuInferenceProvider} = await load(gpuRoot, 'sdk/inference-provider.mjs');
    const {syntheticModelPlan} = await load(gpuRoot, 'tests/fixtures/portable-model-plan.mjs');
    const {HybridDispatcher} = await load(gpuRoot, 'core/hybrid.dispatcher.js');
    const {inferenceHash} = await load(gpuRoot, 'core/inference-contract.mjs');
    const {createInferenceFixture} = await load(runtimeRoot, 'tests/fixtures/inference-binding-fixture.mjs');
    const {createLeeWayInferenceBindingProvider} = await load(runtimeRoot, 'adapters/edge-gpu/inference-binding.mjs');
    const {LeeWayDeviceWorkingMemoryDatabase} = await load(runtimeRoot, 'automation-runtime/src/vtensor/vram-database.mjs');
    const {createLDWMDWebGPUAdapter, prepareLDWMDWebGPUBufferLease} = await load(runtimeRoot, 'adapters/edge-gpu/ldwmd-webgpu.mjs');
    const device = {lost: new Promise(() => {}), limits: {maxBufferSize: 1024}, pushErrorScope() {},
      async popErrorScope() { return null; }, createBuffer({size}) { return {size, destroy() {}}; },
      createCommandEncoder() { return {clearBuffer() {}, finish() { return {}; }}; },
      queue: {submit() {}, async onSubmittedWorkDone() {}}};
    const adapter = createLDWMDWebGPUAdapter({device, deviceId: 'fixture-device', capacityBytes: 1024});
    const database = new LeeWayDeviceWorkingMemoryDatabase({deviceId: 'fixture-device', deviceGeneration: 'fixture-generation',
      totalVramBytes: 1024, hardwareAdapter: adapter});
    const f = await createInferenceFixture({principal: {clientId: 'registered-client'}, memoryFactory: s =>
      prepareLDWMDWebGPUBufferLease({device, database, adapter, requestHash: s.requestHash,
        leaseId: s.permit.body.leaseId, generation: 'fixture-generation', budgetBytes: 1024, specs: [{bytes: 64, usage: 136}]})});
    const plan = syntheticModelPlan();
    const qualification = {publicKeySpki: f.trust.veritasPublicKeySpki,
      envelope: await f.sign('leeway.gpu.provider-qualification.v1', {serviceId: 'leeway.gpu.service',
        deviceId: 'fixture-device', platform: 'LINUX', receiptId: 'DIAGNOSTIC_FIXTURE_ONLY', expiresAtMs: Date.now() + 30000,
        models: [{modelId: 'fixture-model', modelSha256: plan.modelSha256, tokenizerSha256: plan.tokenizerSha256,
          implementationSha256: plan.implementationSha256, planSha256: await inferenceHash(plan)}]}, 'veritas')};
    const provider = createLeeWayGpuInferenceProvider({models: [{modelId: 'fixture-model', plan}], platform: 'linux',
      deviceId: 'fixture-device', qualification, bindingProvider: createLeeWayInferenceBindingProvider(f),
      deviceProvider: {getDevice: async () => device},
      executeModel: async input => new HybridDispatcher({inferenceBinding: input.inferenceBinding, ml: {
        async run() { return {...f.result, outputIds: [plan.metadata['tokenizer.ggml.tokens'].indexOf('4')],
          modelGraphTimings:{schema:'leeway.gpu.model-graph-timings.v2',
            scope:'MODEL_GRAPH_AFTER_LOAD_EXCLUDES_AUTHORIZATION_POST_VERITAS_AND_CONTINUUM_COMMIT',
            modelLoadState:'COLD_LOAD',modelLoadMs:12,prefillMs:4,modelGraphFirstTokenReadyMs:4,
            clientTimeToFirstTokenMs:null,clientTimeToFirstTokenStatus:'NOT_MEASURED_NON_STREAMING_RESPONSE',
            decodeMs:0,decodeModelSteps:0,decodeVisibleTokens:0,decodeStopTokens:0,decodeTokensPerSecond:null,
            graphAfterLoadMs:5,modelLoadAndGraphMs:17,
            promptTokens:input.plan.inputTokens.length,visibleOutputTokens:1,
            tokenTimings:Array.from({length:input.plan.inputTokens.length},(_,position)=>({position,commands:8,elapsedMs:4}))},
          performanceTelemetry:{schema:'leeway.gpu.raw-performance-telemetry.v1',
            scope:'LEEWAY_OPERATOR_ALLOCATOR_AND_MODEL_GRAPH_COUNTERS_NOT_PHYSICAL_HARDWARE_COUNTERS_OR_FORMULA_MAPPING',
            modelWeightUploadBytes:4096,pagedEmbeddingUploadBytes:0,encodedDispatchCount:32,
            trackedBufferLiveBytes:8192,trackedBufferPeakBytes:12288,admittedBufferBudgetBytes:16384,
            kvCacheReservedBytes:2048,kvCacheCapacityTokens:input.plan.contextLimit,
            kvCachePositionsProcessed:input.plan.inputTokens.length}}; }, async close() {}
      }}).dispatch({type: 'AI_INFERENCE', requestId: input.requestId, sessionId: input.sessionId,
        modelSha256: plan.modelSha256, tokenizerSha256: plan.tokenizerSha256, implementationSha256: plan.implementationSha256,
        contextLimit: plan.contextLimit, maxNewTokens: input.plan.maxNewTokens, inputIds: input.plan.inputTokens}, {capability: 'WEBGPU'})});
    const root = await mkdtemp(join(tmpdir(), 'leeway-full-gpu-')), preferenceFile = join(root, 'preferences.json');
    setGpuPreference(true, {file: preferenceFile});
    const server = await listenGpuService({port: 0, platform: 'linux', preferenceFile, inferenceProvider: provider,
      authenticateClient: async ({request}) => request.headers.authorization === 'Bearer diagnostic-token' ? {clientId: 'registered-client'} : null});
    t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(root, {recursive: true, force: true}); });
    const base = 'http://127.0.0.1:' + server.address().port;
    const capability = await fetch(base + '/v1/capabilities').then(r => r.json()); assert.equal(capability.gpuVerified, true);
    const post = (path, body) => fetch(base + path, {method: 'POST', headers: {'content-type': 'application/json', authorization: 'Bearer diagnostic-token'}, body: JSON.stringify(body)});
    assert.equal((await post('/v1/models/activate', {modelId: 'fixture-model'})).status, 200);
    const response = await post('/v1/generate', {modelId: 'fixture-model', prompt: 'a', maxNewTokens: 1});
    assert.equal(response.status, 200); const result = await response.json();
    assert.equal(result.text, '4'); assert.equal(result.backend, 'LEEWAY_GPU');
    assert.equal(result.modelGraphTimings.graphAfterLoadMs,5);
    assert.equal(result.modelGraphTimings.modelLoadAndGraphMs,17);
    assert.equal(result.modelGraphTimings.tokenTimings[0].position,0);
    assert.equal(result.modelGraphTimings.tokenTimings.at(-1).position,result.modelGraphTimings.promptTokens-1);
    assert.equal(result.performanceTelemetry.modelWeightUploadBytes,4096);
    assert.equal(result.performanceTelemetry.kvCachePositionsProcessed,result.modelGraphTimings.promptTokens);
    assert.match(result.executionBinding.commitAttestationSha256, /^[a-f0-9]{64}$/);
    const {createQualifiedGpuClient} = await load(modelHubRoot, 'src/qualified-gpu-client.mjs');
    const hubClient = createQualifiedGpuClient({endpoint: base,
      authenticateGpuRequest: async () => ({clientId: 'registered-client', headers: {authorization: 'Bearer diagnostic-token'}}),
      verifyGpuQualification: async ({capabilities}) => capabilities.receiptId === 'DIAGNOSTIC_FIXTURE_ONLY',
      verifyGpuResult: async ({result: answer, request}) => answer.executionBinding.requestId === request.requestId &&
        /^[a-f0-9]{64}$/.test(answer.executionBinding.receiptLedgerReceiptSha256)});
    assert.equal((await hubClient.capabilities()).gpuInferenceQualified, true);
    const hubActivation = await hubClient.activateModel({modelId: 'fixture-model'});
    const hubAnswer = await hubClient.generate({modelId: 'fixture-model', prompt: 'a', sessionId: hubActivation.sessionId,
      maxNewTokens: 1}, {expectedClientId: hubActivation.clientId});
    assert.equal(hubAnswer.text, '4'); assert.equal(hubAnswer.verification, 'TRUSTED_CONSUMER_VERIFIED');
    assert.equal(hubAnswer.modelGraphTimings.graphAfterLoadMs,5);
    assert.equal(hubAnswer.modelGraphTimings.modelLoadAndGraphMs,17);
    assert.equal(hubAnswer.modelGraphTimings.tokenTimings[0].position,0);
    assert.equal(hubAnswer.modelGraphTimings.tokenTimings.at(-1).position,hubAnswer.modelGraphTimings.promptTokens-1);
    assert.equal(hubAnswer.performanceTelemetry.trackedBufferPeakBytes,12288);
    assert.equal(database.receipt().activePhysicalBytes, 0);
    assert.equal(f.calls.filter(call => call === 'receipt.append').length, 2);
  });
