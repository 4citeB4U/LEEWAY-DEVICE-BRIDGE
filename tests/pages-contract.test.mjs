import fs from "node:fs";
import assert from "node:assert/strict";

const manifest=JSON.parse(fs.readFileSync("docs/package-manifest.json","utf8"));
assert.equal(manifest.schemaVersion,"0.3.0");
assert.equal(manifest.distributionRole,"GITHUB_PAGES_DISCOVERY_AND_DOWNLOAD");
assert.equal(manifest.runtimeRole,"PHONE_LOCAL");
assert.equal(manifest.updatePolicy.mode,"CHECK_AND_PROMPT_OWNER");
assert.equal(manifest.updatePolicy.automaticInstall,false);
assert.equal(manifest.updatePolicy.checkOnReconnect,true);
assert.equal(manifest.platformRoutes.android.updateMode,"RELEASE_HOLD_NO_PUBLIC_INSTALL");
assert.equal(manifest.platformRoutes.android.state,"SOURCE_ONLY");
assert.equal(manifest.platformRoutes.ios.updateMode,"UNSIGNED_IPA_SOURCE_ONLY_NATIVE_DEVICE_INSTALL_UNVERIFIED");
assert.equal(manifest.platformRoutes.ios.state,"SOURCE_ONLY");
assert.equal(manifest.platformRoutes.linux.state,"SOURCE_ONLY");
assert.ok(manifest.packages.some(p=>p.platform==="android"));
assert.ok(manifest.packages.some(p=>p.platform==="ios"));
const android=manifest.packages.find(p=>p.platform==="android");
assert.equal(android.formulaQualification.measuredBytes,android.sizeBytes);
assert.equal(android.formulaQualification.measuredSha256,android.sha256);
assert.equal(android.nativeVerification,false);
assert.equal(android.downloadUrl,null);
assert.equal(android.status,"SECURITY_HOLD_NOT_QUALIFIED");
const apple=manifest.packages.find(p=>p.platform==="ios");
assert.equal(apple.nativeVerification,false);
assert.equal(apple.downloadUrl,null);
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
