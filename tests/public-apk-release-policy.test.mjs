/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.RELEASE.TESTS
TAG: LEEWAY.RELEASE.PUBLIC_APK_ADMISSION_NEGATIVE_TESTS.V1
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
5WH:
WHAT = Reject debug, missing approval, tampered and renamed Android artifact public distribution.
WHY = Prevent incomplete manifest or test build from bypassing OS trust hold.
WHO = Original Device Bridge release maintainer and CI.
WHERE = tests/public-apk-release-policy.test.mjs.
WHEN = 2026-11-12.
HOW = Node built-in test on pure policy, not a live Funnel network test.
LICENSE: Existing repo terms remain unchanged.
*/
import test from 'node:test';import assert from 'node:assert/strict';
import {publicApkReleaseAuthorized} from '../operator/public-apk-release-policy.mjs';
const file='leeway-device-bridge-android-latest-release.apk';
const approved={releaseState:'AUTHORIZED_RELEASED',downloadEnabled:true,publicReleaseAuthorized:true,
sha256:'a'.repeat(64),signingCertificateSha256:'b'.repeat(64),
authorizedReleaseEvidenceRef:'https://example.invalid/release-review/123',
downloadUrl:'./'+file};
test('exact signed approved release metadata passes source gate',()=>assert.equal(publicApkReleaseAuthorized(file,approved),true));
test('debug APK never qualifies even if accidentally approved',()=>assert.equal(publicApkReleaseAuthorized('leeway-device-bridge-android-latest-debug.apk',{...approved,downloadUrl:'./leeway-device-bridge-android-latest-debug.apk'}),false));
test('metadata absence fails closed',()=>assert.equal(publicApkReleaseAuthorized(file,null),false));
test('no explicit authorized status fails closed',()=>assert.equal(publicApkReleaseAuthorized(file,{...approved,releaseState:undefined}),false));
test('no independent release evidence fails closed',()=>assert.equal(publicApkReleaseAuthorized(file,{...approved,authorizedReleaseEvidenceRef:''}),false));
test('wrong filename fails closed',()=>assert.equal(publicApkReleaseAuthorized('other.apk',approved),false));
test('bad certificate digest fails closed',()=>assert.equal(publicApkReleaseAuthorized(file,{...approved,signingCertificateSha256:'not-a-hash'}),false));
test('downloadEnabled=false holds release',()=>assert.equal(publicApkReleaseAuthorized(file,{...approved,downloadEnabled:false}),false));
