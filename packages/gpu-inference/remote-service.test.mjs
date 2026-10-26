import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRemoteGpuClient,createWorkstationGpuServer} from './remote-service.mjs';

const token='7'.repeat(64);
const request=()=>({requestId:randomUUID(),model:'qwen3.5:4b',prompt:'Use remote GPU.',maxTokens:24});

async function withServer(fn){
 const server=createWorkstationGpuServer({host:'127.0.0.1',port:0,token,allowLoopbackTest:true,adapter:{infer:async r=>({requestId:r.requestId,model:r.model,response:'RTX GPU result',backend:'Ollama CUDA preview',device:'RTX 5060 (VRAM residency verified)',vramBytes:2_500_000_000,elapsedMs:44,authority:'UNADMITTED_PREVIEW'})}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 try { return await fn(server.address().port); }
 finally { await new Promise(resolve=>server.close(resolve)); }
}

test('paired remote client returns the encrypted workstation GPU result',async()=>withServer(async port=>{
 const client=createRemoteGpuClient({host:'127.0.0.1',port,token,allowLoopbackTest:true});
 const result=await client.infer(request());
 assert.equal(result.response,'RTX GPU result');
 assert.equal(result.vramBytes,2_500_000_000);
 assert.match(result.device,/VRAM residency verified/);
}));

test('remote inference rejects wrong pairing keys and replayed request ids',async()=>withServer(async port=>{
 const wrong=createRemoteGpuClient({host:'127.0.0.1',port,token:'8'.repeat(64),allowLoopbackTest:true});
 await assert.rejects(()=>wrong.infer(request()),/GPU_REMOTE_REQUEST_FAILED/);
 const client=createRemoteGpuClient({host:'127.0.0.1',port,token,allowLoopbackTest:true});
 const same=request();
 await client.infer(same);
 await assert.rejects(()=>client.infer(same),/GPU_REMOTE_REQUEST_FAILED/);
}));
