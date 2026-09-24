import assert from "node:assert/strict";
import fs from "node:fs";

const read = path => fs.readFileSync(new URL("../" + path, import.meta.url), "utf8");

const manifest = read("apps/android/app/src/main/AndroidManifest.xml");
const sensory = read("apps/android/app/src/main/java/industries/leeway/devicebridge/SensoryRuntime.kt");
const activity = read("apps/android/app/src/main/java/industries/leeway/devicebridge/MainActivity.kt");
const model = read("apps/android/app/src/main/java/industries/leeway/devicebridge/ModelRuntime.kt");
const router = read("apps/android/app/src/main/java/industries/leeway/devicebridge/RemoteCommandRouter.kt");

assert.match(manifest,/android\.permission\.RECORD_AUDIO/,"microphone permission must be declared");
assert.match(manifest,/android\.speech\.RecognitionService/,"speech recognition service visibility must be declared");
assert.match(manifest,/android\.intent\.action\.TTS_SERVICE/,"TTS service visibility must be declared");

assert.match(sensory,/SpeechRecognizer\.isOnDeviceRecognitionAvailable/,"voice input must prefer on-device recognition when available");
assert.match(sensory,/RecognizerIntent\.EXTRA_PREFER_OFFLINE/,"voice input must request offline recognition preference");
assert.match(sensory,/UtteranceProgressListener/,"speech output must observe actual utterance lifecycle");
assert.match(sensory,/sensory\.voice\.output", "PASS"/,"TTS PASS must be receipt-backed");
assert.match(sensory,/reasonFromSpeech/,"voice transcript must route into phone-local reasoning");
assert.match(sensory,/ModelRuntime\.generate/,"voice reasoning must use the phone-local model");

assert.match(activity,/ModelRuntime\.status/,"voice UI must verify the phone model before listening");
assert.match(activity,/MODEL_NOT_VERIFIED/,"unverified phone model must block voice turn");
assert.match(activity,/SensoryRuntime\.listenOnce/,"voice UI must start native recognition");
assert.match(activity,/SensoryRuntime\.reasonFromSpeech/,"recognized speech must reach the local model");
assert.match(activity,/SensoryRuntime\.speak/,"model response must reach phone speech output");
assert.match(activity,/sensory\.voice\.turn",\s*"PASS"/s,"end-to-end voice turn must produce PASS only after completion");
assert.match(activity,/VOICE TURN: VERIFIED COMPLETE/,"completed voice turn must be visible to the owner");

assert.match(model,/PHONE_LOCAL_MODEL/,"model authority must remain phone-local");
assert.match(model,/MODEL_SHA256/,"model must remain hash-pinned");
assert.match(router,/sensory\.status/,"remote model may inspect sensory state");
assert.match(router,/sensory\.speak/,"authorized relay may request speech output");
assert.doesNotMatch(router,/sensory\.listen|camera\.capture|microphone\.capture/,"remote sensor activation must remain prohibited");

console.log("LEEWAY_STAGE1_VOICE_SOURCE_GATE=PASS");
