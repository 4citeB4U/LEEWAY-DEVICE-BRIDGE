import fs from "node:fs";
import assert from "node:assert/strict";

const source = fs.readFileSync(
  "apps/android/app/src/main/java/industries/leeway/devicebridge/ConversationPrompt.kt",
  "utf8"
);

assert.match(source, /persistent LeeWay-governed sovereign operator/);
assert.match(source, /grounded hip-hop cadence/);
assert.match(source, /Goal, Context, Confidence, Risk, Prediction, and Error/);
assert.match(source, /16×6 history/);
assert.match(source, /Six-bit binary represents exactly 64 basis patterns/);
assert.match(source, /states 64 through 69 require the extended QB64 representation/);
assert.match(source, /Do not lock to one emotion/);
assert.match(source, /after a third repeated accusation/);
assert.match(source, /Discovered is not authorized/);
assert.match(source, /Mounted is not executed/);
assert.match(source, /A receipt records only reality/);
assert.doesNotMatch(source, /You are Agent Lee, a helpful assistant/);

console.log("PASS Agent Lee persona v2 prompt source contract");
