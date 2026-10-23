const stages=['authority','formula','ldwmd','continuum','dispatch','veritas'];
const names={authority:'verifyAndConsume',formula:'evaluateGpuWorkload',ldwmd:'allocatePhysicalLease',continuum:'bindLineage',dispatch:'executeNative',veritas:'verifyCanonical'};
export async function runCandidateGpuPipeline({request,providers,signal}={}){
 if(!request?.requestId||!request?.workloadHash||!request?.deviceId||!request?.adapterId)throw Error('GPU_REQUEST_CORRELATION_REQUIRED');
 for(const stage of stages)if(typeof providers?.[stage]?.[names[stage]]!=='function')throw Error('GPU_STAGE_UNBOUND:'+stage);
 const evidence={};
 for(const stage of stages){
  if(signal?.aborted)throw Error('GPU_EXECUTION_CANCELLED');
  const result=await providers[stage][names[stage]]({request,prior:Object.freeze({...evidence}),signal});
  if(result?.requestId!==request.requestId||result?.workloadHash!==request.workloadHash||result?.verified!==true)throw Error('GPU_STAGE_NOT_VERIFIED:'+stage);
  evidence[stage]=Object.freeze({...result});
 }
 return Object.freeze({requestId:request.requestId,workloadHash:request.workloadHash,scope:'CANDIDATE_TEST_ONLY_NOT_CANONICAL',stages:Object.freeze([...stages]),canonicalReceiptIssued:false});
}