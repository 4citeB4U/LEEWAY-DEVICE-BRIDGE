import fs from "node:fs";
import assert from "node:assert/strict";

const script=fs.readFileSync("clients/remote-controller/termux-one-pull.sh","utf8");
assert.match(script,/--es leeway_action SHOW_PAIRING/);
assert.match(script,/COPY PAIRING TOKEN/);
assert.match(script,/MainActivity/);
console.log("PASS Termux pairing auto-launch contract");
