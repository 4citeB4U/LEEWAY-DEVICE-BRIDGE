import assert from "node:assert/strict";
import fs from "node:fs";

const src=fs.readFileSync(
  "clients/remote-controller/termux-consciousness-live-test.sh",
  "utf8"
);

assert.match(src,/No APK install occurs in this script/);
assert.doesNotMatch(src,/android\.intent\.action\.VIEW/);
assert.doesNotMatch(src,/android\.intent\.action\.DELETE/);
assert.doesNotMatch(src,/PackageInstallBroker/);
assert.match(src,/consciousness\.shadow\.set/);
assert.match(src,/enabled:false/);
assert.match(src,/enabled:true/);
assert.match(src,/shadowMetadataPresent/);
assert.match(src,/expectedForegroundPackage/);
assert.match(src,/actualForegroundPackage/);
assert.match(src,/predictionError=actual===target\?0:1/);
assert.match(src,/device\.apps\.launch/);
assert.match(src,/device\.ui\.snapshot/);
assert.match(src,/device\.ui\.back/);
assert.match(src,/unset LEEWAY_PAIRING_TOKEN/);
assert.doesNotMatch(src,/pairingToken.*write\(/);

console.log("PASS live consciousness harness is no-install, reversible, physical-outcome-checked and credential-bounded");
