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
assert.match(page, /id="appleLane"/);
assert.match(page, /APPLE · IPHONE \/ IPAD \/ MAC/);
assert.match(page, /Apple workspace and native Metal/);
assert.match(page, /Use the Home Screen app as the daily LeeWay front door/);
assert.match(page, /OPEN APPLE WORKSTATION/);
assert.match(page, /OPEN APPLE PACKAGE/);
assert.match(page, /releases\/tag\/apple-latest/);
assert.match(page, /Apple controls/);
assert.match(page, /id="appleRuntime"/);
assert.match(page, /CHECK APPLE BROWSER/);
assert.match(page, /RUN BROWSER COMPUTE/);
assert.match(page, /Safari compute may use WebGPU when exposed/);
assert.match(page, /Only the separately installed LeeWay Device Bridge IPA may report direct Metal evidence/);
assert.match(page, /OPEN ANDROID WORKSTATION/);
assert.match(page, /OPEN WINDOWS WORKSTATION/);
assert.match(page, /OPEN LINUX WORKSTATION/);
assert.match(page, /https:\/\/github\.com\/codespaces\/new\?hide_repo_select=true&amp;repo=1380304068/);
assert.match(page, /<span>APPLE PACKAGE<\/span><strong>QUALIFIED<\/strong>/);
assert.doesNotMatch(page, /Docker development environment/);
assert.match(app, /Safari does not let a web page open Apple's Add to Home Screen control/);
assert.match(app, /LeeWay is running as an installed Home Screen app/);
assert.match(app, /function beginAppleQualification/);
assert.match(app, /document\.documentElement\.classList\.add\("apple-pwa"\)/);
assert.match(recovery, /REFRESH LEEWAY NOW/);
assert.match(recovery, /serviceWorker\.getRegistrations/);
assert.match(recovery, /caches\.delete/);
assert.match(source, /nativeMetalState: "NOT_OBSERVED"/);
assert.match(source, /formulaState: "NOT_EXECUTED"/);
assert.match(source, /receiptState: "NOT_CREATED"/);

console.log("PASS Apple PWA keeps browser compute separate from native Metal and Formula authority");

