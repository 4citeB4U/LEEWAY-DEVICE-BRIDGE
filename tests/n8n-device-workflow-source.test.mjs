import fs from "node:fs";
import assert from "node:assert/strict";

const path="providers/n8n/workflows/leeway-device-bridge-health.json";
const workflows=JSON.parse(fs.readFileSync(path,"utf8"));
assert.equal(Array.isArray(workflows),true);
assert.equal(workflows.length,1);
const wf=workflows[0];
assert.equal(wf.id,"leeway-device-bridge-health-v1");
assert.equal(wf.name,"LEEWAY-DEVICE-BRIDGE-HEALTH");
assert.equal(wf.active,false);
assert.ok(wf.nodes.some(n=>n.type==="n8n-nodes-base.webhook"));
assert.ok(wf.nodes.some(n=>n.type==="n8n-nodes-base.httpRequest"));
const http=wf.nodes.find(n=>n.type==="n8n-nodes-base.httpRequest");
assert.equal(http.parameters.url,"http://host.docker.internal:5323/health");
assert.equal(wf.meta.productionDockerRequired,false);
console.log("PASS n8n Device Bridge workflow source contract");
