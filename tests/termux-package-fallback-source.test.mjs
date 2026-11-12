import fs from "node:fs";
import assert from "node:assert/strict";

const script=fs.readFileSync("clients/remote-controller/termux-one-pull.sh","utf8");
// A raw-source fallback cannot bypass a signed-release security hold.
assert.doesNotMatch(script,/RAW_META_URL=/);
assert.doesNotMatch(script,/RAW_APK_URL=/);
assert.doesNotMatch(script,/falling back to raw GitHub/);
assert.match(script,/releaseState/);
assert.match(script,/downloadEnabled/);
assert.match(script,/publicReleaseAuthorized/);
assert.match(script,/ANDROID_RELEASE_NOT_AUTHORIZED|Android release not authorized/);
assert.match(script,/sha256sum/);
assert.doesNotMatch(script,/android\.intent\.action\.DELETE/);
console.log("PASS Termux release-hold and no raw-source fallback contract");
