import fs from "node:fs";
import crypto from "node:crypto";
import assert from "node:assert/strict";

const EXPECTED="193a2d50bc42925aa3d36ba506318fe286504b61e0e948fe232b29186897e8cc";
const hash=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

const androidLogo="apps/android/app/src/main/res/drawable/leeway_official_logo.png";
const pagesLogo="docs/leeway-official-logo.png";
const manifest=fs.readFileSync("apps/android/app/src/main/AndroidManifest.xml","utf8");
const page=fs.readFileSync("docs/index.html","utf8");
const pwa=fs.readFileSync("docs/manifest.webmanifest","utf8");
const gradle=fs.readFileSync("apps/android/app/build.gradle.kts","utf8");

assert.equal(hash(androidLogo),EXPECTED,"Android launcher asset must be the canonical LeeWay logo");
assert.equal(hash(pagesLogo),EXPECTED,"Pages logo must be the canonical LeeWay logo");
assert.match(manifest,/android:icon="@drawable\/leeway_official_logo"/);
assert.match(manifest,/android:roundIcon="@drawable\/leeway_official_logo"/);
assert.match(page,/href="\.\/leeway-official-logo\.png"/);
assert.match(pwa,/\.\/icons\/leeway-official-logo-192\.png/);
assert.match(pwa,/\.\/icons\/leeway-official-logo-512\.png/);
assert.match(gradle,/versionName = "0\.10\.0-agent-update-rc1"/);
assert.match(gradle,/versionCode = 25/);

console.log("PASS canonical LeeWay logo authority and Android 0.9.0 branding");
