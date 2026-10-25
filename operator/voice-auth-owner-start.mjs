/*
LEEWAY HEADER — DO NOT REMOVE
REGION: DEVICE.BRIDGE.VOICE.LOCAL.ENROLLMENT
TAG: REUSE_OWNER_DPAPI_ENROLLED_AUTH_CONFIG
WHO: LeeWay Industries; WHAT: start read-only voice auth gateway
WHY: do not embed passwords or grant GPU/device privileges
WHERE: Device Bridge owner host; WHEN: 2026-10-24
HOW: load ACL-protected nonsecret scrypt salt/hash from local owner directory
AUTHORITY: localhost only; HTTPS public exposure separately qualified.
LICENSE: MIT
*/
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {startVoiceAuthGateway} from './voice-auth-gateway.mjs';
const root=process.env.LOCALAPPDATA;
if(!root)throw Error('WINDOWS_OWNER_LOCALAPPDATA_REQUIRED');
const file=path.join(root,'LeeWay','VoiceAuth','gateway-auth.json');
const data=JSON.parse(await readFile(file,'utf8'));
if(!/^[a-f0-9]{128}$/.test(data.passwordHash||'')||
   !/^[a-f0-9]{32}$/.test(data.passwordSalt||''))
 throw Error('OWNER_VOICE_AUTH_UNQUALIFIED');
const result=await startVoiceAuthGateway({
  host:'127.0.0.1',port:5332,passwordHash:data.passwordHash,
  passwordSalt:data.passwordSalt,
});
console.log(JSON.stringify({
  service:'LEEWAY_DEVICE_BRIDGE_VOICE_AUTH',state:'LOCAL_GATEWAY_LISTENING',
  port:result.port,remoteHttps:'NOT_DEPLOYED',ownerSecret:'ENROLLED_DPAPI_LOCAL',
}));
