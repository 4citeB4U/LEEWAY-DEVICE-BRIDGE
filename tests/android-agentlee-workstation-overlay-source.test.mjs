import fs from "node:fs";
import assert from "node:assert/strict";

const root="apps/android/app/src/main";
const manifest=fs.readFileSync(root+"/AndroidManifest.xml","utf8");
const overlay=fs.readFileSync(root+"/java/industries/leeway/devicebridge/FloatingMicOverlay.kt","utf8");
const talk=fs.readFileSync(root+"/java/industries/leeway/devicebridge/AgentLeeTalkActivity.kt","utf8");
const authority=fs.readFileSync(root+"/java/industries/leeway/devicebridge/AgentLeeAuthority.kt","utf8");
const conversation=fs.readFileSync(root+"/java/industries/leeway/devicebridge/AgentLeeConversation.kt","utf8");
const voice=fs.readFileSync(root+"/java/industries/leeway/devicebridge/VoiceRuntime.kt","utf8");
const main=fs.readFileSync(root+"/java/industries/leeway/devicebridge/MainActivity.kt","utf8");

assert.match(manifest,/SYSTEM_ALERT_WINDOW/);
assert.match(manifest,/AgentLeeTalkActivity/);
assert.match(manifest,/VoiceOneActivity/);
assert.match(overlay,/TYPE_APPLICATION_OVERLAY/);
assert.match(overlay,/AgentLeeTalkActivity/);
assert.match(talk,/AgentLeeConversation\.respond/);
assert.match(authority,/LeeWay-Agent-Skills\/main\/config\/leeway-core-governance\.yaml/);
assert.match(authority,/Leeway-formula-live\/main/);
assert.match(authority,/selectFocalSkill/);
assert.match(conversation,/FORMULA_EXECUTION_STATE=NOT_EXECUTED|formulaExecutionState/);
assert.match(conversation,/VoiceRuntime\.speak/);
assert.match(voice,/agent-lee-voice-one/);
assert.match(voice,/LeeWay-Voice-Fabric\/mobile-runtime\.html/);
assert.doesNotMatch(voice,/TextToSpeech/);
assert.match(main,/ENABLE FLOATING AGENT LEE MIC/);
assert.match(main,/AgentLeeConversation\.respond/);

console.log("PASS Android secondary-workstation Agent Lee overlay source contract");
