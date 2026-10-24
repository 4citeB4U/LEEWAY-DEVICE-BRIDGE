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
