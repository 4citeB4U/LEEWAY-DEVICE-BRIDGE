import fs from "node:fs";
import assert from "node:assert/strict";

const voice=fs.readFileSync("apps/android/app/src/main/java/industries/leeway/devicebridge/VoiceRuntime.kt","utf8");

assert.doesNotMatch(voice,/TextToSpeech/);
assert.doesNotMatch(voice,/android-tts/);
assert.doesNotMatch(voice,/VOICE_UNAVAILABLE/);
assert.match(voice,/LEEWAY_VOICE_FABRIC/);
assert.match(voice,/agent-lee-voice-one/);
assert.match(voice,/ANDROID_NATIVE_MEDIA_PLAYER/);
assert.match(voice,/VOICE_SYNTHESIS_REQUIRES_BODY_ROUTER/);
assert.match(voice,/VOICE_ARTIFACT_HASH_MISMATCH/);
assert.match(voice,/VOICE_ARTIFACT_INVALID_WAV/);
assert.match(voice,/fallbackAllowed",false/);
assert.match(voice,/playArtifact/);
assert.match(voice,/voice\.fabric\.play/);
assert.match(voice,/voice\.fabric\.stop/);
assert.match(voice,/openVoiceFabric/);

console.log("PASS Voice One governed synthesis/playback contract");
