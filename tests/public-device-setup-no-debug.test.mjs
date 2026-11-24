/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.PUBLIC.REPAIR.TEST
TAG: LEEWAY.BRIDGE.NO_DEBUG_APK_MOBILE_SETUP_NEGATIVE_V1
5WH:
WHAT = Verify published GitHub Pages Device Bridge starts with account/device/browser setup and never offers the debug APK.
WHY = Screenshot showed Android mobile "Workstation / Download Extension" leading to an unsafe debug APK warning.
WHO = Creator-authorized outside contributor; original Bridge and Runtime remain security authorities.
WHERE = tests/public-device-setup-no-debug.test.mjs.
WHEN = 2026-11-24.
HOW = Assert static HTML, JavaScript dynamic link gates, metadata, Android update denial and PWA cache generation.
LICENSE = Existing repository terms.
*/
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
const get=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const manifest=JSON.parse(get('docs/package-manifest.json'));
const android=manifest.packages.find(p=>p.platform==='android');
test('public Device Bridge homepage begins with account-first mobile native setup, not Workstation APK tiles',()=>{
 const page=get('docs/index.html');
 assert.match(page,/id="dbOnboarding"/);
 assert.match(page,/id="dbSetupAccount"/);
 assert.match(page,/id="dbSetupDevice"/);
 assert.match(page,/name="leewayDeviceRelation"/);
 assert.match(page,/name="leewayBrowser"/);
 assert.match(page,/name="leewayGithub"/);
 assert.match(page,/id="dbTechnical"/);
 assert.match(page,/<details class="leeway-technical"/);
 assert.match(page,/onboarding\.css/);
 assert.match(page,/onboarding\.js/);
 assert.doesNotMatch(page,/leeway-device-bridge-android-latest-debug\.apk/);
 assert.doesNotMatch(page,/DOWNLOAD ANDROID EXTENSION|Android Workstation|Workstation Downloads|Download Extension/);
 assert.doesNotMatch(page,/<a[^>]+\sdownload\b/i);
});
test('public Android manifest preserves measured evidence but revokes unapproved debug installation',()=>{
 assert.equal(android.channel,'development');
 assert.match(android.status,/NOT_APPROVED_FOR_PUBLIC_INSTALL/);
 assert.equal(android.downloadUrl,null);
 assert.equal(android.releaseSigning,'NOT_VERIFIED');
 assert.equal(android.customerInstallApproved,false);
 assert.equal(manifest.platformRoutes.android.state,'SOURCE_ONLY');
 assert.match(android.sha256,/^[a-f0-9]{64}$/);
 assert.ok(android.sizeBytes>0);
 const latest=JSON.parse(get('docs/downloads/leeway-device-bridge-android-latest.json'));
 assert.equal(latest.downloadUrl,null);
 assert.equal(latest.customerInstallApproved,false);
 assert.match(latest.releaseStatus,/NOT_APPROVED_FOR_PUBLIC_INSTALL/);
 assert.equal(latest.sha256,android.sha256);
});
test('JS never regenerates old APK links from cached package metadata',()=>{
 const app=get('docs/app.js');
 const dashboard=get('docs/dashboard-ui.js');
 assert.match(app,/SIGNED RELEASE REQUIRED/);
 assert.doesNotMatch(app,/href=.*pkg\.downloadUrl/);
 assert.doesNotMatch(dashboard,/new URL\(android\.downloadUrl/);
 assert.match(dashboard,/Native package source remains under signed release hold/);
});
test('Android update checker denies debug/source channel and clears stale installer update',()=>{
 const kotlin=get('apps/android/app/src/main/java/industries/leeway/devicebridge/GitHubUpdateChecker.kt');
 assert.match(kotlin,/SIGNED_CUSTOMER_RELEASE_APPROVED/);
 assert.match(kotlin,/customerInstallApproved/);
 assert.match(kotlin,/releaseSigning/);
 assert.match(kotlin,/prefs\.edit\(\)\.remove\(PENDING_UPDATE\)\.apply\(\)/);
});
test('PWA rotates old Workstation caches and never caches APK or stale public authority page',()=>{
 const sw=get('docs/sw.js');
 assert.match(sw,/v20-account-first-release-hold/);
 assert.match(sw,/apk\|ipa\|crx\|xpi/);
 assert.match(sw,/cache:"no-store"/);
 assert.match(sw,/onboarding\.js/);
 const pwa=JSON.parse(get('docs/manifest.webmanifest'));
 assert.match(pwa.name,/Device Bridge/);
 assert.doesNotMatch(pwa.name,/Workstation/);
});
test('browser setup text is non-authoritative, signed device and customer identity remain unverified',()=>{
 const js=get('docs/onboarding.js');
 assert.match(js,/dbSetupForm/);
 assert.match(js,/original Zitadel-backed Runtime/i);
 assert.match(js,/signed Bridge companion/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|document\.cookie/);
 assert.doesNotMatch(js,/\.apk['"]/);
 assert.doesNotMatch(js,/fetch\s*\(/);
});

test('Apple Home Screen setup remains inside original Device Bridge and unsigned IPA does not masquerade as signed customer package',()=>{
 const page=get('docs/index.html');
 const lane=page.split('id="appleLane">')[1]?.split('id="androidLane">')[0]||'';
 assert.match(page,/id="dbAppleSetup"/);
 assert.match(page,/id="dbAppleHomeInstall"/);
 assert.match(page,/id="dbAppleBridgeStatus"/);
 assert.match(lane,/Return to secure Apple setup/);
 assert.doesNotMatch(lane,/github\.com|codespaces\/new|unsigned\.ipa/i);
 const source=get('docs/onboarding.js');
 assert.match(source,/appleHome\?\.addEventListener\('click'/);
 assert.match(source,/appleNative\?\.addEventListener\('click'/);
 assert.match(source,/Add to Home Screen/);
 assert.match(source,/appleStandalone/);
 const apple=manifest.packages.find(p=>p.platform==='ios');
 assert.equal(manifest.platformRoutes.ios.state,'SOURCE_ONLY');
 assert.equal(manifest.platformRoutes.ipados.state,'SOURCE_ONLY');
 assert.equal(apple.downloadUrl,null);
 assert.equal(apple.releaseSigning,'NOT_VERIFIED');
 assert.equal(apple.customerInstallApproved,false);
 assert.match(apple.status,/NOT_APPROVED_FOR_PUBLIC_INSTALL/);
 const native=get('apps/apple/Sources/AppleUpdateCoordinator.swift');
 const view=get('apps/apple/Sources/AppleDeviceBridgeView.swift');
 assert.match(native,/SIGNED_CUSTOMER_RELEASE_APPROVED/);
 assert.match(native,/SIGNED_RELEASE_REQUIRED/);
 assert.match(native,/customerInstallApproved/);
 assert.match(view,/Open LeeWay Device Bridge setup/);
 assert.match(view,/Developer-only unsigned IPA workflow/);
 assert.doesNotMatch(view,/Open GitHub Release \/ Download IPA/);
});
