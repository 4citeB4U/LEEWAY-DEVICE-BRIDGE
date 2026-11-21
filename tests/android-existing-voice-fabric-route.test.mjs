/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.ANDROID.DEVICE_BRIDGE.EXISTING_VOICE_FABRIC.TEST
TAG: LEEWAY.ANDROID.VOICE_ONE_SAME_DEVICE_LOOPBACK_SOURCE_GATE
5WH:
WHAT = Confirm the Android Device Bridge delegates to the original installed Voice One host rather than claiming voice unavailable unconditionally or replacing synthesis.
WHY = Preserve the Creator's working Android Voice Fabric and expose authenticated remote Device Bridge voice tools through that existing phone-local bridge.
WHO = LeeWay source engineering, outside contributor under Creator authority; not Agent Lee.
WHERE = tests/android-existing-voice-fabric-route.test.mjs
WHEN = 2026-11-21
HOW = Source contract and no-fallback negatives, not a physical speaker or microphone test.
LICENSE = MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const root=new URL('../',import.meta.url);
const read=file=>readFileSync(new URL(file,root),'utf8');
const voice=read('apps/android/app/src/main/java/industries/leeway/devicebridge/VoiceRuntime.kt');
const host=read('apps/read-aloud-android/app/src/main/java/industries/leeway/readaloud/ReadAloudService.java');
const webview=read('apps/read-aloud-android/app/src/main/java/industries/leeway/readaloud/VoiceOneHost.java');
const router=read('apps/android/app/src/main/java/industries/leeway/devicebridge/RemoteCommandRouter.kt');

test('existing Android Voice One service owns localhost 54321, the WebView, and canonical authority',()=>{
 assert.match(host,/PORT = 54321/);
 assert.match(host,/127\.0\.0\.1/);
 assert.match(host,/\/health/);
 assert.match(host,/\/speak/);
 assert.match(host,/VoiceOneHost\.VOICE_ID/);
 assert.match(host,/4citeB4U\/LeeWay-Voice-Fabric/);
 assert.match(webview,/LeeWayAndroidVoice\.speak/);
 assert.match(webview,/https:\/\/4citeb4u\.github\.io\/LeeWay-Voice-Fabric\/android-bridge\.html/);
});

test('Device Bridge phone voice routes to the same already-running original Voice One host',()=>{
 assert.match(voice,/VOICE_LOOPBACK = "http:\/\/127\.0\.0\.1:54321"/);
 assert.match(voice,/request\("GET", "\/health"\)/);
 assert.match(voice,/request\("POST", "\/speak", JSONObject\(\)\.put\("text", clean\)\)/);
 assert.match(voice,/data\.optString\("authority"\) != VOICE_AUTHORITY/);
 assert.match(voice,/value\.optString\("authority"\) != VOICE_AUTHORITY/);
 assert.match(voice,/value\.optString\("voicePackageId"\) != observedPackage/);
 assert.match(voice,/connection\.instanceFollowRedirects = false/);
 assert.match(voice,/MAX_RESPONSE_BYTES = 32 \* 1024/);
 assert.match(voice,/Looper\.myLooper\(\) == Looper\.getMainLooper\(\)/);
 assert.match(voice,/fun status\(context: Context\): JSONObject =/);
 assert.match(voice,/JSONObject\(lastStatus\)\.put\("readback", "CACHED_NOT_LIVE_PROBED"\)/);
 assert.match(voice,/else \{\s*initialize\(context\)\s*\}/);

 assert.match(voice,/put\("playbackVerified", false\)/);
 assert.match(voice,/put\("spoken", false\)/);
 assert.match(voice,/fallbackAllowed", false/);
 assert.match(voice,/VoiceRuntime/);
 assert.doesNotMatch(voice,/android\.speech\.tts|TextToSpeech\(|speechSynthesis\(|https:\/\/[^"\s]+\/speak/);
 assert.doesNotMatch(voice,/put\("playbackVerified", true\)|put\("spoken", true\)/);
});

test('Android remote command keeps its existing owner/Formula gate before original voice dispatch',()=>{
 assert.match(router,/FormulaF8Gate\.evaluate/);
 assert.match(router,/LocalAuthority\.agentAccessEnabled/);
 assert.match(router,/"voice\.status" -> VoiceRuntime\.initialize\(context\)/);
 assert.match(router,/"voice\.speak" -> VoiceRuntime\.speak\(context, text\)/);
 assert.match(router,/firstSeen, capabilityPrecondition/);
});
