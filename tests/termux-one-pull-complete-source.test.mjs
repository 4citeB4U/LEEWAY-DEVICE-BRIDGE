import fs from "node:fs";
import assert from "node:assert/strict";

const script=fs.readFileSync("clients/remote-controller/termux-one-pull.sh","utf8");
const router=fs.readFileSync("apps/android/app/src/main/java/industries/leeway/devicebridge/RemoteCommandRouter.kt","utf8");

assert.match(script,/TARGET_VERSION="\$\{LEEWAY_TARGET_VERSION:-\}"/);
assert.match(script,/TARGET_VERSION="\$version"/);
assert.match(script,/Owner target version and approved version differ/);
assert.doesNotMatch(script,/TARGET_VERSION="0\.9\.0"/);
assert.match(script,/leeway-device-bridge-android-latest\.json/);
assert.match(script,/sha256sum/);
assert.match(script,/termux-open --view/);
assert.doesNotMatch(script,/android\.intent\.action\.DELETE/);
assert.match(script,/NO UNINSTALL performed/);
assert.match(script,/releaseState/);
assert.match(script,/TERMUX_BOOTSTRAP/);
assert.match(script,/owner-bootstrap\?nonce=/);
assert.match(script,/model\.install/);
assert.match(router,/"model\.install"/);
assert.match(router,/ModelRuntime\.download/);

console.log("PASS one-pull upgrade/bootstrap/model recovery contract");
