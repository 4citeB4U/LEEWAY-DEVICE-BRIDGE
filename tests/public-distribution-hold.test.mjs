/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.TESTS.DISTRIBUTION_HOLD
TAG: LEEWAY.DEVICE_BRIDGE.TESTS.HOLD_AND_OWNER_DEVICE_DATA.V1
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
5WH:
WHAT = Regression test fail-closed public package metadata and preserve device-owned installation state.
WHY = A valid hash and GitHub Actions build must not authorize public installs, unsafe migration or false native Apple status.
WHO = Original Device Bridge release and source CI owner.
WHERE = tests/public-distribution-hold.test.mjs.
WHEN = 2026-11-12.
HOW = Read-only source/manifest conformance; physical installs, OS behavior and public caches separately required.
LICENSE: Existing repository terms unchanged.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const m=JSON.parse(read('docs/package-manifest.json'));
const latest=JSON.parse(read('docs/downloads/leeway-device-bridge-android-latest.json'));
const android=m.packages.find(x=>x.platform==='android');
const apple=m.packages.find(x=>x.platform==='ios');
test('known debug build is historic-only and cannot satisfy release admission',()=>{
 assert.equal(latest.downloadEnabled,false);
 assert.equal(latest.publicReleaseAuthorized,false);
 assert.equal(latest.releaseState,'SECURITY_HOLD_NOT_QUALIFIED');
 assert.equal(latest.downloadUrl,null);
 assert.match(latest.sha256,/^[a-f0-9]{64}$/);
 assert.equal(android.downloadUrl,null);
 assert.equal(android.status,'SECURITY_HOLD_NOT_QUALIFIED');
});
test('unsigned Apple IPA cannot be called installed or physically qualified',()=>{
 assert.equal(m.platformRoutes.ios.state,'SOURCE_ONLY');
 assert.equal(apple.nativeVerification,false);
 assert.equal(apple.downloadUrl,null);
});
test('Android CI compiles debug artifact but cannot publish it into main',()=>{
 const flow=read('.github/workflows/android-build.yml');
 assert.match(flow,/assembleDebug/);
 assert.match(flow,/upload-artifact@v4/);
 assert.match(flow,/contents: read/);
 assert.doesNotMatch(flow,/git push origin HEAD:main/);
});
test('Termux installer cannot uninstall device-owned Brain during failure recovery',()=>{
 const sh=read('clients/remote-controller/termux-one-pull.sh');
 assert.match(sh,/RELEASE_NOT_AUTHORIZED|releaseState/);
 assert.doesNotMatch(sh,/android.intent.action.DELETE/);
 assert.match(sh,/NO UNINSTALL performed/);
});
test('Android updater refuses unapproved release and stale installation requests',()=>{
 const kt=read('apps/android/app/src/main/java/industries/leeway/devicebridge/GitHubUpdateChecker.kt');
 assert.match(kt,/ANDROID_RELEASE_NOT_AUTHORIZED/);
 assert.match(kt,/releaseEligible/);
 assert.match(kt,/remove\(PENDING_UPDATE\)/);
});
test('Phone workstation does not self sign production Device Bridge updates',()=>{
 const js=read('clients/phone-workstation/agent-lee-update-agent.mjs');
 assert.match(js,/verifySignedReleaseApk/);
 assert.match(js,/DEVICE_BRIDGE_RELEASE_NOT_AUTHORIZED/);
 assert.ok(js.includes(String.raw`digest:\s*`), "release signer parser must accept actual whitespace");
 assert.ok(!js.includes(String.raw`digest:\\s*`), "double-escaped signer regex would reject legitimate certificates");
});
