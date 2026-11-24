/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.NATIVE_SETUP
TAG: LEEWAY.DEVICE.BRIDGE.NATIVE_OS_BROWSER_SELECTION.V1
5WH:
WHAT = Bind owner-selected browsers to an OS-adapter-observed setup plan in the original Device Bridge.
WHY = A website can suggest browsers but cannot inventory installed apps, enroll devices, or install add-ons silently.
WHO = Original signed native Bridge installer, authenticated user and qualified OS adapter.
WHERE = operator/browser/native-browser-install-plan.mjs.
WHEN = 2026-11-24.
HOW = Host-injected OS/browser inventory and current official signed release catalog, no write side effects.
LICENSE = Original repository terms; no new signer or production admission.
*/
import {qualifyNativeDeviceTarget} from './native-device-target.mjs';
const osFamilies=new Set(['Windows','Linux','Android','Apple']);
const browsers=new Set(['chrome','edge','firefox','safari','other']);
const desktop=new Set(['Windows','Linux']);
function denied(reason){throw Error('LEEWAY_NATIVE_SETUP_'+reason)}
export async function planOriginalNativeBrowserSetup({
 discoverOS,discoverHardware,discoverBrowsers,readApprovedReleases,selectedBrowsers
}={}){
 if(typeof discoverOS!=='function'||typeof discoverHardware!=='function'||typeof discoverBrowsers!=='function'||
    typeof readApprovedReleases!=='function')
    denied('OS_ADAPTER_OR_CATALOG_UNBOUND');
 if(!Array.isArray(selectedBrowsers)||selectedBrowsers.length>4||
    selectedBrowsers.some(id=>!browsers.has(id))||
    new Set(selectedBrowsers).size!==selectedBrowsers.length)
    denied('BROWSER_SELECTION_INVALID');
 const os=await discoverOS();
 if(!os||!osFamilies.has(os.family)||!['desktop','phone','tablet'].includes(os.form)||
    os.observation!=='ORIGINAL_OS_ADAPTER_OBSERVED')
    denied('OS_NOT_VERIFIED_BY_NATIVE_ADAPTER');
 const hardware=await discoverHardware({family:os.family,form:os.form});
 const installed=await discoverBrowsers({family:os.family});
 if(!Array.isArray(installed)||installed.length>20||
    installed.some(x=>!x||!browsers.has(x.browser)||
      x.observation!=='ORIGINAL_OS_ADAPTER_OBSERVED'||typeof x.installed!=='boolean'))
    denied('BROWSER_INVENTORY_UNBOUND');
 const catalog=await readApprovedReleases();
 if(!catalog||catalog.source!=='ORIGINAL_DEVICE_BRIDGE_RELEASE_AUTHORITY'||
    !Array.isArray(catalog.approvedChannels))
    denied('APPROVED_RELEASE_CATALOG_UNBOUND');
 const installedMap=new Map(installed.map(x=>[x.browser,x.installed]));
 const deviceTarget=qualifyNativeDeviceTarget({os,hardware,release:catalog});
 const companion=deviceTarget.channel;
 const catalogMap=new Map(catalog.approvedChannels.map(x=>[x.id,x]));
 function state(id){
   const c=catalogMap.get(id);
   if(c?.signing==='APPROVED'&&c?.status==='PUBLISHED'&&c?.packageIntegrity==='VERIFIED')
     return 'APPROVED_RELEASE_AVAILABLE';
   return 'QUALIFIED_RELEASE_NOT_AVAILABLE';
 }
 const steps=[Object.freeze({
   type:'NATIVE_COMPANION',target:companion,
   state:deviceTarget.qualifiedRelease==='SIGNED_VARIANT_SOURCE_MATCH'?
     'SIGNED_PACKAGE_BYTES_AND_SIGNATURE_REVALIDATION_REQUIRED':'QUALIFIED_RELEASE_NOT_AVAILABLE',
   humanConsent:'REQUIRED',
   execution:'NOT_PERFORMED',
   note:'Install signed original Device Bridge; perform individual Zitadel sign-in, owner consent and trusted passport enrollment.'
 })];
 for(const browser of selectedBrowsers){
   let availability='BROWSER_NOT_INSTALLED';
   if(browser==='other')availability='OTHER_BROWSER_NATIVE_HOST_NOT_QUALIFIED';
   else if(installedMap.get(browser)){
     if(os.family==='Android')
       availability='ANDROID_NATIVE_COMPANION_REQUIRED';
     else if(os.family==='Apple'&&os.form!=='desktop')
       availability=browser==='safari'?'APPLE_CONTAINING_APP_REQUIRED':'IOS_EXTENSION_NOT_QUALIFIED';
     else if(browser==='safari')
       availability=os.family==='Apple'?'APPLE_CONTAINING_APP_REQUIRED':'UNSUPPORTED_ON_THIS_OS';
     else if(browser==='firefox')
       availability='FIREFOX_NATIVE_HOST_ADAPTER_NOT_YET_QUALIFIED';
     else
       availability=state(browser)==='APPROVED_RELEASE_AVAILABLE'?
         'STORE_INSTALL_AND_NATIVE_HOST_REGISTRATION_REQUIRED':'BROWSER_EXTENSION_NOT_PUBLISHED';
   }
   steps.push(Object.freeze({
     type:'BROWSER',target:browser,state:availability,
     humanConsent:'REQUIRED',
     execution:'NOT_PERFORMED'
   }));
 }
 return Object.freeze({
   osFamily:os.family,form:os.form,companion,
   deviceTarget,
   selection: Object.freeze([...selectedBrowsers]),
   steps:Object.freeze(steps),
   actualInstallation:'NOT_EXECUTED',
   trustedRegistry:'NOT_ASSERTED',
   nativeHostRegistration:'NOT_EXECUTED',
   runtimeConnection:'NOT_ASSERTED'
 });
}
