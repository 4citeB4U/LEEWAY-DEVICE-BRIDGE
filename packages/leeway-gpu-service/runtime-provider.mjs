import {pathToFileURL} from 'node:url';
import path from 'node:path';
export async function routeCanonicalGpuProvider(runtimeRoot){
 if(!runtimeRoot||!path.isAbsolute(runtimeRoot))throw Error('GPU_RUNTIME_ROOT_REQUIRED');
 const modulePath=path.join(runtimeRoot,'provider-fabric','provider-router.mjs');
 const provider=await import(pathToFileURL(modulePath).href);
 const result=await provider.routeProviderRequest({providerId:'edge-gpu-provider'},{receipt:false});
 if(result.providerId!=='edge-gpu-provider'||result.status!=='BOUND_PASS')throw Error('GPU_PROVIDER_NOT_READY');
 return {providerId:result.providerId,registrationState:result.status,governedExecutionReady:false};
}
