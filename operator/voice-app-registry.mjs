/*
LEEWAY HEADER — DO NOT REMOVE
REGION: DEVICE.BRIDGE.VOICE.API.APPLICATION.REGISTRY
TAG: EXPLICIT_PER_APP_ORIGIN_SCOPED_REGISTRATION
WHO: LeeWay Industries; WHAT: validate owner-controlled app registrations
WHY: one shared public API for many applications without shared credentials
WHERE: Device Bridge host; WHEN: 2026-10-24
HOW: owner-managed ACL-protected JSON; exact HTTPS origins, no wildcards
AUTHORITY: registration is not owner approval; individual connections still need consent.
LICENSE: MIT
*/
import {readFile} from 'node:fs/promises';
export const DEFAULT_VOICE_APPS=Object.freeze({'leeway.voice.studio':'https://4citeb4u.github.io'});
const ID=/^[a-z][a-z0-9._-]{2,79}$/;
export function validateVoiceAppRegistry(value){
 if(!value||Array.isArray(value)||typeof value!=='object')throw Error('VOICE_APPS_INVALID');
 const entries=Object.entries(value);
 if(entries.length<1||entries.length>5000)throw Error('VOICE_APPS_COUNT_INVALID');
 const registry=Object.create(null);
 for(const [id,origin]of entries){
  if(!ID.test(id)||typeof origin!=='string')throw Error('VOICE_APP_ID_INVALID');
  let url;try{url=new URL(origin)}catch{throw Error('VOICE_APP_ORIGIN_INVALID')}
  if(url.protocol!=='https:'||url.origin!==origin||url.username||url.password||
   url.hostname==='localhost'||url.hostname==='127.0.0.1'||
   url.hostname.endsWith('.localhost')||url.hostname==='0.0.0.0'||
   origin.includes('*'))throw Error('VOICE_APP_ORIGIN_INVALID');
  registry[id]=url.origin;
 }
 if(registry['leeway.voice.studio']!=='https://4citeb4u.github.io')
  throw Error('CANONICAL_VOICE_STUDIO_REGISTRATION_REQUIRED');
 return Object.freeze(registry);
}
export async function loadVoiceAppRegistry(file){
 if(!file)return validateVoiceAppRegistry(DEFAULT_VOICE_APPS);
 const value=JSON.parse(await readFile(file,'utf8'));
 return validateVoiceAppRegistry(value);
}
