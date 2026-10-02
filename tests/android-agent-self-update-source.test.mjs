
import fs from "node:fs";
import assert from "node:assert/strict";

const root="apps/android/app/src/main/java/industries/leeway/devicebridge";
const update=fs.readFileSync(`${root}/AgentLeeUpdate.kt`,"utf8");
const activity=fs.readFileSync(`${root}/MainActivity.kt`,"utf8");
const server=fs.readFileSync(`${root}/LocalBridgeServer.kt`,"utf8");
const installer=fs.readFileSync(`${root}/PackageInstallBroker.kt`,"utf8");
const gradle=fs.readFileSync("apps/android/app/build.gradle.kts","utf8");

assert.match(activity,/UPDATE AGENT LEE/);
assert.match(activity,/AgentLeeUpdate\.checkAndInstall/);
assert.match(update,/https:\/\/4citeb4u\.github\.io\/LEEWAY-DEVICE-BRIDGE\/docs\/downloads\/leeway-device-bridge-android-latest\.json/);
assert.match(update,/availableCode > BuildConfig\.VERSION_CODE/);
assert.match(update,/\^\[a-f0-9\]\{64\}\$/);
assert.match(update,/PackageInstallBroker\.installFromUrl/);
assert.match(update,/startsWith\("https:\/\/"\)/);
assert.match(installer,/SHA256_MISMATCH/);
assert.match(installer,/ACTION_MANAGE_UNKNOWN_APP_SOURCES/);
assert.match(installer,/INSTALLER_OPENED/);
assert.match(server,/appVersionName/);
assert.match(server,/appVersionCode/);
assert.match(server,/updateMetadataUrl/);
assert.match(gradle,/versionCode = 24/);
assert.match(gradle,/versionName = "0\.9\.9-pocket-rc9"/);
assert.doesNotMatch(update,/silentInstall\s*=\s*true/);

console.log("PASS Agent Lee one-tap updater preserves HTTPS, hash verification, version reporting, and Android owner authorization");
