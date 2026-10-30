import fs from "node:fs";
import assert from "node:assert/strict";

const root="apps/android/app/src/main/java/industries/leeway/devicebridge";
const update=fs.readFileSync(`${root}/AgentLeeUpdate.kt`,"utf8");
const activity=fs.readFileSync(`${root}/MainActivity.kt`,"utf8");
const server=fs.readFileSync(`${root}/LocalBridgeServer.kt`,"utf8");
const installer=fs.readFileSync(`${root}/PackageInstallBroker.kt`,"utf8");
const manifest=fs.readFileSync("apps/android/app/src/main/AndroidManifest.xml","utf8");
const network=fs.readFileSync("apps/android/app/src/main/res/xml/leeway_network_security.xml","utf8");
const gradle=fs.readFileSync("apps/android/app/build.gradle.kts","utf8");

assert.match(activity,/UPDATE AGENT LEE/);
assert.match(activity,/AgentLeeUpdate\.checkAndInstall/);
assert.match(update,/LOCAL_PREPARE_URL = "http:\/\/127\.0\.0\.1:8791\/prepare"/);
assert.match(update,/listOf\("pocket-agent","device-bridge"\)/);
assert.match(update,/versionCode>installed\.versionCode/);
assert.match(update,/\^\[a-f0-9\]\{64\}\$/);
assert.match(update,/PackageInstallBroker\.installFromUrl/);
assert.match(update,/packageUrl\.startsWith\("http:\/\/127\.0\.0\.1:8791\/"\)/);
assert.match(installer,/TRUSTED_UPDATE_TRANSPORT_REQUIRED/);
assert.match(installer,/http:\/\/127\.0\.0\.1:/);
assert.match(installer,/SHA256_MISMATCH/);
assert.match(installer,/ACTION_MANAGE_UNKNOWN_APP_SOURCES/);
assert.match(installer,/INSTALLER_OPENED/);
assert.match(manifest,/networkSecurityConfig="@xml\/leeway_network_security"/);
assert.match(network,/base-config cleartextTrafficPermitted="false"/);
assert.match(network,/>127\.0\.0\.1<\/domain>/);
assert.match(server,/appVersionName/);
assert.match(server,/appVersionCode/);
assert.match(server,/updateMetadataUrl/);
assert.match(gradle,/versionCode = 25/);
assert.match(gradle,/versionName = "0\.10\.0-agent-update-rc1"/);
assert.doesNotMatch(update,/silentInstall\s*=\s*true/);

console.log("PASS Agent Lee unified updater preserves component versioning, hash verification, loopback-only package transfer, and Android owner authorization");
