import assert from "node:assert/strict";
import fs from "node:fs";

const base="apps/android/app/src/main";
const manifest=fs.readFileSync(base+"/AndroidManifest.xml","utf8");
const keeper=fs.readFileSync(base+"/java/industries/leeway/devicebridge/WorkstationKeeper.kt","utf8");
const relay=fs.readFileSync(base+"/java/industries/leeway/devicebridge/RemoteRelayService.kt","utf8");
const main=fs.readFileSync(base+"/java/industries/leeway/devicebridge/MainActivity.kt","utf8");
const bootstrap=fs.readFileSync("clients/phone-workstation/bootstrap-desktop-commander.sh","utf8");
const gradle=fs.readFileSync("apps/android/app/build.gradle.kts","utf8");

assert.match(manifest,/com\.termux\.permission\.RUN_COMMAND/);
assert.match(keeper,/com\.termux\.RUN_COMMAND/);
assert.match(keeper,/com\.termux\.app\.RunCommandService/);
assert.match(keeper,/RUN_COMMAND_PATH/);
assert.match(keeper,/RUN_COMMAND_WORKDIR/);
assert.match(keeper,/RUN_COMMAND_BACKGROUND/);
assert.match(keeper,/desktop-commander-keeper\.sh/);

assert.match(relay,/workstationKeeperTick/);
assert.match(relay,/WORKSTATION_KEEPER_INTERVAL_MS = 30_000L/);
assert.match(relay,/WorkstationKeeper\.ensure/);
assert.match(relay,/START_STICKY/);

assert.match(main,/AUTHORIZE BACKGROUND WORKSTATION KEEPER/);
assert.match(main,/WorkstationKeeper\.TERMUX_PERMISSION/);
assert.match(main,/requestPermissions/);

assert.match(bootstrap,/allow-external-apps=true/);
assert.match(bootstrap,/desktop-commander-keeper\.sh/);
assert.match(bootstrap,/pgrep -f/);
assert.match(bootstrap,/setsid nohup desktop-commander remote/);
assert.match(bootstrap,/flock -n 9/);
assert.match(bootstrap,/while true/);

assert.match(gradle,/versionCode = 25/);
assert.match(gradle,/versionName = "0\.9\.10-c3-4"/);

console.log("PASS android-workstation-keeper-source");
