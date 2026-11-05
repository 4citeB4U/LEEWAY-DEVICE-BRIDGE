/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.PROVIDER_TEST
TAG: LEEWAY.BRIDGE.INTERNAL_MODEL_LOGISTICS_SOURCE_BINDING.V1
5WH:
WHAT = Check source references for Model Hub and Logistics in the original provider registry.
WHY = Restore existing LeeWay services without inventing live device or model execution.
WHO = LeeWay Device Bridge source reviewers.
WHERE = tests/mcp/internal-app-provider-registry.test.mjs
WHEN = 2026-11-05
HOW = Read actual registry and assert source authority and fail-closed states.
AUTHORIZED_ROLES: Source-only; no device commands.
LICENSE: Existing repository terms.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const doc=JSON.parse(readFileSync(new URL('../../docs/provider-registry.json',import.meta.url),'utf8'));
const byId=new Map(doc.providers.map(p=>[p.id,p]));
test('original registry recognizes canonical Model Hub and Logistics source',()=>{
 assert.equal(byId.size,doc.providers.length);
 const hub=byId.get('leeway-model-hub'),logistics=byId.get('leeway-logistics');
 assert.ok(hub&&logistics);
 assert.equal(hub.sourceRepository,'4citeB4U/LeeWay-Model-Hub');
 assert.equal(hub.publicUi,'https://4citeb4u.github.io/LeeWay-Model-Hub/');
 assert.ok(hub.interfaces.includes('GET /v1/catalog'));
 assert.ok(hub.interfaces.includes('POST /v1/chat'));
 assert.equal(logistics.sourceRepository,'4citeB4U/LEEWAY-LOGISTICS-');
 assert.equal(logistics.publicUi,'https://4citeb4u.github.io/LEEWAY-LOGISTICS-/');
 assert.ok(logistics.interfaces.includes('TRANSIT_WORLD_BROWSER_UI'));
});
test('registry discovery never grants model, worker, GPU, location or device execution',()=>{
 for(const id of ['leeway-model-hub','leeway-logistics']){
  const p=byId.get(id);
  assert.equal(p.status,'SOURCE_REGISTERED_RUNTIME_BINDING_UNVERIFIED');
  assert.equal(p.runtimeBinding,'NOT_PROBED');
  assert.equal(p.executionEnabled,false);
  assert.match(p.sourceGitBlobSha,/^[a-f0-9]{40}$/);
  assert.ok(!Object.hasOwn(p,'token'));
  assert.ok(!Object.hasOwn(p,'credentials'));
 }
 const hub=byId.get('leeway-model-hub');
 assert.equal(hub.modelDownloadActionProvided,false);
 assert.equal(hub.activeModelResidency,'SINGLE_SELECTED_MODEL_ALL_MODELS_PAUSED_NOT_VERIFIED');
 const loc=byId.get('leeway-logistics');
 assert.equal(loc.deviceLocation.permission,'EXPLICIT_USER_CONSENT_REQUIRED');
 assert.equal(loc.deviceLocation.sharing,'DENIED_BY_DEFAULT');
 assert.equal(loc.deviceLocation.accuracy,'UNVERIFIED');
 assert.equal(loc.trainingDataNotLive,true);
});
