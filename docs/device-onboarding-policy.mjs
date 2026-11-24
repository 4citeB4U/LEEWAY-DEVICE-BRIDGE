/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.PUBLIC_ONBOARDING
TAG: LEEWAY.DEVICE.BRIDGE.PAGES.DEVICE_SETUP_HINT_ONLY.V1
5WH:
WHAT = Resolve initial public onboarding device and browser presentation without starting a download.
WHY = A phone must see phone enrollment, not Android workstation APK or desktop Chrome extension.
WHO = Creator and invited customer; original Zitadel/Runtime/native Bridge own all account/device proof.
WHERE = docs/device-onboarding-policy.mjs in 4citeB4U/LEEWAY-DEVICE-BRIDGE.
WHEN = 2026-11-24.
HOW = Pure hint/choice validation, fail closed for unsigned downloads and issuer-unbound signups.
LICENSE = Existing repository terms; no new issuer or device grant.
*/
const families=new Set(['Windows','Linux','Android','Apple']);
const formFactors=new Set(['desktop','phone','tablet','foldable']);
const browsers=new Set(['chrome','edge','firefox','safari','other']);
const denied=code=>{throw Error('LEEWAY_PAGES_ONBOARD_'+code)};
export function browserHint(userAgent='',touchPoints=0){
 const ua=String(userAgent||'');
 const family=/Android/i.test(ua)?'Android':
   /iPhone|iPad|iPod/i.test(ua)||(/Macintosh/i.test(ua)&&touchPoints>1)?'Apple':
   /Windows/i.test(ua)?'Windows':
   /Macintosh|Mac OS X/i.test(ua)?'Apple':
   /Linux|CrOS/i.test(ua)?'Linux':'Unknown';
 const browser=/EdgA?\/|EdgiOS\//i.test(ua)?'edge':
   /Firefox\/|FxiOS\//i.test(ua)?'firefox':
   /OPR\/|OPT\/|Opera/i.test(ua)?'other':
   /CriOS\/|Chrome\//i.test(ua)?'chrome':
   /Safari\//i.test(ua)?'safari':'other';
 const form=/iPad/i.test(ua)||(/Macintosh/i.test(ua)&&touchPoints>1)?'tablet':
   /Android/i.test(ua)&&!/Mobile/i.test(ua)?'tablet':
   /iPhone|iPod|Android/i.test(ua)?'phone':'desktop';
 return Object.freeze({family,browser,form,hintOnly:true,authority:'BROWSER_USER_AGENT_HINT_ONLY'});
}
export function allowedFormFactors(family){
 if(family==='Android')return ['phone','tablet','foldable'];
 if(family==='Apple')return ['desktop','phone','tablet'];
 if(family==='Windows'||family==='Linux')return ['desktop'];
 return [];
}
export function allowedBrowsers(family,form){
 if(family==='Android')return ['chrome','edge','firefox','other'];
 if(family==='Apple'&&form!=='desktop')return ['safari','chrome','edge','firefox','other'];
 if(family==='Apple')return ['safari','chrome','edge','firefox','other'];
 if(family==='Windows'||family==='Linux')return ['chrome','edge','firefox','other'];
 return [];
}
export function planDeviceBridgeOnboarding({
 detected,deviceForm,deviceRelation,leeWayAccount,github,browserChoices
}={}){
 if(!detected||!families.has(detected.family)||detected.hintOnly!==true)
   denied('OS_NOT_RECOGNIZED');
 const availableForms=allowedFormFactors(detected.family);
 if(!availableForms.includes(deviceForm)||!formFactors.has(deviceForm))denied('FORM_FACTOR_INVALID');
 if(!['first','additional'].includes(deviceRelation))denied('DEVICE_RELATION_REQUIRED');
 if(!['existing','new'].includes(leeWayAccount))denied('ACCOUNT_CHOICE_REQUIRED');
 if(deviceRelation==='additional'&&leeWayAccount==='new')denied('NEW_ACCOUNT_NOT_AN_ADDITIONAL_DEVICE');
 if(!['yes','no'].includes(github))denied('GITHUB_CHOICE_REQUIRED');
 if(!Array.isArray(browserChoices)||browserChoices.length>5||
    browserChoices.some(b=>!browsers.has(b))||
    new Set(browserChoices).size!==browserChoices.length||
    browserChoices.some(b=>!allowedBrowsers(detected.family,deviceForm).includes(b)))
   denied('BROWSER_CHOICES_INVALID');
 const companion=detected.family==='Android'?'Android':
   detected.family==='Apple'?'Apple':
   detected.family==='Windows'?'Windows':'Linux';
 return Object.freeze({
   deviceFamily:detected.family,deviceForm,companion,
   path:deviceRelation==='additional'?'ADDITIONAL_DEVICE':'FULL_NEW_DEVICE_SETUP',
   accountStep:leeWayAccount==='existing'?'SIGN_IN_EXISTING_ZITADEL_ACCOUNT':'REGISTER_VIA_ORIGINAL_ZITADEL',
   githubStep:github==='yes'?'LINK_EXISTING_GITHUB_WHEN_AUTHORIZED':'OPEN_OFFICIAL_GITHUB_SIGNUP',
   selectedBrowsers:Object.freeze([...browserChoices]),
   browserDelivery:detected.family==='Android'?'ANDROID_NATIVE_COMPANION_REQUIRED':
     detected.family==='Apple'&&deviceForm!=='desktop'?'APPLE_NATIVE_CONTAINING_APP_REQUIRED':
     'ORIGINAL_SIGNED_NATIVE_HOST_PLUS_APPROVED_STORE_EXTENSIONS_REQUIRED',
   ownerRole:'ISSUER_DECIDES',
   identity:'NOT_AUTHENTICATED',
   invite:'ORIGINAL_RUNTIME_INVITE_VERIFICATION_REQUIRED',
   signedNativePackage:'NOT_RELEASED',
   physicalDevice:'NOT_ENROLLED',
   requestedDownload:null,
   credentialsTransferred:false
 });
}
