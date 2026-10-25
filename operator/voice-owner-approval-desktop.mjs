/*
LEEWAY HEADER — DO NOT REMOVE
REGION: DEVICE.BRIDGE.VOICE.DESKTOP.APPROVER
TAG: HUMAN_APPROVAL_NO_PASSWORD_NO_SILENT_ENROLLMENT
WHO: LeeWay Industries; WHAT: explicit on-device owner confirmation
WHY: avoid unknown passphrase and shared secrets for browser applications
WHERE: main Agent-Lee Windows desktop; WHEN: 2026-10-24
HOW: watch owner ACL-protected requests, show native Yes/No dialog,
cryptographically sign only user-approved request for a narrowly scoped voice session
AUTHORITY: only an explicit click grants access. No GPU or device control.
LICENSE: MIT
*/
import path from 'node:path';
import {readdir,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {signVoiceOwnerApproval} from './voice-owner-pairing.mjs';
import {loadVoiceAppRegistry,DEFAULT_VOICE_APPS} from './voice-app-registry.mjs';
const local=process.env.LOCALAPPDATA;
if(process.platform!=='win32'||!local)throw Error('INTERACTIVE_WINDOWS_OWNER_REQUIRED');
const root=path.join(local,'LeeWay','VoiceAuth');
const pending=path.join(root,'requests');
let registeredApps;
try{registeredApps=await loadVoiceAppRegistry(path.join(root,'registered-apps.json'))}
catch(error){if(error.code!=='ENOENT')throw error;registeredApps=DEFAULT_VOICE_APPS}
const key=Buffer.from((await readFile(path.join(root,'owner-approval-key.bin'))));
if(key.length!==32)throw Error('PROTECTED_APPROVAL_KEY_MISSING');
const seen=new Set();
async function scan(){
 let names;try{names=await readdir(pending)}catch{return}
 for(const name of names){
  if(!/^[a-f0-9]{32}\.request\.json$/.test(name)||seen.has(name))continue;
  seen.add(name);
  let r;try{r=JSON.parse(await readFile(path.join(pending,name),'utf8'))}catch{continue}
  if(r.expires<=Date.now()||
     registeredApps[r.appId]!==r.origin||r.scope!=='voice:turn:readonly')continue;
  const message='App: '+r.appId+'\nWebsite: '+r.origin+'\nMatching code: '+r.displayCode+'\nPermission: Read-only voice conversation\nExpires in 2 minutes.\n\nOnly approve if this code matches the website. Approve?';
  const ps=String.raw`Add-Type -AssemblyName System.Windows.Forms;
$decision=[System.Windows.Forms.MessageBox]::Show($env:LEEWAY_APPROVAL_TEXT,'LeeWay Agent Lee - Owner Approval',
[System.Windows.Forms.MessageBoxButtons]::YesNo,[System.Windows.Forms.MessageBoxIcon]::Question,
[System.Windows.Forms.MessageBoxDefaultButton]::Button2);
if($decision -eq [System.Windows.Forms.DialogResult]::Yes){Write-Output 'OWNER_APPROVED'}`;
  const env={...process.env,LEEWAY_APPROVAL_TEXT:message};
  const result=spawnSync('powershell.exe',['-NoProfile','-STA','-EncodedCommand',
   Buffer.from(ps,'utf16le').toString('base64')],{env,encoding:'utf8',windowsHide:false,timeout:90_000});
  if(result.status===0&&result.stdout.includes('OWNER_APPROVED')){
   try{const accepted=await signVoiceOwnerApproval({root:pending,approvalKey:key,id:r.id,registeredApps});
    console.log(JSON.stringify({event:'OWNER_VOICE_APPROVAL',appId:accepted.appId,scope:accepted.scope}))}
   catch{console.log(JSON.stringify({event:'OWNER_VOICE_APPROVAL_NOT_APPLIED'}))}
  }else console.log(JSON.stringify({event:'OWNER_VOICE_APPROVAL_DECLINED'}));
 }
}
console.log(JSON.stringify({state:'OWNER_DESKTOP_APPROVAL_WATCHING',privateFolder:true}));
await scan();
setInterval(()=>{void scan().catch(()=>{})},2000);
