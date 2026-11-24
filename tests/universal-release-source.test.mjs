/* LeeWay release distribution source acceptance: no fictitious installer or local session cache. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const read = path => readFileSync(new URL('../'+path, import.meta.url),'utf8');

test('Android release is explicit stable owner-controlled signing, not debug',()=>{
  const build=read('apps/android/app/build.gradle.kts');
  assert.match(build,/LEEWAY_ANDROID_RELEASE_KEYSTORE_PATH/);
  assert.match(build,/LEEWAY_ANDROID_RELEASE_STORE_PASSWORD/);
  assert.match(build,/isDebuggable = false/);
  const workflow=read('.github/workflows/android-signed-release-candidate.yml');
  assert.match(workflow,/workflow_dispatch/);
  assert.match(workflow,/assembleRelease/);
  assert.match(workflow,/apksigner/);
  assert.match(workflow,/OWNER_APPROVED_ANDROID_RELEASE_KEY_UNBOUND/);
  assert.doesNotMatch(workflow,/gh release (upload|create)|softprops\/action-gh-release/);
  assert.ok(existsSync(new URL('../tests/android-public-debug-release-hold.test.mjs', import.meta.url)));
});
test('cross-platform PWA installs on scoped public root without offline auth cache',()=>{
  const manifest=JSON.parse(read('console-ui/public/manifest.webmanifest'));
  assert.equal(manifest.start_url,'/LEEWAY-DEVICE-BRIDGE/');
  assert.equal(manifest.scope,'/LEEWAY-DEVICE-BRIDGE/');
  assert.equal(manifest.display,'standalone');
  assert.ok(manifest.icons.some(i=>i.sizes==='192x192'));
  assert.ok(manifest.icons.some(i=>i.sizes==='512x512'));
  const html=read('console-ui/index.html');
  assert.match(html,/rel="manifest"/);
  assert.match(html,/apple-touch-icon/);
  const worker=read('console-ui/public/sw.js');
  assert.match(worker,/req\.method !== 'GET'/);
  assert.match(worker,/req\.mode === 'navigate'/);
  assert.match(worker,/assets\|icons/);
  assert.match(worker,/onboarding\|device\|receipts/);
  const publishing=read('.github/workflows/device-console-ui-pages.yml');
  assert.match(publishing,/docs\/icons\/leeway-official-logo-192\.png/);
  assert.match(publishing,/docs\/icons\/leeway-official-logo-512\.png/);
  assert.match(publishing,/docs\/package-manifest\.json/);
});
