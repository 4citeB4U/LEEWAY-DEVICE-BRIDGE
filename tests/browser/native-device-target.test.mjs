/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.NATIVE_DEVICE_PACKAGE_QUALIFICATION.TEST
TAG: LEEWAY.ORIGINAL_BRIDGE.SIGNED_NATIVE_HARDWARE_TARGET_TEST.V1
5WH:
WHAT = Qualify exact original OS-native hardware and signed package identity without hardware execution.
WHY = Distinguish Windows/Linux/Android Fold/Apple iPhone/iPad/macOS and China Linux distributions.
WHO = Creator-authorized outside contributor, not Agent Lee or independent Veritas.
WHERE = tests/browser/native-device-target.test.mjs.
WHEN = 2026-11-24.
HOW = Synthetic adapter observations, signed-release negative conditions and no inferred install.
LICENSE = Existing repository terms.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import {qualifyNativeDeviceTarget as qualify} from '../../operator/browser/native-device-target.mjs';
const os=(family,form)=>({family,form,observation:'ORIGINAL_OS_ADAPTER_OBSERVED'});
const hw=(form,architecture,packageFormat,distribution='unspecified',foldable=false)=>({
 observation:'ORIGINAL_OS_ADAPTER_OBSERVED',form,architecture,packageFormat,distribution,foldable
});
const release=(variants=[])=>({source:'ORIGINAL_DEVICE_BRIDGE_RELEASE_AUTHORITY',approvedChannels:[
 {id:'android-companion',variants},
 {id:'windows-companion',variants},
 {id:'linux-companion',variants},
 {id:'apple-companion',variants}
]});
const target=(a,b,c=release())=>qualify({os:a,hardware:b,release:c});
test('Windows x64 native EXE and ARM64 Android APK are different qualified targets',()=>{
 const win=target(os('Windows','desktop'),hw('desktop','x64','exe'));
 const android=target(os('Android','phone'),hw('phone','arm64','apk'));
 assert.equal(win.channel,'windows-companion');
 assert.equal(android.channel,'android-companion');
 assert.equal(win.qualifiedRelease,'NOT_QUALIFIED');
 assert.equal(android.actualBytesReverified,'NOT_EXECUTED');
});
test('Android foldable can be phone-shaped while OS remains Android, never Samsung operating-system category',()=>{
 const fold=target(os('Android','phone'),hw('phone','arm64','apk','unspecified',true));
 assert.equal(fold.foldable,true);
 assert.equal(fold.form,'phone');
 assert.equal(fold.osFamily,'Android');
 assert.equal(fold.installation,'NOT_EXECUTED');
 assert.throws(()=>target(os('Windows','desktop'),hw('desktop','x64','exe','unspecified',true)),/OS_FORM_PACKAGE_MISMATCH/);
});
test('Chinese Linux desktop distro variants are qualified through original Linux adapter only',()=>{
 for(const distro of ['deepin','uos','openkylin','kylin','openeuler','other-linux']){
  const fmt=distro==='openeuler'?'rpm':'deb';
  const p=target(os('Linux','desktop'),hw('desktop','loongarch64',fmt,distro));
  assert.equal(p.channel,'linux-companion');
  assert.equal(p.distribution,distro);
  assert.equal(p.qualifiedRelease,'NOT_QUALIFIED');
 }
 assert.throws(()=>target(os('Linux','desktop'),hw('desktop','x64','deb','proprietary-unknown-os')),/LINUX_DISTRIBUTION_UNKNOWN/);
});
test('iPhone/iPad require Apple mobile IPA, macOS desktop requires signed pkg/dmg format',()=>{
 const phone=target(os('Apple','phone'),hw('phone','arm64','ipa'));
 const tablet=target(os('Apple','tablet'),hw('tablet','arm64','ipa'));
 const desktop=target(os('Apple','desktop'),hw('desktop','arm64','pkg'));
 assert.equal(phone.channel,'apple-companion');
 assert.equal(tablet.form,'tablet');
 assert.equal(desktop.packageFormat,'pkg');
 assert.throws(()=>target(os('Apple','phone'),hw('phone','arm64','pkg')),/OS_FORM_PACKAGE_MISMATCH/);
});
test('wrong ABI, package format, browser-source claim and wrong distribution are denied',()=>{
 assert.throws(()=>target(os('Windows','desktop'),hw('desktop','mips','exe')),/DEVICE_HARDWARE_UNBOUND/);
 assert.throws(()=>target(os('Android','phone'),hw('phone','arm64','msix')),/DEVICE_HARDWARE_UNBOUND/);
 assert.throws(()=>target(os('Windows','desktop'),{...hw('desktop','x64','exe'),observation:'BROWSER_HINT'}),/DEVICE_HARDWARE_UNBOUND/);
 assert.throws(()=>target(os('Android','phone'),hw('phone','arm64','apk','deepin')),/DISTRIBUTION_OS_MISMATCH/);
 assert.throws(()=>target(os('Android','desktop'),hw('desktop','arm64','apk')),/OS_FORM_PACKAGE_MISMATCH/);
});
test('only exact matching signed variant source identity is selected; never infer install',()=>{
 const variant={osFamily:'Linux',architecture:'loongarch64',packageFormat:'deb',distribution:'deepin',
  status:'PUBLISHED',signing:'APPROVED',packageIntegrity:'VERIFIED',sha256:'a'.repeat(64)};
 const p=target(os('Linux','desktop'),hw('desktop','loongarch64','deb','deepin'),release([variant]));
 assert.equal(p.qualifiedRelease,'SIGNED_VARIANT_SOURCE_MATCH');
 assert.equal(p.packageIdentity,'a'.repeat(64));
 assert.equal(p.signatureReverified,'NOT_EXECUTED');
 assert.equal(p.installation,'NOT_EXECUTED');
 const missing=target(os('Linux','desktop'),hw('desktop','x64','deb','deepin'),release([variant]));
 assert.equal(missing.qualifiedRelease,'NOT_QUALIFIED');
 const bad=target(os('Linux','desktop'),hw('desktop','loongarch64','deb','deepin'),
  release([{...variant,signing:'NOT_APPROVED'}]));
 assert.equal(bad.qualifiedRelease,'NOT_QUALIFIED');
 assert.throws(()=>target(os('Linux','desktop'),hw('desktop','loongarch64','deb','deepin'),release([variant,variant])),/AMBIGUOUS_NATIVE_PACKAGE/);
});
