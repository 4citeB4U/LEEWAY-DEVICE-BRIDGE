import fs from "node:fs";
import assert from "node:assert/strict";

const voice=fs.readFileSync("apps/android/app/src/main/java/industries/leeway/devicebridge/VoiceRuntime.kt","utf8");

assert.doesNotMatch(voice,/TextToSpeech/);
assert.doesNotMatch(voice,/voice\.tts\./);
assert.match(voice,/LEEWAY_VOICE_FABRIC/);
assert.match(voice,/agent-lee-voice-one/);
assert.match(voice,/VOICE_UNAVAILABLE/);
assert.match(voice,/fallbackAllowed/);
assert.match(voice,/openVoiceFabric/);
assert.match(voice,/voice\.fabric\.open/);
assert.match(voice,/voice\.fabric\.speak/);

console.log("PASS Voice Fabric fail-closed authority contract");
