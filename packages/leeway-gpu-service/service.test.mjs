import test from 'node:test';
import assert from 'node:assert/strict';
import {listenGpuService,publicStatus} from './service.mjs';

test('service reports unresolved production gates',()=>{
 const s=publicStatus('win32');assert.equal(s.productName,'LeeWay Edge GPU');assert.equal(s.backendName,'LeeWay Edge GPU');assert.equal(s.backend,'LEEWAY_GPU');
 assert.equal(s.productionReady,false);assert.equal(s.dispatchAllowed,false);
});
test('localhost discovery works; fake execution request is denied',async t=>{
 const server=await listenGpuService({port:0});
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const url='http://127.0.0.1:'+server.address().port;
 const status=await fetch(url+'/v1/status').then(r=>r.json());
 assert.equal(status.dispatchAllowed,false);
 const manifest=await fetch(url+'/v1/manifest').then(r=>r.json());
 assert.equal(manifest.productName,'LeeWay Edge GPU');
 assert.equal(manifest.automaticSystemGpuReplacement,false);
 const attack=await fetch(url+'/v1/execute',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({verified:true,requestId:'spoofed'})});
 assert.equal(attack.status,503);
 assert.equal((await attack.json()).dispatchExecuted,false);
});
test('non-loopback binding is forbidden',async()=>{
 await assert.rejects(listenGpuService({host:'0.0.0.0'}),/GPU_SERVICE_LOOPBACK_ONLY/);
});
test('OpenAI-compatible model discovery and chat use only the configured preview provider',async t=>{
 let received;
 const provider={mode:'REMOTE_GPU_PREVIEW',async status(){return {available:['qwen3.5:4b']};},async infer(request){
  received=request;return {requestId:request.requestId,model:request.model,response:'remote result',authority:'UNADMITTED_PREVIEW',
   backend:'Ollama CUDA preview',device:'RTX 5060 Laptop GPU (full model VRAM residency verified)',
   modelBytes:3_140_495_604,vramBytes:3_140_495_604,gpuResidency:'FULL_MODEL_IN_VRAM'};
 }};
 const server=await listenGpuService({port:0,previewProvider:provider});
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const url='http://127.0.0.1:'+server.address().port;
 const models=await fetch(url+'/v1/models').then(r=>r.json());
 assert.deepEqual(models.data.map(x=>x.id),['qwen3.5:4b']);
 const response=await fetch(url+'/v1/chat/completions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
  model:'qwen3.5:4b',messages:[{role:'system',content:'Be concise.'},{role:'user',content:'Say hello.'}],max_tokens:32
 })});
 assert.equal(response.status,200);
 assert.equal(response.headers.get('x-leeway-authority'),'UNADMITTED_PREVIEW');
 assert.equal(response.headers.get('x-leeway-execution-mode'),'REMOTE_GPU_PREVIEW');
 assert.equal(response.headers.get('x-leeway-gpu-backend'),'Ollama CUDA preview');
 assert.match(response.headers.get('x-leeway-gpu-device'),/RTX 5060/);
 assert.equal(response.headers.get('x-leeway-gpu-model-bytes'),'3140495604');
 assert.equal(response.headers.get('x-leeway-gpu-vram-bytes'),'3140495604');
 assert.equal(response.headers.get('x-leeway-gpu-residency'),'FULL_MODEL_IN_VRAM');
 const completion=await response.json();
 assert.equal(completion.object,'chat.completion');
 assert.equal(completion.choices[0].message.content,'remote result');
 assert.match(received.prompt,/SYSTEM: Be concise\./);
 assert.match(received.prompt,/USER: Say hello\./);
 assert.equal(received.maxTokens,32);
});
test('OpenAI-compatible route rejects unsupported streaming and third-party browser origins',async t=>{
 const provider={mode:'LOCAL_GPU_PREVIEW',async status(){return {available:['qwen3.5:4b']};},async infer(){throw Error('unexpected inference');}};
 const server=await listenGpuService({port:0,previewProvider:provider});
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const url='http://127.0.0.1:'+server.address().port;
 const body={model:'qwen3.5:4b',messages:[{role:'user',content:'hello'}],stream:true};
 const stream=await fetch(url+'/v1/chat/completions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 assert.equal(stream.status,400);
 assert.equal((await stream.json()).error.code,'GPU_OPENAI_STREAMING_UNSUPPORTED');
 const crossOrigin=await fetch(url+'/v1/chat/completions',{method:'POST',headers:{'content-type':'application/json','origin':'https://example.invalid'},body:JSON.stringify({...body,stream:false})});
 assert.equal(crossOrigin.status,403);
});
