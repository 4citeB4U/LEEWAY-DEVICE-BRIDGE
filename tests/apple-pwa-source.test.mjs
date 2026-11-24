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
assert.match(page, /Apple Device Bridge setup/);
assert.match(page, /Begin with LeeWay account sign-in/);
assert.match(page, /Return to secure Apple setup/);
assert.match(page, /Use LeeWay on Apple/);
assert.match(page, /id="dbAppleHomeInstall"/);
assert.match(page, /id="dbAppleBridgeStatus"/);
assert.match(page, /Apple controls/);
assert.match(page, /id="appleRuntime"/);
assert.match(page, /CHECK APPLE BROWSER/);
assert.match(page, /RUN BROWSER COMPUTE/);
assert.match(page, /Safari compute may use WebGPU when exposed/);
assert.match(page, /Only the separately installed LeeWay Device Bridge IPA may report direct Metal evidence/);
assert.match(page, /Return to secure device setup/);
assert.doesNotMatch(page, /OPEN APPLE WORKSTATION|OPEN APPLE PACKAGE/);
assert.match(page, /id="dbOnboarding"/);
assert.doesNotMatch(page, /DOWNLOAD ANDROID EXTENSION/);
assert.match(page, /OPEN WINDOWS WORKSTATION/);
assert.match(page, /OPEN LINUX WORKSTATION/);
assert.match(page, /https:\/\/github\.com\/codespaces\/new\?hide_repo_select=true&amp;repo=1380304068/);
assert.match(page, /<span>APPLE PACKAGE<\/span><strong>RELEASE HOLD<\/strong>/);
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


// Apple user's normal page must not link to an unsigned IPA or GitHub
// workstation; those source tools remain separately disclosed to developers.
const appleLane=page.split('id="appleLane">')[1]?.split('id="androidLane">')[0] || '';
assert.doesNotMatch(appleLane,/github\.com|unsigned\.ipa|codespaces\/new/);
assert.match(page,/id="dbAppleSetupInstructions"/);

console.log("PASS Apple PWA keeps original Home Screen entry, browser compute and native authority separate");

