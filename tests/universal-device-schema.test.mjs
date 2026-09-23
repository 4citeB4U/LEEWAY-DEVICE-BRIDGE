import fs from "node:fs";
import assert from "node:assert/strict";

const schema=JSON.parse(fs.readFileSync("contracts/device.schema.json","utf8"));
const required=new Set(schema.required||[]);
const props=schema.properties||{};

for(const name of [
  "deviceId","canonicalName","aliases","deviceClass","provider","transport",
  "capabilities","supported","available","authorized","active","healthy","verified",
  "desiredState","reportedState","trustState","revocationState","evidence","receipts"
]){
  assert.ok(required.has(name), "missing required device field: "+name);
  assert.ok(props[name], "missing device property: "+name);
}

for(const name of ["supported","available","authorized","active","healthy","verified"]){
  assert.equal(props[name].type,"boolean");
}

assert.ok(props.capabilities.items.$ref.endsWith("capability.schema.json"));
assert.ok(props.evidence.items.properties.classification.enum.includes("VERIFIED"));
assert.ok(props.evidence.items.properties.classification.enum.includes("BLOCKED"));
assert.ok(props.trustState.enum.includes("REVOKED"));
assert.ok(props.revocationState.enum.includes("ACTIVE"));

console.log("PASS universal device schema contract");