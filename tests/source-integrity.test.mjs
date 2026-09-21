import fs from "node:fs";
import assert from "node:assert/strict";
const mustExist=[
 "AGENTS.md","ARCHITECTURE.md","SECURITY.md",
 "contracts/device.schema.json","contracts/capability.schema.json",
 "contracts/session.schema.json","contracts/receipt.schema.json",
 "contracts/bootstrap.schema.json","contracts/device-passport.schema.json",
 "docs/index.html","docs/device-discovery.js","docs/package-manifest.json",
 "apps/android/app/src/main/AndroidManifest.xml",
 "apps/android/app/src/main/java/industries/leeway/devicebridge/DevicePassport.kt",
 "apps/android/app/src/main/java/industries/leeway/devicebridge/BootstrapStore.kt",
 "apps/android/app/src/main/java/industries/leeway/devicebridge/MainActivity.kt"
];
for(const p of mustExist) assert.ok(fs.existsSync(p),`missing ${p}`);
for(const p of fs.readdirSync("contracts").filter(x=>x.endsWith(".json"))){
 const j=JSON.parse(fs.readFileSync("contracts/"+p,"utf8"));
 assert.ok(j["$schema"],`schema authority missing: ${p}`);
}
const passport=fs.readFileSync("apps/android/app/src/main/java/industries/leeway/devicebridge/DevicePassport.kt","utf8");
for(const token of ["Build.MANUFACTURER","Build.MODEL","Build.DEVICE","Build.PRODUCT","Build.SUPPORTED_ABIS","memory","storage","display"]) assert.match(passport,new RegExp(token.replace(".","\\.")));
console.log("PASS source integrity");
