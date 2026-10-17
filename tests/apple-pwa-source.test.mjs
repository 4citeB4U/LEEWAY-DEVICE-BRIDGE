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
assert.match(page, /APPLE BROWSER ADAPTER/);
assert.match(page, /RUN BROWSER COMPUTE PROBE/);
assert.match(source, /nativeMetalState: "NOT_OBSERVED"/);
assert.match(source, /formulaState: "NOT_EXECUTED"/);
assert.match(source, /receiptState: "NOT_CREATED"/);

console.log("PASS Apple PWA keeps browser compute separate from native Metal and Formula authority");
