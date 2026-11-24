/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.ANDROID.RELEASE_SECURITY
TAG: LEEWAY.ANDROID.DEBUG_PAGES_PUBLICATION_HOLD.TEST.20261121
5WH: WHAT=Assert debug APK build cannot self-promote as public release.
WHY=SHA-256 and CI assembly alone do not qualify release signing.
WHO=Creator-authorized engineering; outside F2 source contributor.
WHERE=tests/android-public-debug-release-hold.test.mjs
WHEN=2026-11-21.
HOW=Inspect workflow source; no Android/Pages mutation or secrets.
LICENSE=Existing repository terms.
*/
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const workflow=readFileSync(new URL("../.github/workflows/android-build.yml",import.meta.url),"utf8");
test("debug APK continues to build and produce private workflow artifact",()=>{
 assert.match(workflow,/assembleDebug/);
 assert.match(workflow,/actions\/upload-artifact@v4/);
 assert.match(workflow,/leeway-device-bridge-debug-apk/);
});
test("main push cannot automatically publish debug package to public GitHub Pages",()=>{
 const step=workflow.match(/\n\s*- name: Publish latest verified Android APK to GitHub Pages\n\s*if: ([^\n]+)/);
 assert.ok(step, "must retain visible explicit publication hold");
 assert.match(step[1],/^false\b/);
 assert.match(step[1],/DEBUG_PUBLICATION_HOLD_OWNER_SIGNED_RELEASE_REQUIRED/);
});
