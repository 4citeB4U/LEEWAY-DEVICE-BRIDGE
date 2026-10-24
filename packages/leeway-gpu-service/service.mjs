import http from 'node:http';
import {readFileSync} from 'node:fs';
import {randomBytes,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {basename} from 'node:path';
import {describeGpuService} from './index.mjs';
import {defaultPreferencesPath,readGpuPreference,setGpuPreference} from './preferences.mjs';
import {validateInferenceRequest} from '../gpu-inference/index.mjs';

export const API_VERSION='leeway.gpu.service.v1';
const reply=(res,status,payload,extraHeaders={})=>{
 res.writeHead(status,{'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store','x-content-type-options':'nosniff',...extraHeaders});
 res.end(JSON.stringify(payload));
};
function previewEvidenceHeaders(result,mode){
 const headers={'x-leeway-authority':'UNADMITTED_PREVIEW','x-leeway-execution-mode':mode||'LOCAL_GPU_PREVIEW'};
 for(const [field,header] of [['backend','x-leeway-gpu-backend'],['device','x-leeway-gpu-device']]){
  if(typeof result?.[field]==='string'&&/^[\x20-\x7e]{1,128}$/.test(result[field]))headers[header]=result[field];
 }
 if(Number.isSafeInteger(result?.modelBytes)&&result.modelBytes>0)headers['x-leeway-gpu-model-bytes']=String(result.modelBytes);
 if(Number.isSafeInteger(result?.vramBytes)&&result.vramBytes>0)headers['x-leeway-gpu-vram-bytes']=String(result.vramBytes);
 if(result?.gpuResidency==='FULL_MODEL_IN_VRAM')headers['x-leeway-gpu-residency']='FULL_MODEL_IN_VRAM';
 return headers;
}
const openAiError=(code,type='invalid_request_error')=>({error:{message:code,type,code}});
function parseOpenAiChatRequest(body){
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('GPU_OPENAI_REQUEST_INVALID');
 const allowed=new Set(['model','messages','max_tokens','max_completion_tokens','stream']);
 if(Object.keys(body).some(key=>!allowed.has(key)))throw Error('GPU_OPENAI_PARAMETER_UNSUPPORTED');
 if(body.stream===true)throw Error('GPU_OPENAI_STREAMING_UNSUPPORTED');
 if(body.stream!==undefined&&body.stream!==false)throw Error('GPU_OPENAI_REQUEST_INVALID');
 if(typeof body.model!=='string'||!Array.isArray(body.messages)||body.messages.length<1||body.messages.length>64)
  throw Error('GPU_OPENAI_REQUEST_INVALID');
 if(body.max_tokens!==undefined&&body.max_completion_tokens!==undefined)throw Error('GPU_OPENAI_TOKEN_LIMIT_AMBIGUOUS');
 const maxTokens=body.max_completion_tokens??body.max_tokens??128;
 if(!Number.isSafeInteger(maxTokens)||maxTokens<1||maxTokens>1024)throw Error('GPU_OPENAI_TOKEN_LIMIT_INVALID');
 let prompt='';
 for(const message of body.messages){
  if(!message||typeof message!=='object'||Array.isArray(message)
   ||!['system','developer','user','assistant'].includes(message.role)
   ||typeof message.content!=='string')throw Error('GPU_OPENAI_MESSAGES_UNSUPPORTED');
  prompt+=`${message.role.toUpperCase()}: ${message.content}\n`;
  if(prompt.length>8192)throw Error('GPU_OPENAI_PROMPT_TOO_LARGE');
 }
 prompt+='ASSISTANT:';
 if(prompt.length>8192)throw Error('GPU_OPENAI_PROMPT_TOO_LARGE');
 return validateInferenceRequest({requestId:randomUUID(),model:body.model,prompt,maxTokens});
}
export function publicStatus(platform=process.platform,{preferenceFile=defaultPreferencesPath(),previewMode='UNAVAILABLE'}={}){
 const service=describeGpuService({platform});
 const requestedEnabled=readGpuPreference(preferenceFile).requestedEnabled;
 return {service:API_VERSION,productName:service.productName,serviceId:service.serviceId,platform,
  backend:service.backend,backendName:service.backendName,registration:'LOCAL_DISCOVERY_ONLY',
  authorization:'CANONICAL_GPU_ISSUER_UNBOUND',
  formula:'GPU_SCHEDULING_POLICY_UNAPPROVED',
  ldwmd:'PRODUCTION_LEASE_UNBOUND',continuum:'LIVE_OWNER_BINDING_UNVERIFIED',
  veritas:'CANONICAL_EXECUTION_RECEIPT_UNISSUED',
  requestedEnabled,active:false,productionReady:false,dispatchAllowed:false,
   effectiveMode:requestedEnabled?'REQUESTED_NOT_AUTHORIZED':'OFF',previewInference:previewMode,
  supportedConsumers:'EXPLICIT_SDK_OR_IPC_INTEGRATION_REQUIRED'};
}
export function createGpuService({platform=process.platform,preferenceFile=defaultPreferencesPath(),previewProvider=null}={}){
 const csrf=randomBytes(32).toString('hex');
 const status=()=>publicStatus(platform,{preferenceFile,previewMode:previewProvider?.mode||'UNAVAILABLE'});
 return http.createServer(async(req,res)=>{
  const host=req.headers.host||'';
  if(!/^127\.0\.0\.1(?::[0-9]{1,5})?$/.test(host))
   return reply(res,403,{code:'GPU_LOOPBACK_HOST_REQUIRED'});
  const url=new URL(req.url,'http://127.0.0.1');
  try{
   if(req.method==='GET'&&url.pathname==='/'){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store',
     'x-content-type-options':'nosniff',
     'content-security-policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'"});
    return res.end(readFileSync(new URL('./dashboard.html',import.meta.url)));
   }
    if(req.method==='GET'&&url.pathname==='/v1/status')
     return reply(res,200,status());
   if(req.method==='GET'&&url.pathname==='/v1/control')
     return reply(res,200,{...status(),csrfToken:csrf});
   if(req.method==='POST'&&url.pathname==='/v1/control'){
    const sameOrigin=req.headers.origin==='http://'+host;
    const json=req.headers['content-type']==='application/json';
    if(!sameOrigin||!json||req.headers['x-leeway-csrf']!==csrf)
     return reply(res,403,{code:'GPU_PREFERENCE_ORIGIN_OR_TOKEN_REJECTED'});
    let bytes=0;const chunks=[];
    for await(const chunk of req){
     bytes+=chunk.length;
     if(bytes>1024)return reply(res,413,{code:'GPU_PREFERENCE_TOO_LARGE'});
     chunks.push(chunk);
    }
    let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{}
    if(!body||Object.keys(body).length!==1||typeof body.requestedEnabled!=='boolean')
     return reply(res,400,{code:'GPU_PREFERENCE_INVALID'});
    setGpuPreference(body.requestedEnabled,{file:preferenceFile});
     return reply(res,200,status());
   }
    if(req.method==='GET'&&url.pathname==='/v1/inference/status'){
     if(!previewProvider)return reply(res,200,{available:false,mode:'UNAVAILABLE',reason:'GPU_INFERENCE_PROVIDER_NOT_CONFIGURED'});
     return reply(res,200,{...await previewProvider.status(),mode:previewProvider.mode||'LOCAL_GPU_PREVIEW',authority:'UNADMITTED_PREVIEW'});
    }
    if(req.method==='GET'&&url.pathname==='/v1/models'){
     if(!previewProvider||typeof previewProvider.status!=='function')
      return reply(res,503,openAiError('GPU_INFERENCE_PROVIDER_NOT_CONFIGURED','server_error'),{'x-leeway-authority':'UNADMITTED_PREVIEW'});
     const provider=await previewProvider.status();
     const models=Array.isArray(provider?.available)?provider.available:[];
     return reply(res,200,{object:'list',data:models.map(id=>({id,object:'model',created:0,owned_by:'leeway'}))},
      {'x-leeway-authority':'UNADMITTED_PREVIEW','x-leeway-execution-mode':previewProvider.mode||'LOCAL_GPU_PREVIEW'});
    }
    if(req.method==='POST'&&url.pathname==='/v1/chat/completions'){
     const sameOrigin=req.headers.origin===undefined||req.headers.origin==='http://'+host;
     if(!sameOrigin||req.headers['content-type']?.split(';')[0]!=='application/json')
      return reply(res,403,openAiError('GPU_OPENAI_LOCAL_ORIGIN_REQUIRED'),{'x-leeway-authority':'UNADMITTED_PREVIEW'});
     if(!previewProvider||typeof previewProvider.infer!=='function')
      return reply(res,503,openAiError('GPU_INFERENCE_PROVIDER_NOT_CONFIGURED','server_error'),{'x-leeway-authority':'UNADMITTED_PREVIEW'});
     let bytes=0;const chunks=[];
     for await(const chunk of req){bytes+=chunk.length;if(bytes>64*1024)return reply(res,413,openAiError('GPU_OPENAI_REQUEST_TOO_LARGE'),{'x-leeway-authority':'UNADMITTED_PREVIEW'});chunks.push(chunk);}
     let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}
     catch{return reply(res,400,openAiError('GPU_OPENAI_REQUEST_INVALID'),{'x-leeway-authority':'UNADMITTED_PREVIEW'});}
     let request;try{request=parseOpenAiChatRequest(body);}
     catch(error){const code=/^GPU_OPENAI_[A-Z0-9_]+$/.test(error?.message||'')?error.message:'GPU_INFERENCE_REQUEST_INVALID';
      return reply(res,400,openAiError(code),{'x-leeway-authority':'UNADMITTED_PREVIEW'});}
     try{
      const result=await previewProvider.infer(request);
      return reply(res,200,{id:`chatcmpl-${request.requestId}`,object:'chat.completion',created:Math.floor(Date.now()/1000),
       model:result.model,choices:[{index:0,message:{role:'assistant',content:result.response},finish_reason:'stop'}]},
       previewEvidenceHeaders(result,previewProvider.mode));
     }catch(error){
      const code=/^[A-Z0-9_]+$/.test(error?.message||'')?error.message:'GPU_PREVIEW_EXECUTION_FAILED';
      return reply(res,503,openAiError(code,'server_error'),{'x-leeway-authority':'UNADMITTED_PREVIEW'});
     }
    }
    if(req.method==='POST'&&url.pathname==='/v1/inference/preview'){
     const sameOrigin=req.headers.origin==='http://'+host;
     if(!sameOrigin||req.headers['content-type']!=='application/json'||req.headers['x-leeway-csrf']!==csrf)
      return reply(res,403,{code:'GPU_PREVIEW_ORIGIN_OR_TOKEN_REJECTED'});
     if(!previewProvider||typeof previewProvider.infer!=='function')
      return reply(res,503,{code:'GPU_INFERENCE_PROVIDER_NOT_CONFIGURED',authority:'UNADMITTED_PREVIEW'});
     let bytes=0;const chunks=[];
     for await(const chunk of req){bytes+=chunk.length;if(bytes>16*1024)return reply(res,413,{code:'GPU_PREVIEW_REQUEST_TOO_LARGE'});chunks.push(chunk);}
     let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return reply(res,400,{code:'GPU_INFERENCE_REQUEST_INVALID'});}
     let request;try{request=validateInferenceRequest(body);}catch{return reply(res,400,{code:'GPU_INFERENCE_REQUEST_INVALID'});}
     try{return reply(res,200,{...await previewProvider.infer(request),authority:'UNADMITTED_PREVIEW'});}
     catch(error){
      const code=/^[A-Z0-9_]+$/.test(error?.message||'')?error.message:'GPU_PREVIEW_EXECUTION_FAILED';
      return reply(res,503,{code,authority:'UNADMITTED_PREVIEW'});
     }
    }
   if(req.method==='GET'&&url.pathname==='/v1/manifest')
    return reply(res,200,{productName:'LeeWay GPU',serviceId:'leeway.gpu.service',apiVersion:API_VERSION,
     endpoint:'/v1/execute',discovery:'/v1/status',control:'/v1/control',
     compatiblePlatforms:['win32','android','linux'],
     consumerMode:'explicit-registration',automaticSystemGpuReplacement:false,available:false});
   if(url.pathname==='/v1/execute')
    return reply(res,503,{status:'DENIED',code:'GPU_CANONICAL_EXECUTION_AUTHORITY_NOT_CONNECTED',
     dispatchExecuted:false,canonicalReceiptIssued:false});
   return reply(res,404,{status:'NOT_FOUND'});
  }catch(error){
   return reply(res,503,{status:'BLOCKED',code:'GPU_LOCAL_SERVICE_READINESS_FAILED'});
  }
 });
}
export async function listenGpuService({port=0,host='127.0.0.1',platform=process.platform,preferenceFile,previewProvider=null}={}){
 if(host!=='127.0.0.1')throw Error('GPU_SERVICE_LOOPBACK_ONLY');
 const server=createGpuService({platform,preferenceFile,previewProvider});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve)});
 return server;
}
if(process.argv[1]&&basename(fileURLToPath(import.meta.url))===basename(process.argv[1])){
 const port=Number(process.env.LEEWAY_GPU_PORT||4178);
 const mode=process.env.LEEWAY_GPU_PREVIEW_MODE||'disabled';
 const token=process.env.LEEWAY_GPU_PAIRING_KEY||'';
 const models=(process.env.LEEWAY_GPU_MODELS||'qwen3.5:4b').split(',').map(x=>x.trim()).filter(Boolean);
 Promise.all([import('../gpu-inference/ollama-gpu-adapter.mjs'),import('../gpu-inference/remote-service.mjs')]).then(async([ollama,remote])=>{
  let previewProvider=null;
  if(mode==='workstation')previewProvider=new ollama.OllamaGpuAdapter({baseUrl:process.env.LEEWAY_GPU_OLLAMA_URL||'http://127.0.0.1:21435',models,deviceName:process.env.LEEWAY_GPU_DEVICE_NAME||'NVIDIA GPU'});
  if(mode==='client')previewProvider=remote.createRemoteGpuClient({host:process.env.LEEWAY_GPU_REMOTE_HOST,port:Number(process.env.LEEWAY_GPU_REMOTE_PORT||4178),token,models});
  const app=await listenGpuService({port,previewProvider});
  console.log('LEEWAY_GPU_LOCAL_APP_LISTEN 127.0.0.1:'+port+' MODE='+mode);
  if(mode==='workstation'){
   if(!token)throw Error('GPU_PAIRING_KEY_REQUIRED');
   const bind=process.env.LEEWAY_GPU_WORKSTATION_BIND;
   const remotePort=Number(process.env.LEEWAY_GPU_REMOTE_PORT||4178);
   const worker=remote.createWorkstationGpuServer({host:bind,port:remotePort,token,adapter:previewProvider});
   await new Promise((resolve,reject)=>{worker.once('error',reject);worker.listen(remotePort,bind,resolve)});
   console.log('LEEWAY_GPU_PAIRED_WORKSTATION_LISTEN '+bind+':'+remotePort);
   app.on('close',()=>worker.close());
  }
 }).catch(err=>{console.error(err.message);process.exitCode=1});
}
