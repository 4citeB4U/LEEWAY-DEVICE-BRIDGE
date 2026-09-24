import fs from "node:fs";
import assert from "node:assert/strict";

const src=fs.readFileSync(
  "apps/android/app/src/main/java/industries/leeway/devicebridge/ModelRuntime.kt",
  "utf8"
);
const gradle=fs.readFileSync("apps/android/app/build.gradle.kts","utf8");
const main=fs.readFileSync(
  "apps/android/app/src/main/java/industries/leeway/devicebridge/MainActivity.kt",
  "utf8"
);
const manifest=JSON.parse(fs.readFileSync("docs/model-manifest.json","utf8"));

assert.match(src,/SmolLM2-360M-Instruct/);
assert.match(src,/373719040L/);
assert.match(src,/8e2834da211b439751af968ed650febdde5a8cb8d88bc6c1a3059f049caa5c2e/);
assert.match(src,/EngineConfig/);
assert.match(src,/Backend\.CPU/);
assert.match(src,/MODEL_HASH_MISMATCH/);
assert.match(gradle,/litertlm-android/);
assert.match(main,/DOWNLOAD LOCAL MODEL/);
assert.match(main,/RUN LOCAL MODEL TEST/);
assert.equal(manifest.models[0].executionLocation,"PHONE_LOCAL");
assert.equal(manifest.models[0].verificationRequired,true);

console.log("PASS phone local model source contract");
