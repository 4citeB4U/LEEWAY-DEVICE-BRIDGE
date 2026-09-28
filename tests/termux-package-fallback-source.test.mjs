import fs from "node:fs";
import assert from "node:assert/strict";

const script=fs.readFileSync("clients/remote-controller/termux-one-pull.sh","utf8");
assert.match(script,/RAW_META_URL=/);
assert.match(script,/RAW_APK_URL=/);
assert.match(script,/falling back to raw GitHub/);
assert.match(script,/sha256sum/);
console.log("PASS one-pull APK fallback contract");