import fs from "node:fs";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const server=fs.readFileSync("apps/android/app/src/main/java/industries/leeway/devicebridge/LocalBridgeServer.kt","utf8");
const handler=fs.readFileSync("apps/android/app/src/main/java/industries/leeway/devicebridge/LocalBridgeHttpHandler.kt","utf8");
const activity=fs.readFileSync("apps/android/app/src/main/java/industries/leeway/devicebridge/MainActivity.kt","utf8");
const script=fs.readFileSync("clients/remote-controller/termux-one-pull.sh","utf8");
const gradle=fs.readFileSync("apps/android/app/build.gradle.kts","utf8");

assert.match(server,/armOwnerBootstrap/);
assert.match(server,/ownerBootstrapNonce/);
assert.match(server,/120_000L/);
assert.match(handler,/\/owner-bootstrap/);
assert.match(server,/BOOTSTRAP_NONCE_MISMATCH/);
assert.match(server,/OWNER_LOCAL_LOOPBACK_BOOTSTRAP/);
assert.match(activity,/TERMUX_BOOTSTRAP/);
assert.match(activity,/leeway_nonce/);
assert.match(activity,/RemoteRelayService\.stop/);
assert.match(activity,/RemoteRelayService\.start/);
assert.match(script,/TERMUX_BOOTSTRAP/);
assert.match(script,/owner-bootstrap\?nonce=/);
assert.doesNotMatch(script,/Pairing token:/);
assert.doesNotMatch(script,/owner-bootstrap\.json/);
assert.match(script,/process\.env\.LEEWAY_BOOTSTRAP_RESPONSE/);
assert.match(script,/blocked "Automatic Termux pairing requires a separately verified authenticated IPC adapter\."\s*printf [^\n]*\nexit 6/);
assert.ok(script.indexOf("exit 6",script.indexOf("Automatic Termux pairing requires"))<script.indexOf("am start -n",script.indexOf("Automatic Termux pairing requires")));
for (const sideEffect of ['mkdir -p "$WORK_ROOT"','pkg install -y','install_latest_bridge || exit']) {
  assert.ok(script.indexOf("exit 6",script.indexOf("Automatic Termux pairing requires")) < script.indexOf(sideEffect), `Fail-closed gate must precede ${sideEffect}`);
}
assert.match(gradle,/versionName = "0\.9\.8-pocket-rc8"/);
assert.match(gradle,/versionCode = 23/);

// Execute the entrypoint on POSIX hosts: refusal must happen before mkdir,
// dependency installation, downloads or Android activity launches.
if (process.platform !== "win32") {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "leeway-termux-deny-"));
  try {
    const run = spawnSync("bash", ["clients/remote-controller/termux-one-pull.sh"], {
      env: { ...process.env, HOME: temp }, encoding: "utf8", timeout: 5000
    });
    assert.equal(run.status, 6, run.stderr);
    assert.match(run.stdout, /authenticated IPC adapter/);
    assert.equal(fs.existsSync(path.join(temp, ".leeway")), false);
    assert.equal(fs.existsSync(path.join(temp, "leeway-evidence")), false);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}
console.log("PASS Termux one-time owner bootstrap contract");