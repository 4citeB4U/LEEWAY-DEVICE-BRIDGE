const LOOPBACK='http://127.0.0.1:4178';
const REQUEST_ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SHA256=/^[a-f0-9]{64}$/;
function localServiceUrl(endpoint){
 const url=new URL(endpoint);
 if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.username||url.password)
  throw Error('LEEWAY_GPU_CLIENT_REQUIRES_LOCAL_ENDPOINT');
 return url;
}
export async function discoverLeeWayGpu({endpoint=LOOPBACK,fetchImpl=fetch}={}){
 const url=localServiceUrl(endpoint);
 const response=await fetchImpl(new URL('/v1/status',url));
 if(!response.ok)throw Error('LEEWAY_GPU_SERVICE_UNREACHABLE');
 const status=await response.json();
 if(status.serviceId!=='leeway.gpu.service'||status.service!=='leeway.gpu.service.v1')
  throw Error('LEEWAY_GPU_SERVICE_IDENTITY_MISMATCH');
 return Object.freeze({ ...status, endpoint: url.origin });
}
export function selectGpuRoute(status){
 if(status?.serviceId!=='leeway.gpu.service')throw Error('LEEWAY_GPU_IDENTITY_NOT_VERIFIED');
 if(status.requestedEnabled!==true)return Object.freeze({route:'SYSTEM_NATIVE',reason:'USER_OPTED_OUT'});
 if(status.active!==true||status.productionReady!==true||status.dispatchAllowed!==true)
  return Object.freeze({route:'SYSTEM_NATIVE',reason:'LEEWAY_GPU_PENDING_AUTHORIZATION',requested:true});
 // Discovery status is never independently sufficient to grant native dispatch.
 return Object.freeze({route:'SYSTEM_NATIVE',reason:'CANONICAL_EXECUTION_GRANT_REQUIRED',requested:true});
}
export async function executeLeeWayGpu({endpoint=LOOPBACK,request,fetchImpl=fetch}={}){
 const url=localServiceUrl(endpoint);
 const allowed=new Set(['requestId','workloadHash','backend','deviceId','adapterId','memoryBytes']);
 if(!request||typeof request!=='object'||Array.isArray(request)||Object.keys(request).some(key=>!allowed.has(key))||
    !REQUEST_ID.test(request.requestId||'')||!SHA256.test(request.workloadHash||'')||
    !['D3D12','VULKAN'].includes(request.backend)||
    typeof request.deviceId!=='string'||request.deviceId.length<1||request.deviceId.length>128||
    typeof request.adapterId!=='string'||request.adapterId.length<1||request.adapterId.length>128||
    !Number.isSafeInteger(request.memoryBytes)||request.memoryBytes<1||request.memoryBytes>268435456)
  throw Error('LEEWAY_GPU_REQUEST_INVALID');
 const response=await fetchImpl(new URL('/v1/execute',url),{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(request)
 });
 let result;try{result=await response.json()}catch{throw Error('LEEWAY_GPU_SERVICE_RESPONSE_INVALID')}
 if(!response.ok||result?.dispatchExecuted!==true)
  throw Error(typeof result?.code==='string'?result.code:'LEEWAY_GPU_EXECUTION_DENIED');
 if(result.requestId!==request.requestId||result.workloadHash!==request.workloadHash||
    result.canonicalReceiptIssued!==true||!result.veritasReceipt)
  throw Error('LEEWAY_GPU_EXECUTION_RECEIPT_UNVERIFIED');
 return Object.freeze({status:'EXECUTED_RESPONSE_UNVERIFIED',requestId:request.requestId,
  workloadHash:request.workloadHash,veritasReceipt:result.veritasReceipt,verificationRequired:true});
}

/**
 * LEEWAY HEADER — DO NOT REMOVE
 * REGION: LEEWAY.DEVICE_BRIDGE.GPU_SERVICE.CROSS_PLATFORM_CLIENT
 * TAG: LEEWAY_APPLICATION_EXPLICIT_SOFTWARE_GPU_DIAGNOSTIC_V1
 * WHO: Creator-authorized LeeWay engineering.
 * WHAT: Let Node/Electron Windows applications invoke the installed native engine.
 * WHEN: 2026-10-24. WHERE: packages/leeway-gpu-service/client.mjs.
 * WHY: Apps can explicitly use LeeWay without pretending DXGI has enumerated it.
 * HOW: Bound loopback request, same-origin token, reject false authority.
 * AUTHORITY: LAB_ONLY; no unqualified canonical execution.
 * LICENSE: Existing LeeWay repository terms.
 */
export async function runLeeWaySoftwareGraphicsDiagnostic({endpoint='http://127.0.0.1:4180',fetchImpl=fetch}={}){
 const url=localServiceUrl(endpoint);
 const controlResponse=await fetchImpl(new URL('/v1/control',url));
 if(!controlResponse.ok)throw Error('LEEWAY_GPU_CONTROL_UNAVAILABLE');
 const control=await controlResponse.json();
 if(control?.serviceId!=='leeway.gpu.service'||typeof control.csrfToken!=='string'||
     !/^[a-f0-9]{64}$/.test(control.csrfToken))throw Error('LEEWAY_GPU_CONTROL_IDENTITY_MISMATCH');
 const response=await fetchImpl(new URL('/v1/diagnostics/software-graphics/run',url),{
  method:'POST',headers:{'origin':url.origin,'x-leeway-csrf':control.csrfToken}
 });
 let body;try{body=await response.json();}catch{throw Error('LEEWAY_GPU_DIAGNOSTIC_RESPONSE_INVALID')}
 if(!response.ok)throw Error(typeof body?.code==='string'?body.code:'LEEWAY_GPU_DIAGNOSTIC_DENIED');
 if(body?.serviceId!=='leeway.gpu.service'||body?.schema!=='leeway.gpu.software-graphics-diagnostic.v1'||
     body.status!=='PASS_DIAGNOSTIC_ONLY'||body.scope!=='LAB_ONLY'||
     body.backend!=='LEEWAY_GPU_SOFTWARE'||body.borrowedPixels!==16||
     body.completedFence!==1||body.independentReadback!==true||
     body.requestCorrelated!==true||body.foreignRejected!==true||
     body.canonicalReceiptIssued!==false||body.osGpuRegistered!==false||
     body.productionReady!==false||body.dispatchAllowed!==false)
    throw Error('LEEWAY_GPU_DIAGNOSTIC_EVIDENCE_MISMATCH');
 return Object.freeze({...body,endpoint:url.origin,executionClass:'UNADMITTED_DIAGNOSTIC'});
}
