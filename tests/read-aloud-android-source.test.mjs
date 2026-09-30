import assert from 'node:assert/strict';
import fs from 'node:fs';

const manifest=fs.readFileSync('apps/read-aloud-android/app/src/main/AndroidManifest.xml','utf8');
const service=fs.readFileSync('apps/read-aloud-android/app/src/main/java/industries/leeway/readaloud/ReadAloudService.java','utf8');
const activity=fs.readFileSync('apps/read-aloud-android/app/src/main/java/industries/leeway/readaloud/MainActivity.java','utf8');
const boot=fs.readFileSync('apps/read-aloud-android/app/src/main/java/industries/leeway/readaloud/BootReceiver.java','utf8');
const host=fs.readFileSync('apps/read-aloud-android/app/src/main/java/industries/leeway/readaloud/VoiceOneHost.java','utf8');
const gradle=fs.readFileSync('apps/read-aloud-android/app/build.gradle.kts','utf8');

assert.match(service,/127\.0\.0\.1/);
assert.doesNotMatch(service,/0\.0\.0\.0/);
assert.match(service,/agent-lee-voice-one/);
assert.match(service,/4citeB4U\/LeeWay-Voice-Fabric/);
assert.match(service,/\/health/);
assert.match(service,/\/prepare/);
assert.match(service,/\/speak/);
assert.match(service,/\/stop/);
assert.match(service,/\/resume/);
assert.match(service,/\/stream\/start/);
assert.match(service,/\/stream\/chunk/);
assert.match(service,/\/stream\/end/);
assert.match(service,/READ_ALOUD_MUTED/);
assert.doesNotMatch(service,/TextToSpeech/);
assert.doesNotMatch(service,/com\.samsung\.SMT/);

assert.match(host,/WebView/);
assert.match(host,/setMediaPlaybackRequiresUserGesture\(false\)/);
assert.match(host,/LeeWayPocketNative/);
assert.match(host,/LeeWayAndroidVoice/);
assert.match(host,/streamStart/);
assert.match(host,/streamChunk/);
assert.match(host,/streamEnd/);
assert.match(host,/agent-lee-voice-one/);
assert.match(host,/android-bridge\.html/);

assert.match(manifest,/RECEIVE_BOOT_COMPLETED/);
assert.match(manifest,/FOREGROUND_SERVICE_MEDIA_PLAYBACK/);
assert.match(manifest,/WAKE_LOCK/);
assert.match(boot,/startForegroundService/);
assert.match(activity,/Agent Lee Voice One/);
assert.match(gradle,/versionName = "0\.2\.0"/);
assert.match(gradle,/versionCode = 2/);
assert.doesNotMatch(manifest,/AccessibilityService/);
assert.doesNotMatch(manifest,/BIND_ACCESSIBILITY_SERVICE/);

console.log('PASS read-aloud Android Agent Lee Voice One source contract');
