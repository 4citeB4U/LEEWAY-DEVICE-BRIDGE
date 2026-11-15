/*
LEEWAY HEADER — DO NOT REMOVE
WHO: Existing Runtime Fabric admission authority and configured host operator.
WHAT: Reusable live Runtime-backed host provider for provider-bound MCP startup.
WHEN: 2026-11-15.
WHERE: operator/runtime-fabric-host-provider.mjs.
HOW: Existing compliance-card integration and authorize-action endpoint, configured loopback bindings.
WHY: Replace an unspecified runtimeInput placeholder with the actual existing admission path.
*/
import fs from 'node:fs/promises';import path from 'node:path';
import {createRuntimeComplianceCardIntegration} from './runtime-compliance-card-provider.mjs';
export async function createRuntimeInput({runtimeBaseUrl,approvedRuntimeOrigin,controlTokenEnv,receiptPath,agentId}={}){
 const base=new URL(runtimeBaseUrl);
 if(base.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(base.hostname)||base.username||base.password)throw Error('RUNTIME_FABRIC_LOOPBACK_REQUIRED');
 if(!path.isAbsolute(receiptPath||'')||!agentId)throw Error('RUNTIME_HOST_CONFIGURATION_REQUIRED');
 if(approvedRuntimeOrigin!==base.origin||!/^LEEWAY_[A-Z0-9_]+$/.test(controlTokenEnv||''))throw Error('RUNTIME_HOST_AUTH_BINDING_REQUIRED');
 const controlToken=process.env[controlTokenEnv];if(!controlToken)throw Error('RUNTIME_CONTROL_TOKEN_REQUIRED');
 const call=async(route,body)=>{const response=await fetch(new URL(route,base),{redirect:'error',signal:AbortSignal.timeout(5000),headers:{authorization:'Bearer '+controlToken,...(body?{'content-type':'application/json'}:{})},...(body?{method:'POST',body:JSON.stringify(body)}:{})});if(!response.ok)throw Error('RUNTIME_FABRIC_ADMISSION_UNAVAILABLE');return response.json();};
 await call('/runtime/health');const manifest=await call('/runtime/enforcement/manifest');
 const card=createRuntimeComplianceCardIntegration({baseUrl:base.href,approvedRuntimeOrigin,controlToken,manifest,agentId});
 return {
  complianceCardGate:card.complianceCardGate,complianceCardProvider:card.complianceCardProvider,
  admission:async({complianceCard,deviceId,capability,args})=>{
   if(!complianceCard||typeof complianceCard!=='object')return false;
   const result=await call('/runtime/authorize-action',{leewayComplianceCard:complianceCard,context:{deviceId,capability,arguments:args}});
   return result.status==='AUTHORIZED_PENDING_VERIFICATION';
  },
  receiptSink:async record=>{await fs.mkdir(path.dirname(receiptPath),{recursive:true});await fs.appendFile(receiptPath,JSON.stringify(record)+'\n',{mode:0o600});}
 };
}
