import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createApplePwaDiagnostics, browserDiagnosticStates } from "../docs/apple-pwa-diagnostics.js";

const snapshot = createApplePwaDiagnostics({
  now: new Date("2026-10-17T00:00:00.000Z"),
  standalone: true,
  serviceWorkerControlled: true
});

assert.equal(snapshot.adapter, "leeway.device.bridge.pwa");
assert.equal(snapshot.runtime.standalone, true);
assert.equal(snapshot.browserCompute.state, "NOT_RUN");
assert.equal(snapshot.nativeMetal.state, "NOT_OBSERVED");
assert.equal(snapshot.formula.canonicalState, "NOT_EXECUTED");
assert.equal(snapshot.veritas.state, "NOT_EXECUTED");
assert.equal(snapshot.receipt.state, "NOT_CREATED");
assert.equal(browserDiagnosticStates.passed, "BROWSER_WEBGPU_READBACK_PASSED");

const page = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");
const source = readFileSync(new URL("../docs/apple-pwa-diagnostics.js", import.meta.url), "utf8");
const app = readFileSync(new URL("../docs/app.js", import.meta.url), "utf8");
const recovery = readFileSync(new URL("../docs/refresh.html", import.meta.url), "utf8");
assert.match(page, /APPLE BROWSER ADAPTER/);
assert.match(page, /APPLE IPHONE \/ IPAD/);
assert.match(page, /NEXT STEP FOR THIS IPHONE/);
assert.match(page, /CHECK THIS IPHONE NOW/);
assert.match(page, /OPEN APPLE PWA WORKSTATION/);
assert.match(page, /OPEN ANDROID REMOTE WORKSTATION/);
assert.match(page, /id="secondaryWorkstation" data-android-only/);
assert.match(page, /SHOW APPLE INSTALL STATUS/);
assert.match(page, /There is no Apple file, APK, IPA, or Android download/);
assert.match(page, /launch LeeWay by tapping the new Home Screen icon/);
assert.match(page, /RUN BROWSER COMPUTE PROBE/);
assert.match(app, /Safari does not let a web page open Apple's Add to Home Screen control/);
assert.match(app, /LEEWAY APP INSTALLED — SHOW STATUS/);
assert.match(app, /function beginAppleQualification/);
assert.match(app, /#openAppleWorkstation/);
assert.match(app, /document\.documentElement\.classList\.add\("apple-pwa"\)/);
assert.match(recovery, /REFRESH LEEWAY NOW/);
assert.match(recovery, /serviceWorker\.getRegistrations/);
assert.match(recovery, /caches\.delete/);
assert.match(source, /nativeMetalState: "NOT_OBSERVED"/);
assert.match(source, /formulaState: "NOT_EXECUTED"/);
assert.match(source, /receiptState: "NOT_CREATED"/);

console.log("PASS Apple PWA keeps browser compute separate from native Metal and Formula authority");
