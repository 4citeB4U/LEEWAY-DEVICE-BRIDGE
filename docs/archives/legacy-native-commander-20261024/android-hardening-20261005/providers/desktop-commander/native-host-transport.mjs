/*
REGION: LEEWAY.DEVICES.DESKTOP_COMMANDER
TAG: LEEWAY_NATIVE_COMMANDER_TRANSPORT
WHO: Agent Skills Tool Gateway / authorized Device Bridge controller
WHAT: Bind the existing DesktopCommanderAdapter to the native loopback provider.
WHEN: Explicit local-host capability execution; WHERE: Device Bridge provider tree.
WHY: Keep LeeWay native Commander inside LeeWay Devices without changing Agent Lee identity.
HOW: Verify endpoint/body/provider and returned receipt integrity; never forward local grants to remote targets.
LICENSE: MIT
*/
import { createHash, timingSafeEqual } from 'node:crypto';
export class NativeHostCommanderTransport {
 constructor({endpoint,bodyId,timeoutMs=10000}={}){
  const u=new URL(endpoint);
  if(u.protocol!=='http:'||!['127.0.0.1','localhost'].includes(u.hostname)||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw Error('NATIVE_COMMANDER_LOOPBACK_ENDPOINT_REQUIRED');
  if(typeof bodyId!=='string'||!bodyId||!Number.isFinite(timeoutMs)||timeoutMs<100||timeoutMs>120000)throw Error('NATIVE_COMMANDER_BINDING_REQUIRED');
  this.endpoint=u.origin;this.bodyId=bodyId;this.timeoutMs=timeoutMs;
 }
 async request(route,body){
  const response=await fetch(this.endpoint+route,{method:body?'POST':'GET',redirect:'error',headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(this.timeoutMs)});
  const text=await response.text();if(text.length>4*1024*1024)throw Error('COMMANDER_RESULT_TOO_LARGE');
  const value=JSON.parse(text);
  if(!response.ok)throw Error(/^[A-Z_]+$/.test(value.error)?value.error:'COMMANDER_REQUEST_FAILED');
  if(value.provider!=='LEEWAY_NATIVE_HOST_COMMANDER')throw Error('COMMANDER_PROVIDER_IDENTITY_MISMATCH');
  if((value.bodyId??value.preState?.bodyId)!==this.bodyId)throw Error('COMMANDER_BODY_IDENTITY_MISMATCH');
  return value;
 }
 async invoke(operation,payload={}){
  if(payload.target!==this.bodyId)throw Error('COMMANDER_TARGET_NOT_BOUND');
  const health=await this.request('/health');
  if(health.status!=='PASS'||health.deviceAuthority!=='4citeB4U/LEEWAY-DEVICE-BRIDGE')throw Error('COMMANDER_NOT_HEALTHY_OR_OWNED');
  if(operation==='ping')return health;
  let capability,args;
  if(operation==='readFile'){capability='leeway.files.read';args={path:payload.path,maxChars:20000};}
  else if(operation==='hashFile'){capability='leeway.files.hash';args={path:payload.path};}
  else if(operation==='listFiles'){capability='leeway.files.list';args={path:payload.path};}
  else if(operation==='inspectDisplays'){capability='leeway.display.inspect';args={};}
  else if(operation==='inspectProcesses'){capability='leeway.process.inspect';args={};}
  else throw Error('COMMANDER_OPERATION_NOT_QUALIFIED');
  const result=await this.request('/execute',{capability,args});
  const {receiptHash,...receiptBody}=result;
  if(typeof receiptHash!=='string'||!/^[a-f0-9]{64}$/.test(receiptHash))throw Error('COMMANDER_RECEIPT_REQUIRED');
  const expected=createHash('sha256').update(JSON.stringify(receiptBody)).digest();
  if(!timingSafeEqual(expected,Buffer.from(receiptHash,'hex')))throw Error('COMMANDER_RECEIPT_INTEGRITY_FAILED');
  if(result.preState.capability!==capability)throw Error('COMMANDER_CAPABILITY_MISMATCH');
  return result;
 }
}
