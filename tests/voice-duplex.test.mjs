/*
LEEWAY HEADER — DO NOT REMOVE
REGION: DEVICE.BRIDGE.VOICE.TEST
TAG: VOICE_BOUNDARY_NO_AUTH_BYPASS
WHO: LeeWay Industries; WHAT: verify readonly voice integration
WHY: discover voice without C3 device-command bypass
WHERE: tests; WHEN: 2026-10-24; HOW: network mocks, no devices.
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import {getVoiceDuplexStatus,openLocalVoiceDuplex,startLocalVoiceDuplex,VOICE_DUPLEX_URL} from '../operator/voice-duplex.mjs';
test('voice status is readonly and never claims production admission',async()=>{
 const status=await getVoiceDuplexStatus({fetchImpl:async()=>({ok:true,status:200})});
 assert.equal(status.connected,true);
 assert.equal(status.productionCertified,false);
 assert.equal(status.deviceExecutionAuthorized,false);
 assert.equal(status.results.studio.available,true);
});
test('voice discovery unavailable is clear and fail-closed',async()=>{
 const status=await getVoiceDuplexStatus({fetchImpl:async()=>{throw Error('offline')}});
 assert.equal(status.connected,false);
 assert.equal(status.deviceCommands,'EXISTING_C3_ADMISSION_REQUIRED');
});
test('voice launch is an explicit local-only fixed URL, not a device execution path',()=>{
 let seen;
 const r=openLocalVoiceDuplex({platform:'linux',spawnImpl:(exe,args,opts)=>{
   seen={exe,args,opts};return{unref(){}};
 }});
 assert.equal(seen.exe,'xdg-open');
 assert.deepEqual(seen.args,[VOICE_DUPLEX_URL]);
 assert.equal(r.notProductionAdmission,true);
});

test('voice startup requires an explicit configured Voice Fabric root',async()=>{
  await assert.rejects(startLocalVoiceDuplex({root:''}),/LEEWAY_VOICE_FABRIC_ROOT_REQUIRED/);
});
test('voice startup launches only the inspected local Voice Fabric startup entrypoint',async()=>{
  const {mkdtemp,mkdir,writeFile,rm}=await import('node:fs/promises');
  const os=await import('node:os');
  const path=await import('node:path');
  const temp=await mkdtemp(path.join(os.tmpdir(),'leeway-voice-bridge-'));
  try{
    await mkdir(path.join(temp,'scripts'));
    await writeFile(path.join(temp,'scripts','voice-duplex-start.mjs'),'// local fixture');
    let invocation;
    const result=await startLocalVoiceDuplex({root:temp,spawnImpl:(exe,args,opts)=>{
      invocation={exe,args,opts};return{pid:91,unref(){}};
    }});
    assert.equal(result.initiated,true);
    assert.equal(result.ready,'NOT_YET_VERIFIED');
    assert.equal(result.deviceCommandsAuthorized,false);
    assert.equal(invocation.exe,process.execPath);
    assert.equal(invocation.args[0],path.join(temp,'scripts','voice-duplex-start.mjs'));
    assert.equal(invocation.opts.shell,false);
  }finally{await rm(temp,{recursive:true,force:true})}
});

test('Device Bridge consumes the canonical voice binding read-only',async()=>{
 const {getLocalVoiceBinding}=await import('../operator/voice-duplex.mjs');
 const data=await getLocalVoiceBinding({fetchImpl:async()=>({ok:true,json:async()=>({
  authority:'LEEWAY_VOICE_FABRIC',binding:{voicePackageId:'kokoro-am_michael'},
  recordRevision:'verified-revision',csrf:'DO_NOT_EXPOSE'})})});
 assert.equal(data.status,'CANONICAL_VOICE_READBACK');
 assert.equal(data.voicePackageId,'kokoro-am_michael');
 assert.equal(data.revision,'verified-revision');
 assert.equal(data.csrf,undefined);
 assert.equal(data.deviceExecutionAuthorized,false);
 assert.equal(data.remoteDeviceSyncQualified,false);
});
