export async function executeGovernedGpuRequest({request,authority,formula,ldwmd,continuum,dispatch,veritas}={}){
 const required=['requestId','workloadHash','deviceId','adapterId'];
 if(required.some(k=>!request?.[k]))throw Error('GPU_REQUEST_CORRELATION_REQUIRED');
 if(typeof authority?.verifyAndConsume!=='function')throw Error('GPU_CANONICAL_AUTHORITY_UNBOUND');
 if(typeof formula?.evaluateGpuWorkload!=='function')throw Error('GPU_FORMULA_WORKLOAD_ADAPTER_UNBOUND');
 if(typeof ldwmd?.allocatePhysicalLease!=='function')throw Error('GPU_LDWMD_PHYSICAL_LEASE_UNBOUND');
 if(typeof continuum?.bindLineage!=='function')throw Error('GPU_CONTINUUM_LINEAGE_UNBOUND');
 if(typeof dispatch?.executeNative!=='function')throw Error('GPU_NATIVE_DISPATCH_UNBOUND');
 if(typeof veritas?.verifyCanonical!=='function')throw Error('GPU_CANONICAL_VERITAS_UNBOUND');
 throw Error('GPU_PRODUCTION_EXECUTION_COORDINATOR_NOT_ACTIVATED');
}
