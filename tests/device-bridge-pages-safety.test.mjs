/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.PAGES.QUALIFICATION
TAG: LEEWAY.DEVICE.BRIDGE.NO_DEBUG_APK_USER_ONBOARDING.TEST_V1
5WH:
WHAT = Reject Android debug APK delivery and test user-first multi-OS Device Bridge setup.
WHY = Public Android browser must see proper enrollment and not a generic workstation download.
WHO = Creator-authorized outside contributor, NOT Agent Lee/independent Veritas.
WHERE = tests/device-bridge-pages-safety.test.mjs.
WHEN = 2026-11-24.
HOW = Node source and functional policy tests; no real account/device installed or connected.
LICENSE = Existing repository terms.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {browserHint,allowedFormFactors,allowedBrowsers,planDeviceBridgeOnboarding} from '../docs/device-onboarding-policy.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const page=read('../docs/index.html'),app=read('../docs/app.js');
const dash=read('../docs/dashboard-ui.js'),meta=JSON.parse(read('../docs/package-manifest.json'));
const latest=JSON.parse(read('../docs/downloads/leeway-device-bridge-android-latest.json'));
const sw=read('../docs/sw.js'),pwa=JSON.parse(read('../docs/manifest.webmanifest'));
const windows=browserHint('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/150.0 Safari/537.36');
const android=browserHint('Mozilla/5.0 (Linux; Android 17; SM-F956U) AppleWebKit/537.36 Chrome/150.0 Mobile Safari/537.36');
const andEdge=browserHint('Mozilla/5.0 (Linux; Android 17; Fold) Chrome/150.0 Mobile Safari/537.36 EdgA/150.0');
const iphone=browserHint('Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 Version/19.0 Mobile/15E148 Safari/604.1');
const ipad=browserHint('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/19.0 Safari/605.1.15',5);
const linux=browserHint('Mozilla/5.0 (X11; Linux x86_64; rv:150.0) Gecko/20100101 Firefox/150.0');
const plan=(detected,overrides={})=>planDeviceBridgeOnboarding({
 detected,deviceForm:detected.form,deviceRelation:'first',
 leeWayAccount:'existing',github:'yes',browserChoices:[detected.browser],...overrides
});
test('public Bridge site is account-first mobile setup and advanced console, not Android workstation download',()=>{
 assert.match(page,/id="bridgeSetup"/);
 assert.match(page,/id="bridgeOnboardingForm"/);
 assert.match(page,/name="deviceRelation"/);
 assert.match(page,/name="leeWayAccount"/);
 assert.match(page,/name="github"/);
 assert.match(page,/id="dbAdvanced"/);
 assert.match(page,/Android phone \/ tablet/);
 assert.match(page,/href="#bridgeSetup"/);
 assert.ok(page.indexOf('id="bridgeSetup"')<page.indexOf('id="dbAdvanced"'));
 assert.doesNotMatch(page,/<a[^>]+\.apk[^>]*>/i);
 assert.doesNotMatch(page,/Android Workstation<\/strong>|Download Extension<\/a>|DOWNLOAD ANDROID EXTENSION<\/a>/);
});
test('no script can recreate a public Android debug APK link using package metadata',()=>{
 assert.doesNotMatch(app,/href="[^"]*downloadUrl|href="\$\{esc\(pkg\.downloadUrl\)\}/);
 assert.match(app,/Device Bridge enrollment comes before a native installer/);
 assert.doesNotMatch(dash,/link\.href=new URL\(android\.downloadUrl/);
 const v=meta.packages.find(p=>p.platform==='android');
 assert.equal(v.channel,'development');
 assert.equal(v.downloadUrl,null);
 assert.equal(v.status,'DEVELOPMENT_ONLY_NOT_PUBLIC_RELEASE');
 assert.equal(meta.platformRoutes.android.state,'SOURCE_ONLY');
 assert.equal(latest.downloadUrl,null);
 assert.equal(latest.ownerAuthorizedDownload,false);
 assert.equal(latest.releaseSigning,'NOT_PROVEN');
 assert.equal(existsSync(new URL('../docs/downloads/leeway-device-bridge-android-latest-debug.apk',import.meta.url)),false,
  'unapproved debug APK must not be published in GitHub Pages docs/');
});
test('Android Fold and Edge Android get native Android companion path, never desktop Chrome extension',()=>{
 assert.equal(android.family,'Android');
 assert.equal(android.form,'phone');
 assert.equal(andEdge.browser,'edge');
 assert.deepEqual(allowedFormFactors(android.family),['phone','tablet','foldable']);
 const v=plan(android,{deviceForm:'foldable',browserChoices:['chrome','edge','firefox']});
 assert.equal(v.companion,'Android');
 assert.equal(v.browserDelivery,'ANDROID_NATIVE_COMPANION_REQUIRED');
 assert.equal(v.ownerRole,'ISSUER_DECIDES');
 assert.equal(v.requestedDownload,null);
 assert.equal(v.physicalDevice,'NOT_ENROLLED');
 assert.equal(v.identity,'NOT_AUTHENTICATED');
});
test('Apple phone/tablet and Windows/Linux desktop see correct separate device paths',()=>{
 for(const env of [iphone,ipad,windows,linux]){
  const p=plan(env);
  assert.equal(p.deviceFamily,env.family);
  assert.equal(p.requestedDownload,null);
  assert.equal(p.signedNativePackage,'NOT_RELEASED');
 }
 assert.equal(ipad.form,'tablet');
 assert.equal(plan(iphone).browserDelivery,'APPLE_NATIVE_CONTAINING_APP_REQUIRED');
 assert.equal(plan(windows).browserDelivery,'ORIGINAL_SIGNED_NATIVE_HOST_PLUS_APPROVED_STORE_EXTENSIONS_REQUIRED');
 assert.deepEqual(allowedBrowsers(linux.family,'desktop'),['chrome','edge','firefox','other']);
});
test('Creator and customers use same account-first flow; additional device requires existing identity',()=>{
 const full=plan(android,{leeWayAccount:'new',github:'no'});
 assert.equal(full.path,'FULL_NEW_DEVICE_SETUP');
 assert.equal(full.accountStep,'REGISTER_VIA_ORIGINAL_ZITADEL');
 assert.equal(full.invite,'ORIGINAL_RUNTIME_INVITE_VERIFICATION_REQUIRED');
 assert.equal(full.credentialsTransferred,false);
 const additional=plan(android,{deviceRelation:'additional',leeWayAccount:'existing'});
 assert.equal(additional.path,'ADDITIONAL_DEVICE');
 assert.equal(additional.accountStep,'SIGN_IN_EXISTING_ZITADEL_ACCOUNT');
 assert.throws(()=>plan(android,{deviceRelation:'additional',leeWayAccount:'new'}),/NEW_ACCOUNT_NOT_AN_ADDITIONAL_DEVICE/);
 assert.throws(()=>plan(windows,{deviceForm:'phone'}),/FORM_FACTOR_INVALID/);
 assert.throws(()=>plan(android,{browserChoices:['safari']}),/BROWSER_CHOICES_INVALID/);
});
test('public PWA identifies itself as Device Bridge and new service worker blocks/cannot cache debug APK',()=>{
 assert.equal(pwa.name,'LeeWay Device Bridge');
 assert.equal(pwa.short_name,'LeeWay Bridge');
 assert.match(sw,/v20-secure-onboarding-no-debug/);
 assert.match(sw,/status: 410/);
 assert.match(sw,/device-onboarding-policy\.mjs/);
 assert.match(sw,/device-onboarding\.js/);
 assert.match(sw,/apk\|ipa\|exe\|msix\|dmg/);
});
test('public Pages workflows cannot automatically republish a development APK',()=>{
 const build=read('../.github/workflows/android-build.yml');
 const safety=read('../.github/workflows/verify-device-bridge-pages-apk.yml');
 assert.doesNotMatch(build,/git push origin HEAD:main/);
 assert.match(build,/leeway-device-bridge-debug-apk/);
 assert.match(safety,/device-bridge-pages-safety\.test\.mjs/);
});
