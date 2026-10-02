import assert from "node:assert/strict";
import fs from "node:fs";

const shadow=fs.readFileSync(
  "apps/android/app/src/main/java/industries/leeway/devicebridge/ConsciousnessShadowRuntime.kt",
  "utf8"
);
const router=fs.readFileSync(
  "apps/android/app/src/main/java/industries/leeway/devicebridge/RemoteCommandRouter.kt",
  "utf8"
);

assert.match(shadow,/getBoolean\(KEY_ENABLED, false\)/);
assert.match(shadow,/if \(!enabled\(context\)\) return null/);
assert.match(shadow,/if \(ticket == null\) return result/);
assert.match(shadow,/put\("responseInfluence", false\)/);
assert.match(shadow,/put\("memoryAuthority", false\)/);
assert.match(shadow,/put\("actionAuthority", false\)/);
assert.match(shadow,/put\("canonicalFormulaState", "NOT_EXECUTED"\)/);
assert.match(shadow,/put\("prismMappingState", "NOT_MAPPED_LIVE_EVIDENCE"\)/);
assert.doesNotMatch(shadow,/DeviceOperatorAccessibilityService/);
assert.doesNotMatch(shadow,/AppOperator\./);
assert.doesNotMatch(shadow,/ModelRuntime\.generate/);
assert.doesNotMatch(shadow,/RemoteCommandRouter\.execute/);

assert.match(router,/"consciousness\.shadow\.status"/);
assert.match(router,/"consciousness\.shadow\.set"/);
assert.match(router,/val shadowTicket = ConsciousnessShadowRuntime\.begin\(context, prompt\)/);
assert.match(router,/ConsciousnessShadowRuntime\.finish\(context, shadowTicket, value\)/);
assert.match(router,/if \(!generated\.optBoolean\("ok"\)\) return finish\(generated\)/);

console.log("PASS L1 consciousness shadow is off-by-default, observe-only, non-actuating and fail-non-blocking");
