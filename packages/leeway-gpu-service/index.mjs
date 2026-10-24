const REQUIRED=Object.freeze(['runtimeFabric','formula','ldwmd','continuum','gpu','veritas']);
const PRODUCT_NAME='LeeWay Edge GPU';
const PLATFORMS=Object.freeze({win32:'D3D12',windows:'D3D12',android:'VULKAN',samsung:'VULKAN',linux:'VULKAN',darwin:'METAL',macos:'METAL',ios:'METAL',iphone:'METAL',ipados:'METAL',ipad:'METAL'});
export const GPU_SERVICE_ID='leeway.gpu.service';
const platformBackend=platform=>typeof platform==='string'&&Object.hasOwn(PLATFORMS,platform.toLowerCase())?PLATFORMS[platform.toLowerCase()]:null;
export function describeGpuService({platform=process.platform}={}){
 const backend=platformBackend(platform);
 return Object.freeze({productName:PRODUCT_NAME,serviceId:GPU_SERVICE_ID,platform,backend:'LEEWAY_GPU',platformBackendHint:backend,backendName:PRODUCT_NAME,platformTarget:backend!==null,requiredFor:'LEEWAY_ECOSYSTEM_APPLICATIONS',requiredAuthorities:[...REQUIRED],status:'REQUIRES_PER_DEVICE_NATIVE_AND_GOVERNANCE_QUALIFICATION',osWideGpuDriverInstalled:false});
}
export function requireGovernedGpuExecution({platform=process.platform,request,verified}={}){
 const backend=platformBackend(platform);
 if(!backend)throw Error('GPU_PLATFORM_NOT_SUPPORTED');
 if(!request?.requestId||!request.workloadHash||request.backend!==backend||!request.deviceId||!request.adapterId||!Number.isSafeInteger(request.memoryBytes)||request.memoryBytes<=0)throw Error('GPU_REQUEST_INVALID');
 if(!verified||REQUIRED.some(k=>verified[k]?.requestId!==request.requestId||verified[k]?.workloadHash!==request.workloadHash||verified[k]?.verified!==true))throw Error('GPU_SERVICE_GOVERNANCE_CHAIN_UNVERIFIED');
 // Caller-supplied verification flags are never canonical execution authority.
 throw Error('GPU_CANONICAL_EXECUTION_AUTHORITY_NOT_CONNECTED');
 return Object.freeze({status:'READY_FOR_CANONICAL_REVALIDATION',requestId:request.requestId,backend,physicalDispatchExecuted:false,receiptIssued:false});
}
