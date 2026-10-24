/*
LEEWAY HEADER — DO NOT REMOVE
REGION: DEVICE.BRIDGE.VOICE.FABRIC
TAG: VOICE_DUPLEX_READONLY_DISCOVERY
WHO: LeeWay Industries; WHAT: use the existing Voice Fabric full duplex engine
WHY: separate app, optional LLM voice, canonical Agent Lee voice, shared bridge
WHERE: operator/voice-duplex.mjs; WHEN: 2026-10-24
HOW: bounded localhost health probe and explicit user-initiated OS URL opener
AUTHORITY: discovery is read-only; actuation must use existing C3 admission.
LICENSE: MIT
*/
import {spawn} from 'node:child_process';
import {realpath,stat} from 'node:fs/promises';
import path from 'node:path';
export const VOICE_DUPLEX_URL='http://127.0.0.1:5173/LeeWay-Edge-RTC/conversation-gate.html';
export const VOICE_STUDIO_URL='http://127.0.0.1:8897/studio.html';
export async function getVoiceDuplexStatus({fetchImpl=fetch}={}){
 const endpoints=[['duplex',VOICE_DUPLEX_URL],['studio',VOICE_STUDIO_URL]];
 const results={};
 for(const [key,url] of endpoints){
   try {
    const response=await fetchImpl(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(1700)});
    results[key]={available:response.ok,http:response.status};
   }catch(error){results[key]={available:false,error:'NOT_REACHABLE'}}
 }
 return {service:'LEEWAY_VOICE_FABRIC_DUPLEX',kind:'READ_ONLY_DISCOVERY',
   connected:results.duplex.available,providers:['KOKORO','LOCAL_LLM_OPTIONAL','MACHINE_CONSCIOUSNESS'],
   entrypoint:VOICE_DUPLEX_URL,studio:VOICE_STUDIO_URL,results,
   productionCertified:false,physicalAcousticsVerified:false,
   deviceExecutionAuthorized:false,deviceCommands:'EXISTING_C3_ADMISSION_REQUIRED'};
}
export async function getLocalVoiceBinding({fetchImpl=fetch}={}){
  const endpoint='http://127.0.0.1:5173/__leeway/voice-binding';
  try{
    const response=await fetchImpl(endpoint,{method:'GET',redirect:'error',signal:AbortSignal.timeout(1800)});
    if(!response.ok)return {status:'VOICE_BINDING_UNAVAILABLE',http:response.status};
    const data=await response.json();
    if(data.authority!=='LEEWAY_VOICE_FABRIC'||
       !/^kokoro-(?:af|am|bf|bm)_[a-z0-9]+$/.test(data.binding?.voicePackageId)||
       !data.recordRevision)return {status:'VOICE_BINDING_UNVERIFIED'};
    return {status:'CANONICAL_VOICE_READBACK',voicePackageId:data.binding.voicePackageId,
      revision:data.recordRevision,authority:data.authority,
      deviceExecutionAuthorized:false,remoteDeviceSyncQualified:false};
  }catch{return {status:'VOICE_BINDING_TRANSPORT_UNAVAILABLE'}}
}
export async function startLocalVoiceDuplex({
  root=process.env.LEEWAY_VOICE_FABRIC_ROOT,
  spawnImpl=spawn,
}={}){
  if(!root)throw Error('LEEWAY_VOICE_FABRIC_ROOT_REQUIRED');
  const canonical=await realpath(path.resolve(root));
  const file=path.join(canonical,'scripts','voice-duplex-start.mjs');
  const scriptReal=await realpath(file);
  if(scriptReal!==file || !(await stat(file)).isFile())throw Error('VOICE_FABRIC_START_SCRIPT_UNTRUSTED');
  const p=spawnImpl(process.execPath,[file],{
    cwd:canonical,detached:true,stdio:'ignore',shell:false,
  });
  p.unref?.();
  return {initiated:true,processId:p.pid||null,
    entrypoint:VOICE_DUPLEX_URL,mode:'EXPLICIT_LOCAL_OPERATOR_START',
    ready:'NOT_YET_VERIFIED',deviceCommandsAuthorized:false};
}
export function openLocalVoiceDuplex({spawnImpl=spawn,platform=process.platform}={}){
 const cmd=platform==='win32'?'cmd':platform==='darwin'?'open':'xdg-open';
 const args=platform==='win32'?['/c','start','',''+VOICE_DUPLEX_URL]:[VOICE_DUPLEX_URL];
 if(!['win32','darwin','linux'].includes(platform))throw Error('PLATFORM_NOT_SUPPORTED');
 // URL is constant; no arbitrary command, URL, shell arguments, or remote target.
 const processHandle=spawnImpl(cmd,args,{detached:true,stdio:'ignore',shell:false,windowsHide:true});
 processHandle.unref?.();
 return {initiated:true,url:VOICE_DUPLEX_URL,mode:'EXPLICIT_LOCAL_UI',notProductionAdmission:true};
}
