import fs from "node:fs";
import assert from "node:assert/strict";

const base="apps/android/app/src/main/java/industries/leeway/devicebridge/";
const consciousness=fs.readFileSync(base+"ConsciousnessRuntime.kt","utf8");
const router=fs.readFileSync(base+"RemoteCommandRouter.kt","utf8");
const activity=fs.readFileSync(base+"MainActivity.kt","utf8");

assert.match(consciousness,/enum class Mode \{ OFF, SHADOW, ADVISORY \}/);
assert.match(consciousness,/llmDependencyForRuntime", 0/);
assert.match(consciousness,/formulaAuthority", "NOT_BOUND_LIVE"/);
assert.match(consciousness,/liveActionAuthority", false/);
assert.match(consciousness,/DETERMINISTIC_ARITHMETIC_V0/);
assert.match(consciousness,/VERIFIED_PHONE_MODEL_STATUS/);
assert.match(consciousness,/PHONE_LIVE_OPERATIONAL_CANDIDATE/);

assert.match(router,/ConsciousnessRuntime\.observe/);
assert.match(router,/ConsciousnessRuntime\.advisoryAnswer/);
assert.match(router,/ModelRuntime\.generateConversation/);
assert.match(router,/canonicalFormulaState", "NOT_EXECUTED"/);

assert.match(activity,/CONSCIOUSNESS STATUS/);
assert.match(activity,/CONSCIOUSNESS MODE:/);
assert.match(activity,/ConsciousnessRuntime\.advisoryAnswer/);
assert.match(activity,/\?: ModelRuntime\.generateConversation/);

console.log("PASS Android consciousness OFF-SHADOW-ADVISORY source contract");