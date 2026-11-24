/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.NATIVE_SETUP.TEST
TAG: LEEWAY.DEVICE.BRIDGE.NATIVE_OS_BROWSER_SELECTION.NEGATIVE_V1
5WH:
WHAT = Prove signed native installer routing cannot be spoofed by the website or browser user agent.
WHY = Browser detection is a hint; original OS and installed browsers require local adapter observations.
WHO = Creator-authorized Bridge source tester; synthetic fixtures are NOT actual enrollment.
WHERE = tests/browser/native-browser-install-plan.test.mjs.
WHEN = 2026-11-24.
HOW = Offline host-injected fixtures, denied selection and missing trusted release catalog tests.
LICENSE = Existing repository terms.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import {planOriginalNativeBrowserSetup} from '../../operator/browser/native-browser-install-plan.mjs';
const release=()=>({
 source:'ORIGINAL_DEVICE_BRIDGE_RELEASE_AUTHORITY',
 approvedChannels:['chrome','edge','firefox','android-companion',
   'apple-companion','windows-companion','linux-companion'].map(id=>({
   id,status:'NOT_PUBLISHED',signing:'NOT_VERIFIED',packageIntegrity:'NOT_PROBED'
 }))
});
const fixture=(family,form,browsers=['chrome','edge','firefox'])=>({
 discoverOS:async()=>({family,form,observation:'ORIGINAL_OS_ADAPTER_OBSERVED'}),
 discoverHardware:async()=>({observation:'ORIGINAL_OS_ADAPTER_OBSERVED',form,foldable:false,
   architecture:family==='Android'?'arm64':'x64',
   packageFormat:family==='Android'?'apk':family==='Apple'?(form==='desktop'?'pkg':'ipa'):
     family==='Linux'?'deb':'exe',distribution:'unspecified'}),
 discoverBrowsers:async()=>browsers.map(browser=>({
   browser,installed:true,observation:'ORIGINAL_OS_ADAPTER_OBSERVED'
 })),
 readApprovedReleases:async()=>release()
});
test('Windows Chrome/Edge/Firefox plan native companion first and never silently install',async()=>{
 const p=await planOriginalNativeBrowserSetup({
   ...fixture('Windows','desktop'),selectedBrowsers:['chrome','edge','firefox']
 });
 assert.equal(p.steps[0].target,'windows-companion');
 assert.equal(p.steps[1].state,'BROWSER_EXTENSION_NOT_PUBLISHED');
 assert.equal(p.steps[2].state,'BROWSER_EXTENSION_NOT_PUBLISHED');
 assert.equal(p.steps[3].state,'FIREFOX_NATIVE_HOST_ADAPTER_NOT_YET_QUALIFIED');
 assert.equal(p.actualInstallation,'NOT_EXECUTED');
 assert.equal(p.nativeHostRegistration,'NOT_EXECUTED');
 assert.equal(p.runtimeConnection,'NOT_ASSERTED');
});
test('Android Fold browsers never become desktop nativeMessaging hosts',async()=>{
 const p=await planOriginalNativeBrowserSetup({
   ...fixture('Android','phone'),selectedBrowsers:['chrome','edge','firefox']
 });
 assert.equal(p.steps[0].target,'android-companion');
 assert.ok(p.steps.slice(1).every(x=>x.state==='ANDROID_NATIVE_COMPANION_REQUIRED'));
 assert.equal(p.trustedRegistry,'NOT_ASSERTED');
});
test('Apple Safari iPhone uses containing companion; Linux Firefox requires original native host qualification',async()=>{
 const apple=await planOriginalNativeBrowserSetup({
   ...fixture('Apple','phone',['safari','chrome']),selectedBrowsers:['safari','chrome']
 });
 assert.equal(apple.steps[0].target,'apple-companion');
 assert.equal(apple.steps[1].state,'APPLE_CONTAINING_APP_REQUIRED');
 assert.equal(apple.steps[2].state,'IOS_EXTENSION_NOT_QUALIFIED');
 const linux=await planOriginalNativeBrowserSetup({
   ...fixture('Linux','desktop',['firefox']),selectedBrowsers:['firefox']
 });
 assert.equal(linux.steps[0].target,'linux-companion');
 assert.equal(linux.steps[1].state,'FIREFOX_NATIVE_HOST_ADAPTER_NOT_YET_QUALIFIED');
});
test('website supplied inventory, unsupported OS and duplicate choices fail closed',async()=>{
 await assert.rejects(()=>planOriginalNativeBrowserSetup({
  ...fixture('Android','phone'),discoverOS:async()=>({family:'Android',form:'phone'}),
  selectedBrowsers:['chrome']
 }),/OS_NOT_VERIFIED_BY_NATIVE_ADAPTER/);
 await assert.rejects(()=>planOriginalNativeBrowserSetup({
  ...fixture('Windows','desktop'),
  discoverBrowsers:async()=>[{browser:'chrome',installed:true,observation:'BROWSER_UA_HINT'}],
  selectedBrowsers:['chrome']
 }),/BROWSER_INVENTORY_UNBOUND/);
 await assert.rejects(()=>planOriginalNativeBrowserSetup({
  ...fixture('Windows','desktop'),selectedBrowsers:['chrome','chrome']
 }),/BROWSER_SELECTION_INVALID/);
 await assert.rejects(()=>planOriginalNativeBrowserSetup({
  ...fixture('Windows','desktop'),readApprovedReleases:async()=>({}),
  selectedBrowsers:['chrome']
 }),/APPROVED_RELEASE_CATALOG_UNBOUND/);
});
test('published store status without approved signature and integrity is not installable',async()=>{
 const r=release();
 for(const c of r.approvedChannels){c.status='PUBLISHED';c.signing='UNVERIFIED';}
 const p=await planOriginalNativeBrowserSetup({
   ...fixture('Windows','desktop',['chrome']),
   readApprovedReleases:async()=>r,selectedBrowsers:['chrome']
 });
 assert.equal(p.steps[0].state,'QUALIFIED_RELEASE_NOT_AVAILABLE');
 assert.equal(p.steps[1].state,'BROWSER_EXTENSION_NOT_PUBLISHED');
});

test('native setup refuses hardware data invented by browser and requires original OS adapter',async()=>{
 await assert.rejects(()=>planOriginalNativeBrowserSetup({
  ...fixture('Windows','desktop'),discoverHardware:async()=>({
    observation:'BROWSER_UA_HINT',architecture:'x64',form:'desktop',
    packageFormat:'exe',foldable:false
  }),selectedBrowsers:['chrome']
 }),/DEVICE_HARDWARE_UNBOUND/);
 await assert.rejects(()=>planOriginalNativeBrowserSetup({
  ...fixture('Android','phone'),discoverHardware:async()=>({
    observation:'ORIGINAL_OS_ADAPTER_OBSERVED',architecture:'x64',form:'phone',
    packageFormat:'exe',foldable:false
  }),selectedBrowsers:['chrome']
 }),/DEVICE_HARDWARE_UNBOUND/);
});
test('native setup refuses to claim owner installer or device enrollment for Fold without signed bytes',async()=>{
 const f=fixture('Android','phone');
 f.discoverHardware=async()=>({
  observation:'ORIGINAL_OS_ADAPTER_OBSERVED',form:'phone',foldable:true,
  architecture:'arm64',packageFormat:'apk',distribution:'unspecified'
 });
 const result=await planOriginalNativeBrowserSetup({...f,selectedBrowsers:['chrome']});
 assert.equal(result.deviceTarget.foldable,true);
 assert.equal(result.deviceTarget.architecture,'arm64');
 assert.equal(result.deviceTarget.qualifiedRelease,'NOT_QUALIFIED');
 assert.equal(result.deviceTarget.signatureReverified,'NOT_EXECUTED');
 assert.equal(result.steps[0].state,'QUALIFIED_RELEASE_NOT_AVAILABLE');
});
