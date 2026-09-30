import assert from "node:assert/strict";
import fs from "node:fs";

const bootstrap=fs.readFileSync("clients/phone-workstation/bootstrap-desktop-commander.sh","utf8");
const patch=fs.readFileSync("clients/phone-workstation/patch-desktop-commander-android.mjs","utf8");
const doc=fs.readFileSync("docs/ANDROID-SECONDARY-WORKSTATION.md","utf8");

for(const token of ["nodejs","git","ripgrep","curl","openssh","desktop-commander","01-desktop-commander-remote","termux-wake-lock"]){
  assert.ok(bootstrap.includes(token),`bootstrap missing ${token}`);
}
for(const token of [
  "libtermux-exec.so",
  "/data/data/com.termux/files/usr/bin/rg",
  "process.platform === 'android'",
  "terminal-manager.js",
  "improved-process-tools.js",
  "ripgrep-resolver.js",
  "search-manager.js"
]){
  assert.ok(patch.includes(token),`patch missing ${token}`);
}
for(const token of [
  "USB independence",
  "PC independence",
  "Session recovery",
  "Cold boot",
  "TERMUX_APP_UID_NON_ROOT",
  "first success != completion"
]){
  assert.ok(doc.includes(token),`guide missing ${token}`);
}
console.log("PASS phone-workstation-desktop-commander-source");
