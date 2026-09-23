import fs from "node:fs";
import assert from "node:assert/strict";

const manifest=JSON.parse(fs.readFileSync("docs/package-manifest.json","utf8"));
assert.equal(manifest.schemaVersion,"0.2.0");
assert.equal(manifest.distributionRole,"GITHUB_PAGES_DISCOVERY_AND_DOWNLOAD");
assert.equal(manifest.runtimeRole,"PHONE_LOCAL");
assert.ok(manifest.packages.some(p=>p.platform==="android"));
assert.ok(manifest.packages.every(p=>p.nativeVerification===true));
assert.ok(manifest.packages.every(p=>p.dockerRequired===false));

const discovery=fs.readFileSync("docs/device-discovery.js","utf8");
assert.match(discovery,/NATIVE_VERIFICATION_REQUIRED/);
assert.match(discovery,/getHighEntropyValues/);

const app=fs.readFileSync("docs/app.js","utf8");
assert.match(app,/authority:"BROWSER_DISCOVERY_ONLY"/);
assert.match(app,/publication:"GITHUB_PAGES"/);
assert.match(app,/runtimeLocation:"PHONE_LOCAL"/);
assert.match(app,/dockerRuntimeRequired:false/);
assert.match(app,/localStorage/);

const runtime=JSON.parse(fs.readFileSync("docs/runtime-contract.json","utf8"));
assert.equal(runtime.publication.source,"GITHUB_PAGES");
assert.equal(runtime.execution.privilegedRuntime,"PHONE_LOCAL_NATIVE_PACKAGE");
assert.equal(runtime.publication.dockerRequired,false);

console.log("PASS pages bootstrap contract");