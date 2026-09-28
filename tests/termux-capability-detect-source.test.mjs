import fs from "node:fs";
import assert from "node:assert/strict";
const s=fs.readFileSync("clients/remote-controller/termux-one-pull.sh","utf8");
assert.match(s,/probe_owner_bootstrap\(\)/);
assert.match(s,/owner-bootstrap\?nonce=/);
assert.match(s,/package reinstall skipped/);
assert.doesNotMatch(s,/installed_version\(\)/);
assert.doesNotMatch(s,/Installed Device Bridge version=/);
console.log("PASS Termux capability-detect install contract");
