import assert from 'node:assert/strict';
import fs from 'node:fs';

const manifest=fs.readFileSync('apps/read-aloud-android/app/src/main/AndroidManifest.xml','utf8');
const service=fs.readFileSync('apps/read-aloud-android/app/src/main/java/industries/leeway/readaloud/ReadAloudService.java','utf8');
const activity=fs.readFileSync('apps/read-aloud-android/app/src/main/java/industries/leeway/readaloud/MainActivity.java','utf8');
const boot=fs.readFileSync('apps/read-aloud-android/app/src/main/java/industries/leeway/readaloud/BootReceiver.java','utf8');

assert.match(service,/127\.0\.0\.1/);
assert.doesNotMatch(service,/0\.0\.0\.0/);
assert.match(service,/com\.samsung\.SMT/);
assert.match(service,/LEEWAY_ACCESSIBILITY_READ_ALOUD_NOT_AGENT_LEE_VOICE_ONE/);
assert.match(service,/\/health/);
assert.match(service,/\/speak/);
assert.match(service,/\/stop/);
assert.match(service,/QUEUE_FLUSH/);
assert.match(service,/QUEUE_ADD/);
assert.match(service,/3500/);
assert.match(manifest,/RECEIVE_BOOT_COMPLETED/);
assert.match(manifest,/FOREGROUND_SERVICE_MEDIA_PLAYBACK/);
assert.match(boot,/startForegroundService/);
assert.match(activity,/This is not Agent Lee Voice One/);
assert.doesNotMatch(manifest,/AccessibilityService/);
assert.doesNotMatch(manifest,/BIND_ACCESSIBILITY_SERVICE/);

console.log('PASS read-aloud-android-source');
