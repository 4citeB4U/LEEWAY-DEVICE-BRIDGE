import fs from "node:fs";
import assert from "node:assert/strict";

const voice=fs.readFileSync("apps/android/app/src/main/java/industries/leeway/devicebridge/VoiceRuntime.kt","utf8");

assert.match(voice,/for \(attempt in 1\.\.3\)/);
assert.match(voice,/await\(8, TimeUnit\.SECONDS\)/);
assert.match(voice,/Thread\.sleep\(1200L \* attempt\)/);
assert.match(voice,/LANG_MISSING_DATA/);
assert.match(voice,/LANG_NOT_SUPPORTED/);
assert.match(voice,/TTS_NOT_READY/);
assert.match(voice,/queueResult/);
assert.match(voice,/voice\.tts\.init/);
assert.match(voice,/voice\.tts\.speak/);

console.log("PASS Android TTS cold-start retry contract");
