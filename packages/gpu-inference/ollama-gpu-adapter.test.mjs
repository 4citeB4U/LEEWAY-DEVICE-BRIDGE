import test from 'node:test';
import assert from 'node:assert/strict';
import {OllamaGpuAdapter} from './ollama-gpu-adapter.mjs';

const request={requestId:'123e4567-e89b-42d3-a456-426614174000',model:'qwen3.5:4b',prompt:'Reply with the word GPU.',maxTokens:24};

test('Ollama adapter returns only after the requested model is resident in VRAM',async()=>{
 const calls=[];
 const fetchImpl=async(url,options={})=>{
  calls.push({url,options});
  if(url.endsWith('/api/chat'))return new Response(JSON.stringify({message:{content:'GPU'}}),{status:200});
  if(url.endsWith('/api/ps'))return new Response(JSON.stringify({models:[{name:'qwen3.5:4b',size:2_500_000_000,size_vram:2_500_000_000}]}),{status:200});
  throw Error('unexpected endpoint');
 };
 const adapter=new OllamaGpuAdapter({fetchImpl,deviceName:'RTX 5060 Laptop GPU'});
 const result=await adapter.infer(request);
 assert.equal(result.response,'GPU');
 assert.equal(result.vramBytes,2_500_000_000);
 assert.equal(result.modelBytes,2_500_000_000);
 assert.equal(result.gpuResidency,'FULL_MODEL_IN_VRAM');
 assert.match(result.device,/RTX 5060/);
 assert.equal(result.authority,'UNADMITTED_PREVIEW');
 const chat=JSON.parse(calls.find(x=>x.url.endsWith('/api/chat')).options.body);
 assert.equal(chat.options.num_gpu,999);
 assert.equal(chat.think,false);
 assert.deepEqual(calls.map(x=>new URL(x.url).pathname),['/api/ps','/api/chat','/api/ps']);
});

test('Ollama adapter refuses partial CPU placement before dispatching the user prompt',async()=>{
 const calls=[];
 const fetchImpl=async(url,options={})=>{
  calls.push({url,options});
  if(url.endsWith('/api/generate'))return new Response(JSON.stringify({response:''}),{status:200});
  if(url.endsWith('/api/ps'))return new Response(JSON.stringify({models:[{name:'qwen3.5:4b',size:2_500_000_000,size_vram:1_000_000_000}]}),{status:200});
  throw Error('unexpected endpoint');
 };
 const adapter=new OllamaGpuAdapter({fetchImpl});
 await assert.rejects(()=>adapter.infer(request),/GPU_FULL_VRAM_RESIDENCY_REQUIRED/);
 assert.deepEqual(calls.map(x=>new URL(x.url).pathname),['/api/ps','/api/generate','/api/ps']);
 assert.equal(calls.some(x=>x.url.endsWith('/api/chat')),false);
 const warmup=JSON.parse(calls.find(x=>x.url.endsWith('/api/generate')).options.body);
 assert.equal(warmup.prompt,'');
 assert.equal(warmup.options.num_gpu,999);
 assert.equal(warmup.options.num_predict,0);
 await assert.rejects(()=>adapter.infer({...request,model:'unlisted:7b'}),/GPU_MODEL_NOT_ALLOWLISTED/);
});

test('Ollama adapter loads a cold model, proves full VRAM residency, then dispatches the user prompt',async()=>{
 let resident=false;
 const calls=[];
 const fetchImpl=async(url,options={})=>{
  calls.push({url,options});
  if(url.endsWith('/api/ps'))return new Response(JSON.stringify({models:resident?[{name:'qwen3.5:4b',size:2_500_000_000,size_vram:2_500_000_000}]:[]}),{status:200});
  if(url.endsWith('/api/generate')){resident=true;return new Response(JSON.stringify({response:''}),{status:200});}
  if(url.endsWith('/api/chat'))return new Response(JSON.stringify({message:{content:'GPU'}}),{status:200});
  throw Error('unexpected endpoint');
 };
 const adapter=new OllamaGpuAdapter({fetchImpl});
 const result=await adapter.infer(request);
 assert.equal(result.gpuResidency,'FULL_MODEL_IN_VRAM');
 assert.deepEqual(calls.map(x=>new URL(x.url).pathname),['/api/ps','/api/generate','/api/ps','/api/chat','/api/ps']);
});

test('Ollama adapter rejects an empty user-facing response',async()=>{
 const fetchImpl=async url=>{
  if(url.endsWith('/api/chat'))return new Response(JSON.stringify({message:{content:''}}),{status:200});
  if(url.endsWith('/api/ps'))return new Response(JSON.stringify({models:[{name:'qwen3.5:4b',size:1024,size_vram:1024}]}),{status:200});
  throw Error('unexpected endpoint');
 };
 const adapter=new OllamaGpuAdapter({fetchImpl});
 await assert.rejects(()=>adapter.infer(request),/GPU_INFERENCE_RESPONSE_INVALID/);
});

test('Ollama adapter only accepts a loopback backend URL',()=>{
 assert.throws(()=>new OllamaGpuAdapter({baseUrl:'http://192.168.1.4:11434'}),/OLLAMA_LOOPBACK_REQUIRED/);
});
