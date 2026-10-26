import {readFileSync,writeFileSync,renameSync,mkdirSync,unlinkSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {homedir,platform,tmpdir} from 'node:os';
import {randomBytes} from 'node:crypto';

export function defaultPreferencesPath(){
 const base=process.env.LEEWAY_GPU_CONFIG_HOME ||
 (platform()==='win32'?(process.env.LOCALAPPDATA||join(homedir(),'AppData','Local')):join(process.env.XDG_CONFIG_HOME||join(homedir(),'.config')));
 return join(base,'LeeWayGPU','preferences.json');
}
export function readGpuPreference(file=defaultPreferencesPath()){
 try{
  const saved=JSON.parse(readFileSync(file,'utf8'));
  if(saved?.schema!=='leeway.gpu.preference.v1'||typeof saved.requestedEnabled!=='boolean')throw Error('PREFERENCE_SCHEMA_INVALID');
  return Object.freeze({requestedEnabled:saved.requestedEnabled});
 }catch(error){
  if(error.code==='ENOENT')return Object.freeze({requestedEnabled:false});
  throw Error('GPU_PREFERENCE_UNREADABLE');
 }
}
export function setGpuPreference(enabled,{file=defaultPreferencesPath()}={}){
 if(typeof enabled!=='boolean')throw Error('GPU_PREFERENCE_BOOLEAN_REQUIRED');
 const dir=dirname(file);mkdirSync(dir,{recursive:true,mode:0o700});
 const target=join(dir,'.gpu-pref-'+randomBytes(8).toString('hex')+'.tmp');
 try{
  writeFileSync(target,JSON.stringify({schema:'leeway.gpu.preference.v1',requestedEnabled:enabled,updatedAt:new Date().toISOString()}),{flag:'wx',mode:0o600});
  renameSync(target,file);
 }catch(error){try{unlinkSync(target)}catch{};throw error}
 return readGpuPreference(file);
}
