/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.PUBLIC_ONBOARDING_UI
TAG: LEEWAY.DEVICE.BRIDGE.PAGES.NO_DEBUG_DOWNLOAD_SETUP_V1
5WH:
WHAT = Guide Creator and invited customers through the correct phone/tablet/desktop setup on the real Bridge page.
WHY = Generic workstation downloads cannot substitute for a native signed companion and authenticated enrollment.
WHO = LeeWay Creator and invited customer; no client-side identity grants.
WHERE = docs/device-onboarding.js in 4citeB4U/LEEWAY-DEVICE-BRIDGE.
WHEN = 2026-11-24.
HOW = Trusted original browser is only a platform hint; show steps in-page with no APK link/POST/secrets.
LICENSE = Existing repository terms.
*/
import {browserHint,allowedFormFactors,allowedBrowsers,planDeviceBridgeOnboarding} from './device-onboarding-policy.mjs';
const form=document.getElementById('bridgeOnboardingForm');
const status=document.getElementById('bridgeOnboardStatus');
const deviceSelect=document.getElementById('bridgeDeviceForm');
const browserFields=document.getElementById('bridgeBrowserOptions');
const platformHint=document.getElementById('bridgePlatformHint');
const result=document.getElementById('bridgeOnboardSteps');
const hint=browserHint(navigator.userAgent,navigator.maxTouchPoints);
const label=(browser)=>({chrome:'Chrome',edge:'Microsoft Edge',firefox:'Firefox',safari:'Safari',other:'Other browser'})[browser]||browser;
const chosenRadio=name=>form.querySelector('input[name="'+name+'"]:checked')?.value||null;
const txt=(tag,value)=>{const e=document.createElement(tag);e.textContent=value;return e};
function choices(){
 deviceSelect.replaceChildren();
 for(const family of allowedFormFactors(hint.family)){
  const text=family==='foldable'?'Foldable Android phone':family==='tablet'?'Tablet':
    family==='phone'?'Phone':'Desktop / laptop';
  const option=document.createElement('option');
  option.value=family;option.textContent=text;
  deviceSelect.append(option);
 }
 deviceSelect.value=allowedFormFactors(hint.family).includes(hint.form)?hint.form:
   allowedFormFactors(hint.family)[0]||'';
 browserFields.replaceChildren();
 for(const browser of allowedBrowsers(hint.family,deviceSelect.value)){
  const item=txt('label','');
  const input=document.createElement('input');
  input.type='checkbox';input.name='browserChoices';input.value=browser;
  input.checked=browser===hint.browser;
  item.append(input,document.createTextNode(' '+label(browser)));
  browserFields.append(item);
 }
}
if(form&&status&&deviceSelect&&browserFields&&platformHint&&result){
 platformHint.textContent=hint.family==='Unknown'?
   'This browser does not identify a qualified LeeWay operating system. Native package selection is blocked.':
   'This browser appears to be '+hint.family+' · '+hint.form+' · '+label(hint.browser)+
   '. Confirm the actual device below. Exact device model and installed browsers are checked only by the original signed companion.';
 choices();
 deviceSelect.addEventListener('change',()=>{
  const selected=new Set([...browserFields.querySelectorAll('input:checked')].map(x=>x.value));
  browserFields.replaceChildren();
  for(const browser of allowedBrowsers(hint.family,deviceSelect.value)){
   const item=txt('label','');
   const input=document.createElement('input');
   input.type='checkbox';input.name='browserChoices';input.value=browser;
   input.checked=selected.has(browser);
   item.append(input,document.createTextNode(' '+label(browser)));
   browserFields.append(item);
  }
 });
 form.addEventListener('submit',event=>{
  event.preventDefault();
  result.hidden=false;
  result.replaceChildren();
  let plan;
  try{
   plan=planDeviceBridgeOnboarding({
    detected:hint,deviceForm:deviceSelect.value,
    deviceRelation:chosenRadio('deviceRelation'),
    leeWayAccount:chosenRadio('leeWayAccount'),
    github:chosenRadio('github'),
    browserChoices:[...browserFields.querySelectorAll('input:checked')].map(x=>x.value)
   });
  }catch(error){
   status.textContent='Correct setup selection: '+String(error?.message||'INVALID_SELECTION').slice(0,100);
   return;
  }
  status.textContent=(plan.path==='ADDITIONAL_DEVICE'?'Additional device':'Full device')+
   ' setup selected for '+plan.deviceFamily+' '+plan.deviceForm+
   '. No file has downloaded; no account or device is yet registered.';
  const list=txt('ol','');
  for(const [title,description] of [
   ['Confirm invitation and account',
     plan.accountStep==='REGISTER_VIA_ORIGINAL_ZITADEL'?
      'Your Creator invitation must be verified and new account registered by original Zitadel/Runtime. This backend connection is not currently admitted.':
      'Sign in to your original Zitadel-backed LeeWay account. A second device uses a fresh individual approval, never copied keys.'],
   ['GitHub account (developer workflows)',
     plan.githubStep==='LINK_EXISTING_GITHUB_WHEN_AUTHORIZED'?
      'Use the original approved GitHub App authorization when it becomes available. Do not enter a GitHub password into this webpage.':
      'Create a GitHub account directly at GitHub only if needed for your developer/workspace features. It is not a substitute for LeeWay sign-in.'],
   ['Qualified native companion for this exact device',
     'Original '+plan.companion+' Bridge installer must verify the device hardware, architecture, package signature and per-device enrollment. No signed production installer is published in this setup.'],
   ['Your browsers',
     plan.selectedBrowsers.length?plan.selectedBrowsers.map(label).join(', ')+
      ' selected. '+(plan.deviceFamily==='Android'?
      'Android browsers are not desktop native-messaging hosts. Use Android Bridge and its own qualified Tablet display.':
      'Browser store add-ons need separate user approval where supported.') :
      'No browser extensions selected. Native Bridge setup stays independent of browser preferences.'],
   ['Open authenticated Agent Virtual Tablet',
     'Only after original Runtime trusted-registry and Creator/customer scope readback. Your own Tablet opens; customer accounts cannot access Creator business records.']
  ]){
   const li=txt('li','');li.append(txt('strong',title),txt('p',description));list.append(li);
  }
  result.append(txt('h3','LeeWay Device Bridge · required secure setup'),list);
  const foot=txt('p','STATUS: ORIGINAL ZITADEL LOGIN / SIGNED INSTALLER / PHYSICAL DEVICE ENROLLMENT NOT YET CONNECTED. Developer debug APK is not an install option.');
  foot.className='db-setup-blocked';result.append(foot);
 });
 const downloadTiles=document.querySelectorAll('[data-setup-platform]');
 for(const tile of downloadTiles)tile.classList.toggle('db-current-platform',tile.dataset.setupPlatform?.toLowerCase()===hint.family.toLowerCase());
}
