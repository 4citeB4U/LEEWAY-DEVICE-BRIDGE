/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.GPU_SERVICE.TELEMETRY
TAG: LEEWAY.DEVICE_BRIDGE.GPU.TELEMETRY.READONLY.V1
5WH:
WHAT = Provide process-only GPU health and authenticated owner telemetry GET contracts.
WHY = Expose truthful discovery without fabricating device sensors or execution receipts.
WHO = LeeWay Industries; owner-governed GPU service operators.
WHERE = packages/leeway-gpu-service/telemetry-routes.mjs
WHEN = 2026-11-05
HOW = Reuse the existing client authenticator and an explicitly injected trusted observer.
AUTHORIZED_ROLES: Read-only local service; no device control or production admission.
LICENSE: Existing LeeWay repository terms.
*/
const SERVICE='leeway.gpu.service';
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$/;
const METRICS=Object.freeze({
 queueDepth:[0,1000000,true],
 generatedTokens:[0,Number.MAX_SAFE_INTEGER,true],
 tokensPerSecond:[0,1000000,false],
 latencyP50Ms:[0,3600000,false],
 latencyP95Ms:[0,3600000,false],
 latencyP99Ms:[0,3600000,false],
 vramTotalBytes:[0,Number.MAX_SAFE_INTEGER,true],
 vramUsedBytes:[0,Number.MAX_SAFE_INTEGER,true],
 vramFragmentationRatio:[0,1,false],
 temperatureC:[-40,180,false],
 powerWatts:[0,100000,false]
});
const ALLOWED=new Set([...Object.keys(METRICS),'thermalThrottled']);
const UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
function validateSnapshot(snapshot){
 if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot)||
   snapshot.schema!=='leeway.gpu.telemetry-provider.v1'||snapshot.serviceId!==SERVICE||
   typeof snapshot.sampledAt!=='string'||!UTC.test(snapshot.sampledAt)||
   typeof snapshot.metrics!=='object'||snapshot.metrics===null||Array.isArray(snapshot.metrics)||
   Object.keys(snapshot).some(k=>!['schema','serviceId','sampledAt','metrics'].includes(k)))
  throw Error('GPU_TELEMETRY_SNAPSHOT_INVALID');
 const instant=Date.parse(snapshot.sampledAt),now=Date.now();
 if(!Number.isFinite(instant)||instant>now+30000||instant<now-300000)
  throw Error('GPU_TELEMETRY_SAMPLE_STALE');
 const measured={},fields=Object.entries(snapshot.metrics);
 if(fields.length===0||fields.length>ALLOWED.size||fields.some(([k])=>!ALLOWED.has(k)))
  throw Error('GPU_TELEMETRY_FIELDS_INVALID');
 for(const [key,value] of fields){
  if(key==='thermalThrottled'){
   if(typeof value!=='boolean')throw Error('GPU_TELEMETRY_FIELDS_INVALID');
  }else{
   const [minimum,maximum,integer]=METRICS[key];
   if(typeof value!=='number'||!Number.isFinite(value)||value<minimum||value>maximum||
      (integer&&!Number.isSafeInteger(value)))throw Error('GPU_TELEMETRY_FIELDS_INVALID');
  }
  measured[key]=value;
 }
 if(Object.hasOwn(measured,'vramTotalBytes')&&Object.hasOwn(measured,'vramUsedBytes')&&
    measured.vramUsedBytes>measured.vramTotalBytes)throw Error('GPU_TELEMETRY_FIELDS_INVALID');
 const p=['latencyP50Ms','latencyP95Ms','latencyP99Ms'];
 for(let i=1;i<p.length;i++)if(Object.hasOwn(measured,p[i-1])&&Object.hasOwn(measured,p[i])&&
    measured[p[i]]<measured[p[i-1]])throw Error('GPU_TELEMETRY_FIELDS_INVALID');
 return {
  schema:'leeway.gpu.metrics.v1',serviceId:SERVICE,
  observation:'TRUSTED_HOST_PROVIDER_REPORTED_NOT_VERITAS_ATTESTED',
  sampledAt:snapshot.sampledAt,metrics:measured,
  unavailable:[...ALLOWED].filter(key=>!Object.hasOwn(measured,key)),
  productionExecutionVerified:false,canonicalReceiptIssued:false
 };
}
export function createGpuTelemetryRoutes({reply,authenticateClient,telemetryProvider,inferenceProvider,platform}={}){
 if(typeof reply!=='function')throw Error('GPU_TELEMETRY_REPLY_REQUIRED');
 return async function handleTelemetry(req,res,url,host){
  if(req.method!=='GET'||!['/v1/health','/v1/metrics'].includes(url.pathname))return false;
  if(url.search||url.hash){
   reply(res,400,{code:'GPU_TELEMETRY_QUERY_FORBIDDEN'});return true;
  }
  if(req.headers.origin!==undefined&&req.headers.origin!=='http://'+host){
   reply(res,403,{code:'GPU_TELEMETRY_ORIGIN_DENIED'});return true;
  }
  if(url.pathname==='/v1/health'){
   reply(res,200,{
    schema:'leeway.gpu.health.v1',serviceId:SERVICE,platform,
    process:'RUNNING',scope:'PROCESS_ONLY',
    inferenceProviderBound:typeof inferenceProvider?.capabilities==='function',
    telemetryProviderBound:typeof telemetryProvider?.readMetrics==='function',
    nativeHardware:'NOT_PROBED',temperatureC:null,thermalThrottled:null,
    vramTotalBytes:null,vramUsedBytes:null,productionExecutionVerified:false,
    canonicalReceiptIssued:false,deviceExecutionAuthorized:false
   });
   return true;
  }
  if(typeof authenticateClient!=='function'||typeof telemetryProvider?.readMetrics!=='function'){
   reply(res,503,{code:'GPU_TELEMETRY_TRUSTED_ADAPTER_UNBOUND'});return true;
  }
  const controller=new AbortController();
  let timer;
  const timeout=new Promise((_,reject)=>{
   timer=setTimeout(()=>{
    controller.abort();
    reject(Object.assign(Error('GPU_TELEMETRY_TIMEOUT'),{status:504}));
   },5000);
  });
  try{
   const result=await Promise.race([(async()=>{
    let identity;
    try{identity=await authenticateClient({request:req,operation:'telemetry.read',signal:controller.signal});}
    catch{throw Object.assign(Error('GPU_TELEMETRY_CLIENT_UNAUTHORIZED'),{status:401});}
    if(!ID.test(identity?.clientId||''))throw Object.assign(Error('GPU_TELEMETRY_CLIENT_UNAUTHORIZED'),{status:401});
    return telemetryProvider.readMetrics({client:Object.freeze({clientId:identity.clientId}),signal:controller.signal});
   })(),timeout]);
   const verified=validateSnapshot(result);
   if(!controller.signal.aborted)reply(res,200,verified);
  }catch(error){
   if(!res.headersSent)reply(res,error?.status===401?401:error?.status===504?504:503,{
    code:error?.status===401?'GPU_TELEMETRY_CLIENT_UNAUTHORIZED':
     error?.status===504?'GPU_TELEMETRY_TIMEOUT':'GPU_TELEMETRY_READBACK_INVALID'
   });
  }finally{clearTimeout(timer);}
  return true;
 };
}
