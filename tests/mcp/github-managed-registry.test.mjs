/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.MANAGED.REGISTRY.GITHUB.TEST
TAG: LEEWAY.MANAGED.REGISTRY.GITHUB_SNAPSHOT.TEST.V1
5WH:
WHAT = Exercise the immutable GitHub registry snapshot binding and fail-closed denials.
WHY = No historical device flag or unverified GitHub JSON may be elevated to an enrolled device.
WHO = LeeWay Device Bridge source CI; not independent Veritas.
WHERE = tests/mcp/github-managed-registry.test.mjs.
WHEN = 2026-11-25.
HOW = Exact pinned commit/digest with isolated HTTP fixtures, negative tests and source integration assertion.
AUTHORITY = SOURCE_TEST_ONLY.
LICENSE = MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { loadApprovedRegistryResolver } from '../../operator/hosting/approved-registry-resolver.mjs';

const revision='a'.repeat(40);
const empty=JSON.stringify({schemaVersion:'leeway.managed-device-registry.v1',
 authority:'TRUSTED_RUNTIME_DEVICE_REGISTRY',records:[]});
const hash=s=>createHash('sha256').update(s).digest('hex');
const binding=(body=empty)=>({
 LEEWAY_MCP_OWNER_SUB:'owner-zitadel-subject-123',
 LEEWAY_DEVICE_REGISTRY_GITHUB_COMMIT:revision,
 LEEWAY_DEVICE_REGISTRY_GITHUB_SHA256:hash(body),
});
const response=body=>new Response(body,{status:200,headers:{'content-type':'application/json'}});
const expectedUrl='https://raw.githubusercontent.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/'+revision+'/registry/managed-device-registry.v1.json';

test('no GitHub source pin leaves the registry unbound', async()=>{
 assert.equal(await loadApprovedRegistryResolver({LEEWAY_MCP_OWNER_SUB:'owner-zitadel-subject-123'}),null);
});
test('partial or non-commit pins are rejected before fetching',async()=>{
 for(const config of [
  {...binding(),LEEWAY_DEVICE_REGISTRY_GITHUB_COMMIT:''},
  {...binding(),LEEWAY_DEVICE_REGISTRY_GITHUB_SHA256:''},
  {...binding(),LEEWAY_DEVICE_REGISTRY_GITHUB_COMMIT:'main'},
  {...binding(),LEEWAY_DEVICE_REGISTRY_GITHUB_SHA256:'f'.repeat(63)},
 ])await assert.rejects(loadApprovedRegistryResolver(config),/GITHUB_REGISTRY_PIN_INVALID/);
});
test('owner binding is required before fetching',async()=>{
 await assert.rejects(loadApprovedRegistryResolver({...binding(),LEEWAY_MCP_OWNER_SUB:''}),/OWNER_UNBOUND/);
});
test('approved empty GitHub snapshot is hash-pinned and has no registered devices',async()=>{
 let called=0;
 const resolver=await loadApprovedRegistryResolver(binding(),{fetchImpl:async(url,options)=>{
  assert.equal(url,expectedUrl);
  assert.equal(options.redirect,'error');
  called++;
  return response(empty);
 }});
 const result=await resolver();
 assert.equal(called,1);
 assert.equal(result.authority,'TRUSTED_RUNTIME_DEVICE_REGISTRY');
 assert.equal(result.ownerSubject,'owner-zitadel-subject-123');
 assert.deepEqual(result.records,[]);
 assert.equal(result.provenance.repository,'4citeB4U/LEEWAY-DEVICE-BRIDGE');
 assert.equal(result.provenance.commit,revision);
 assert.equal(result.provenance.sha256,hash(empty));
});
test('network failure and missing commit fail closed',async()=>{
 const absent=await loadApprovedRegistryResolver(binding(),{fetchImpl:async()=>{throw Error('offline')}});
 await assert.rejects(absent(),/GITHUB_REGISTRY_UNAVAILABLE/);
 const missing=await loadApprovedRegistryResolver(binding(),{fetchImpl:async()=>new Response('not found',{status:404})});
 await assert.rejects(missing(),/GITHUB_REGISTRY_UNAVAILABLE/);
});
test('unexpected bytes, oversized response, and corrupt JSON fail closed',async()=>{
 const incorrect=await loadApprovedRegistryResolver(binding(),{fetchImpl:async()=>response('{}')});
 await assert.rejects(incorrect(),/GITHUB_REGISTRY_DIGEST_MISMATCH/);
 const large='x'.repeat(65537);
 const oversized=await loadApprovedRegistryResolver(binding(large),{fetchImpl:async()=>response(large)});
 await assert.rejects(oversized(),/GITHUB_REGISTRY_TOO_LARGE/);
 const bad=await loadApprovedRegistryResolver(binding('{bad'),{fetchImpl:async()=>response('{bad')});
 await assert.rejects(bad(),/GITHUB_REGISTRY_JSON_INVALID/);
});
test('wrong authority, malformed schema, and arbitrary keys fail closed',async()=>{
 for(const doc of [
  {schemaVersion:'leeway.managed-device-registry.v1',authority:'FAKE',records:[]},
  {schemaVersion:'other',authority:'TRUSTED_RUNTIME_DEVICE_REGISTRY',records:[]},
  {schemaVersion:'leeway.managed-device-registry.v1',authority:'TRUSTED_RUNTIME_DEVICE_REGISTRY',records:[],owner:'injected'},
 ]) {
  const body=JSON.stringify(doc);
  const resolver=await loadApprovedRegistryResolver(binding(body),{fetchImpl:async()=>response(body)});
  await assert.rejects(resolver(),/GITHUB_REGISTRY_SCHEMA_INVALID/);
 }
});
test('nonempty GitHub record is not proof of a signed enrolled device',async()=>{
 const body=JSON.stringify({schemaVersion:'leeway.managed-device-registry.v1',
  authority:'TRUSTED_RUNTIME_DEVICE_REGISTRY',
  records:[{id:'pc-primary',platform:'windows',identityVerified:true}]});
 const resolver=await loadApprovedRegistryResolver(binding(body),{fetchImpl:async()=>response(body)});
 await assert.rejects(resolver(),/SIGNED_ENROLLMENT_NOT_QUALIFIED/);
});
test('managed CLI entrypoint actually injects GitHub resolver into existing startup',async()=>{
 const source=await readFile(new URL('../../operator/hosting/start-managed-device-mcp.mjs',import.meta.url),'utf8');
 assert.match(source,/import \{ loadApprovedRegistryResolver \} from '\.\/approved-registry-resolver\.mjs'/);
 assert.match(source,/const resolver=await loadApprovedRegistryResolver\(process\.env\)/);
 assert.match(source,/startManagedDeviceMcp\(\{resolveDeviceRegistry:resolver\}\)/);
});
