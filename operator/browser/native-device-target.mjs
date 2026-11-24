/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.NATIVE_DEVICE_PACKAGE_QUALIFICATION
TAG: LEEWAY.ORIGINAL_BRIDGE.OS_DEVICE_VARIANT_PACKAGE_SELECTION.V1
5WH:
WHAT = Validate exact OS/form-factor/CPU ABI/packaging before original native installer chooses a signed build.
WHY = A Galaxy Fold, iPad, Apple desktop, Windows PC, and China Linux distribution need different native packages.
WHO = Original authorized OS adapter and canonical signed native release custodian.
WHERE = operator/browser/native-device-target.mjs.
WHEN = 2026-11-24.
HOW = Match host-observed hardware against strictly qualified original release variants, fail closed.
LICENSE = Original repository terms; no package is signed or installed here.
*/
const architectures=new Set(['x64','arm64','armv7','riscv64','loongarch64']);
const formats={
 Windows:new Set(['exe','msix']),
 Linux:new Set(['deb','rpm','appimage']),
 Android:new Set(['apk','aab']),
 Apple:new Set(['pkg','dmg','ipa'])
};
const chinaLinux=new Set(['deepin','uos','openkylin','kylin','openeuler','other-linux','unspecified']);
const deny=reason=>{throw Error('LEEWAY_NATIVE_PACKAGE_'+reason)};
const sha256=value=>typeof value==='string'&&/^[a-f0-9]{64}$/i.test(value);
export function qualifyNativeDeviceTarget({os,hardware,release}={}){
 if(!os||!formats[os.family]||!['desktop','phone','tablet'].includes(os.form)||
    os.observation!=='ORIGINAL_OS_ADAPTER_OBSERVED')deny('OS_UNBOUND');
 if(!hardware||hardware.observation!=='ORIGINAL_OS_ADAPTER_OBSERVED'||
    !architectures.has(hardware.architecture)||!formats[os.family].has(hardware.packageFormat)||
    !['desktop','phone','tablet'].includes(hardware.form)||hardware.form!==os.form||
    typeof hardware.foldable!=='boolean')deny('DEVICE_HARDWARE_UNBOUND');
 if((os.family==='Windows'||os.family==='Linux')&&os.form!=='desktop'||
    os.family==='Android'&&os.form==='desktop'||
    os.family==='Apple'&&os.form!=='desktop'&&hardware.packageFormat!=='ipa'||
    os.family==='Apple'&&os.form==='desktop'&&hardware.packageFormat==='ipa'||
    hardware.foldable&&!(os.family==='Android'&&os.form==='phone'))
    deny('OS_FORM_PACKAGE_MISMATCH');
 const distribution=hardware.distribution||'unspecified';
 if(os.family==='Linux'&&!chinaLinux.has(distribution))deny('LINUX_DISTRIBUTION_UNKNOWN');
 if(os.family!=='Linux'&&distribution!=='unspecified')deny('DISTRIBUTION_OS_MISMATCH');
 if(!release||release.source!=='ORIGINAL_DEVICE_BRIDGE_RELEASE_AUTHORITY'||
    !Array.isArray(release.approvedChannels))deny('ORIGINAL_RELEASE_CUSTODY_UNBOUND');
 const channel=os.family==='Android'?'android-companion':os.family==='Apple'?'apple-companion':
   os.family==='Windows'?'windows-companion':'linux-companion';
 const catalog=release.approvedChannels.find(x=>x?.id===channel);
 const matched=Array.isArray(catalog?.variants)?
   catalog.variants.filter(x=>x&&x.osFamily===os.family&&x.architecture===hardware.architecture&&
      x.packageFormat===hardware.packageFormat&&
      (os.family!=='Linux'||x.distribution===distribution)&&
      x.status==='PUBLISHED'&&x.signing==='APPROVED'&&
      x.packageIntegrity==='VERIFIED'&&sha256(x.sha256)):[];
 if(matched.length>1)deny('AMBIGUOUS_NATIVE_PACKAGE');
 return Object.freeze({
  channel,osFamily:os.family,form:os.form,
  architecture:hardware.architecture,packageFormat:hardware.packageFormat,
  distribution,foldable:hardware.foldable,
  qualifiedRelease:matched.length===1?'SIGNED_VARIANT_SOURCE_MATCH':'NOT_QUALIFIED',
  packageIdentity:matched.length===1?matched[0].sha256.toLowerCase():null,
  actualBytesReverified:'NOT_EXECUTED',
  signatureReverified:'NOT_EXECUTED',
  installation:'NOT_EXECUTED'
 });
}
