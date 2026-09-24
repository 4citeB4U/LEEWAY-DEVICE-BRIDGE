import fs from "node:fs";
import assert from "node:assert/strict";

const gradle=fs.readFileSync("apps/android/app/build.gradle.kts","utf8");
assert.match(gradle,/versionName = "0\.8\.0"/);
assert.match(gradle,/abiFilters \+= listOf\("arm64-v8a"\)/);
assert.doesNotMatch(gradle,/x86_64/);
assert.doesNotMatch(gradle,/armeabi-v7a/);

console.log("PASS v0.8 Fold arm64 package contract");
