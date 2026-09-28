import fs from "node:fs";
import assert from "node:assert/strict";

const script=fs.readFileSync("clients/remote-controller/termux-one-pull.sh","utf8");
assert.match(script,/--es leeway_action TERMUX_BOOTSTRAP/);
assert.match(script,/--es leeway_nonce/);
assert.match(script,/owner-bootstrap\?nonce=/);
assert.doesNotMatch(script,/read -r -s -p "Pairing token:/);
assert.match(script,/MainActivity/);
console.log("PASS Termux owner-bootstrap auto-launch contract");
