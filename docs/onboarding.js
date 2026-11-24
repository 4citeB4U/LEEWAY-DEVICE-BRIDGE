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
// Apple is a real setup lane on this Device Bridge page. Never redirect an
// unverified customer to GitHub Codespaces or an unsigned developer IPA.
const applePanel=doc.getElementById('dbAppleSetup');
const appleGuide=doc.getElementById('dbAppleSetupInstructions');
const appleHome=doc.getElementById('dbAppleHomeInstall');
const appleNative=doc.getElementById('dbAppleBridgeStatus');
const appleSelected=()=>String(device.value).startsWith('apple-');
const appleStandalone=()=>root.matchMedia?.('(display-mode: standalone)')?.matches||
 root.navigator?.standalone===true;
function updateAppleLane(){
 if(applePanel)applePanel.hidden=!appleSelected();
}
function describeApple(title,steps){
 if(!appleGuide)return;
 appleGuide.replaceChildren();
 const head=doc.createElement('strong');head.textContent=title;appleGuide.append(head);
 for(const step of steps){
  const line=doc.createElement('p');line.textContent=step;appleGuide.append(line);
 }
}
device.addEventListener('change',updateAppleLane);
updateAppleLane();
appleHome?.addEventListener('click',()=>{
 if(!appleSelected())return;
 const mobile=device.value!=='apple-desktop';
 if(appleStandalone()){
  describeApple('LeeWay Home Screen web app is already open',[
   'You are running the installed LeeWay browser shell. Continue Device Bridge account setup above.',
   'The browser icon does not mean the native Apple companion, Device Bridge passport, Runtime or Agent Virtual Tablet is connected.'
  ]);
 }else if(mobile){
  describeApple('Install LeeWay web access directly from Safari — no GitHub',[
   '1. On this Apple device, open this SAME LeeWay Device Bridge webpage in Safari.',
   '2. Tap Safari Share, then Add to Home Screen (you may need to scroll the actions list).',
   '3. If shown, select Open as Web App, then Add. Open the new LeeWay Bridge icon.',
   '4. Return to the sign-in setup above. Native device enrollment and the full Tablet remain blocked until the original Runtime and a properly signed Apple companion are connected.'
  ]);
 }else{
  describeApple('Add LeeWay web access on Apple desktop — no GitHub',[
   'In Safari on macOS, choose File > Add to Dock when available. In a compatible browser use its Install App action.',
   'The Dock/web app runs this original Bridge webpage. Mac native device capabilities require a separately approved native adapter and a verified original Runtime session.'
  ]);
 }
 appleGuide?.scrollIntoView?.({behavior:'smooth',block:'nearest'});
});
appleNative?.addEventListener('click',()=>{
 if(!appleSelected())return;
 describeApple('Native Apple Device Bridge — signed release not yet admitted',[
  'The Apple Home Screen app provides browser access only; it cannot become a fully privileged iOS device bridge or grant Metal/native device control.',
  'The existing unsigned iLoader IPA is a developer package, not a universally approved customer installer. Do not install or replace a working companion from this public page.',
  'Next gate: original Zitadel account, owner consent, device passport, signed Apple installer, Runtime/Bridge readback, then authorized Agent Virtual Tablet display. No GitHub sign-in or developer workstation is required for ordinary customers.'
 ]);
 appleGuide?.scrollIntoView?.({behavior:'smooth',block:'nearest'});
});
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
 if(os==='Apple')updateAppleLane();
 show('Setup plan for '+d.replace('-', ' ')+': waiting for original identity and native release authority',step);
});
})(globalThis);
