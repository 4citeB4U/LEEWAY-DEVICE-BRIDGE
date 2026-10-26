import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {readGpuPreference,setGpuPreference} from './preferences.mjs';
import {listenGpuService} from './service.mjs';
const fixture=t=>{const d=mkdtempSync(join(tmpdir(),'lw-gpu-pref-'));t.after(()=>rmSync(d,{recursive:true,force:true}));return join(d,'preferences.json')};
test('preference defaults off, stores request and persists across reads',t=>{
 const file=fixture(t);assert.equal(readGpuPreference(file).requestedEnabled,false);
 assert.equal(setGpuPreference(true,{file}).requestedEnabled,true);
 assert.equal(readGpuPreference(file).requestedEnabled,true);
 assert.equal(setGpuPreference(false,{file}).requestedEnabled,false);
 assert.throws(()=>setGpuPreference('true',{file}),/BOOLEAN_REQUIRED/);
});
test('malformed state fails closed rather than enabling GPU',t=>{
 const file=fixture(t);writeFileSync(file,'{"requestedEnabled":true}');
 assert.throws(()=>readGpuPreference(file),/GPU_PREFERENCE_UNREADABLE/);
});
test('button control is token-and-origin bound, persistent, never dispatches',async t=>{
 const file=fixture(t);const s=await listenGpuService({preferenceFile:file});t.after(()=>new Promise(r=>s.close(r)));
 const base='http://127.0.0.1:'+s.address().port;
 const response=await fetch(base+'/v1/control');const initial=await response.json();
 assert.equal(initial.requestedEnabled,false);
 const request=(csrf,origin,payload)=>fetch(base+'/v1/control',{method:'POST',headers:{
  'content-type':'application/json','x-leeway-csrf':csrf,'origin':origin},body:JSON.stringify(payload)});
 assert.equal((await request('bad',base,{requestedEnabled:true})).status,403);
 assert.equal((await request(initial.csrfToken,'https://attack.example',{requestedEnabled:true})).status,403);
 assert.equal(readGpuPreference(file).requestedEnabled,false);
 const selected=await request(initial.csrfToken,base,{requestedEnabled:true});
 assert.equal(selected.status,200);
 const actual=await selected.json();assert.equal(actual.requestedEnabled,true);
 assert.equal(actual.active,false);assert.equal(actual.dispatchAllowed,false);
 const attack=await fetch(base+'/v1/execute',{method:'POST',body:'{}'});
 assert.equal(attack.status,503);
 assert.equal((await attack.json()).dispatchExecuted,false);
 assert.equal(readGpuPreference(file).requestedEnabled,true);
 const reset=await request(initial.csrfToken,base,{requestedEnabled:false});
 assert.equal((await reset.json()).requestedEnabled,false);
});
