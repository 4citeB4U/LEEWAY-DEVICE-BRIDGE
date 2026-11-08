import fs from "node:fs";
import assert from "node:assert/strict";

const base = "apps/android/app/src/main/java/industries/leeway/devicebridge";
const checker = fs.readFileSync(`${base}/GitHubUpdateChecker.kt`, "utf8");
const activity = fs.readFileSync(`${base}/MainActivity.kt`, "utf8");
const relay = fs.readFileSync(`${base}/RemoteRelayService.kt`, "utf8");
const broker = fs.readFileSync(`${base}/PackageInstallBroker.kt`, "utf8");
const workflow = fs.readFileSync(".github/workflows/android-build.yml", "utf8");

assert.match(checker, /https:\/\/4citeb4u\.github\.io\/LEEWAY-DEVICE-BRIDGE\/docs\/package-manifest\.json/);
assert.match(checker, /versionCode/);
assert.match(checker, /remoteCode <= currentCode/);
assert.match(checker, /SHA256/);
assert.match(checker, /PendingIntent/);
assert.match(checker, /POST_NOTIFICATIONS/);
assert.doesNotMatch(checker, /silentInstall|automaticInstall/);
assert.match(activity, /CHECK GITHUB FOR UPDATES/);
assert.match(activity, /showUpdatePrompt/);
assert.match(activity, /PackageInstallBroker\.installFromUrl/);
assert.match(activity, /SHOW_UPDATE/);
assert.match(relay, /GitHubUpdateChecker\.check/);
assert.match(broker, /silentInstall", false/);
assert.match(workflow, /docs\/package-manifest\.json/);
assert.match(workflow, /sourceRunId/);

console.log("PASS Android GitHub owner-confirmed update source contract");
