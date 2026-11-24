/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.PUBLIC.DEVICE_BRIDGE.ONBOARDING
TAG: LEEWAY.DEVICE_BRIDGE.PLATFORM_AND_ACCOUNT_FIRST_SETUP_V1
5WH:
WHAT = Guide Creator or invited customer from Device Bridge public homepage to exact OS/browser setup.
WHY = The debug Android APK and generic Workstation links must never substitute for native signed enrollment.
WHO = Original Zitadel/Runtime/Device Bridge are sole admission authorities; browser JS is a hint only.
WHERE = docs/onboarding.js.
WHEN = 2026-11-24.
HOW = User-selected platform/account/browser -> honest blocked package/registration state; no API token or device privileges.
LICENSE = Existing repository terms.
*/
(function(root){
'use strict';
const doc=root.document;
const form=doc?.getElementById('dbSetupForm');
if(!form)return;
const account=doc.getElementById('dbSetupAccount'),device=doc.getElementById('dbSetupDevice');
const status=doc.getElementById('dbSetupResult'),detected=doc.getElementById('dbDetectedDevice');
const ua=String(root.navigator?.userAgent||'');
const touch=Number(root.navigator?.maxTouchPoints||0);
function browser(){
 if(/EdgA?\/|EdgiOS\//i.test(ua))return 'edge';
 if(/FxiOS\/|Firefox\//i.test(ua))return 'firefox';
 if(/CriOS\/|Chrome\//i.test(ua))return 'chrome';
 if(/Safari\//i.test(ua))return 'safari';
 return null;
}
function platform(){
 if(/Android/i.test(ua))return Math.min(root.screen?.width||390,root.screen?.height||844)>690?
  'android-tablet':'android-phone';
 if(/iPad/i.test(ua)||(/Macintosh/i.test(ua)&&touch>1))return 'apple-tablet';
 if(/iPhone|iPod/i.test(ua))return 'apple-phone';
 if(/Windows/i.test(ua))return 'windows-desktop';
 if(/Macintosh/i.test(ua))return 'apple-desktop';
 if(/Linux|X11/i.test(ua))return 'linux-desktop';
 return null;
}
const currentPlatform=platform(),currentBrowser=browser();
if(currentPlatform)device.value=currentPlatform;
detected.textContent=currentPlatform?
 'Browser suggests '+currentPlatform.replace('-', ' ')+' · '+(currentBrowser||'other browser')+'. Confirm your actual device. Native hardware/ABI and trusted identity are not verified here.':
 'Device OS could not be recognized by this browser. Select the actual device; native verification remains required.';
const check=currentBrowser&&form.querySelector('input[name="leewayBrowser"][value="'+currentBrowser+'"]');
if(check)check.checked=true;
function show(title,items){
 status.replaceChildren();
 const head=doc.createElement('strong');head.textContent=title;status.append(head);
 for(const message of items){
  const p=doc.createElement('p');p.textContent=message;status.append(p);
 }
}
form.addEventListener('submit',event=>{
 event.preventDefault();
 const a=account.value,d=device.value;
 const selected=Array.from(form.querySelectorAll('input[name="leewayBrowser"]:checked')).map(x=>x.value);
 const relation=form.querySelector('input[name="leewayDeviceRelation"]:checked')?.value||'first';
 const github=form.querySelector('input[name="leewayGithub"]:checked')?.value||'unset';
 if(!['new','existing'].includes(a)||![
   'android-phone','android-tablet','apple-phone','apple-tablet',
   'windows-desktop','apple-desktop','linux-desktop'
 ].includes(d))return show('A valid account and device selection is required.',[]);
 if(relation==='additional'&&a!=='existing')
   return show('Additional-device setup requires an existing LeeWay account.',
      ['Choose full setup for a new account. Every new device still receives its own native passport.']);
 const os=d.startsWith('android')?'Android':d.startsWith('apple')?'Apple':
  d.startsWith('windows')?'Windows':'Linux';
 const mobile=d.endsWith('phone')||d.endsWith('tablet');
 const step=[
  (a==='new'?'Invitation acceptance and new LeeWay account':'Existing LeeWay account sign-in')+
   ' must be verified through the original Zitadel-backed Runtime.',
  (relation==='additional'?'This additional device needs fresh consent and an independent passport.':
   'Full native device registration and owner consent are required.')+
   ' Browser detection alone cannot enroll a device.',
  os+' '+(mobile?'mobile':'desktop')+
   ' signed Bridge companion: NOT RELEASED/NOT QUALIFIED for direct public installation.',
  selected.length? 'Chosen browser(s): '+selected.join(', ')+'. Official extension-store authorization is separate from native-device enrollment.':
   'No browser selected; the native device still requires its original companion.',
  github==='no'?'GitHub developer-account setup may be completed on github.com/signup with separate consent.':
   github==='yes'?'Any GitHub integration requires separate approved GitHub App authorization.':
   'GitHub developer integration is optional for basic device registration.',
  'Agent Virtual Tablet access and Creator/customer permissions require an original Runtime authenticated session and device/Continuum readback.'
 ];
 if(mobile&&selected.includes('chrome'))
  step.push('Chrome on mobile is not a desktop Chrome native-messaging extension host. The original mobile Bridge companion must supply device capabilities.');
 show('Setup plan for '+d.replace('-', ' ')+': waiting for original identity and native release authority',step);
});
})(globalThis);
