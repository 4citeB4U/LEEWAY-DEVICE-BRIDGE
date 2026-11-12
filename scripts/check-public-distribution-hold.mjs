/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.RELEASE.DISTRIBUTION_HOLD
TAG: LEEWAY.DEVICE_BRIDGE.RELEASE.PUBLIC_DISTRIBUTION_HOLD_GATE.V1
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
5WH:
WHAT = Prove source release hold blocks CI debug publication, public Pages assets and native-client update discovery.
WHY = Prevent an unqualified APK or unsigned Apple package from being promoted to production outside canonical release authority.
WHO = Device Bridge original release custodian, Runtime, Pocket-ID, Veritas and OS package owners.
WHERE = scripts/check-public-distribution-hold.mjs.
WHEN = 2026-11-12.
HOW = Read-only Git and source metadata assertions. NOT a live Pages/Funnel/OS verification.
LICENSE: Existing repository terms unchanged.
*/
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const read=p=>fs.readFileSync(p,'utf8');
const json=p=>JSON.parse(read(p));
const tracked=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const fail=[];
const check=(condition,reason)=>{if(!condition)fail.push(reason)};
const latest=json('docs/downloads/leeway-device-bridge-android-latest.json');
const full=json('docs/package-manifest.json');
const android=full.packages.find(x=>x.platform==='android');
const apple=full.packages.find(x=>x.platform==='ios');
const build=read('.github/workflows/android-build.yml');
const home=read('docs/index.html');
const termux=read('clients/remote-controller/termux-one-pull.sh');
const app=read('apps/android/app/src/main/java/industries/leeway/devicebridge/GitHubUpdateChecker.kt');
const updater=read('clients/phone-workstation/agent-lee-update-agent.mjs');
check(latest.releaseState==='SECURITY_HOLD_NOT_QUALIFIED' &&
      latest.downloadEnabled===false && latest.publicReleaseAuthorized===false &&
      latest.downloadUrl===null,'LATEST_APK_RELEASE_HOLD_MISSING');
check(android?.status==='SECURITY_HOLD_NOT_QUALIFIED' &&
      android.downloadUrl===null && android.downloadEnabled===false &&
      android.publicReleaseAuthorized===false,'ANDROID_PACKAGE_MANIFEST_RELEASE_HOLD_MISSING');
check(full.platformRoutes.android.state==='SOURCE_ONLY','ANDROID_PLATFORM_FALSE_AVAILABILITY');
check(apple?.nativeVerification===false && apple.downloadUrl===null &&
      full.platformRoutes.ios.state==='SOURCE_ONLY','UNSIGNED_APPLE_FALSE_NATIVE_QUALIFICATION');
check(!tracked.some(x=>/^docs\/downloads\/leeway-device-bridge-android-.*\.apk$/i.test(x)),
      'PUBLIC_PAGES_APK_BINARY_STILL_TRACKED');
check(!home.includes('leeway-device-bridge-android-latest-debug.apk') &&
      !home.includes('leeway-device-bridge-android-latest-release.apk'),
      'PUBLIC_HOME_PAGE_EXPOSES_HELD_APK');
check(build.includes('contents: read') &&
      !build.includes('git push origin HEAD:main') &&
      !build.includes('Publish latest verified Android APK to GitHub Pages'),
      'CI_CAN_REPUBLISH_UNQUALIFIED_APK');
check(!termux.includes('android.intent.action.DELETE') &&
      termux.includes('releaseState') && termux.includes('downloadEnabled'),
      'TERMUX_INSTALLER_CAN_BYPASS_HOLD_OR_UNINSTALL_DEVICE_BRAIN');
check(app.includes('ANDROID_RELEASE_NOT_AUTHORIZED') &&
      app.includes('releaseEligible') && app.includes('publicReleaseAuthorized'),
      'ANDROID_UPDATE_CHECKER_CAN_PROMOTE_UNQUALIFIED_APK');
check(updater.includes('DEVICE_BRIDGE_RELEASE_NOT_AUTHORIZED') &&
      updater.includes('verifySignedReleaseApk'),
      'PHONE_WORKSTATION_CAN_RE_SIGN_DEBUG_PACKAGE');
console.log(JSON.stringify({
  gate:'LEEWAY_PUBLIC_DISTRIBUTION_HOLD_SOURCE',
  state:fail.length?'BLOCKED':'PASS_SOURCE_ONLY',
  failed:fail,
  trackedPublicApks:tracked.filter(x=>/^docs\/downloads\/leeway-device-bridge-android-.*\.apk$/i.test(x)).length,
  warning:'Live GitHub Pages, cache, Funnel, operating-system and existing installs NOT tested by this check'
}));
if(fail.length)process.exitCode=1;
