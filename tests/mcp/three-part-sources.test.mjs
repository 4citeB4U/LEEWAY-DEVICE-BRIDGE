/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.DEPLOYMENT.SOURCE_GATE.TEST
TAG: LEEWAY.THREE_PART.CONTINUUM_SOURCE_QUALIFIER.TEST.V1
WHO: LeeWay Industries / owner-authorized maintainers
WHAT: Test fail-closed three-part source contract without live OAuth, databases or credentials
WHEN: 2026-10-28
WHERE: tests/mcp/three-part-sources.test.mjs
WHY: Ensure source metadata cannot masquerade as connected Continuum or production command authority
HOW: Deterministic JSON fixtures, positive and negative Node tests
AUTHORITY: Synthetic fixtures only; no live connection or production grant
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectThreePartSources, STANDARDS_MERGE_SHA } from '../../operator/identity/qualify-three-part-sources.mjs';

function fixture() {
  return {
    vercel: { rewrites: [
      {source:'/mcp', destination:'/api/mcp'},
      {source:'/.well-known/oauth-protected-resource/mcp',destination:'/api/oauth-protected-resource'}
    ], functions: {'api/mcp.mjs':{maxDuration:60}} },
    continuumTopology: {
      schema:'leeway.continuum.storage-topology.candidate.v1',
      status:'CANDIDATE_SOURCE_ONLY',
      canonicalAuthority:{ component:'LeeWay Continuum', liveBinding:'NOT_PROBED' },
      databases:[
        {id:'sqlite',role:'CANONICAL_RECORDS',status:'EXISTING_LOCAL_PROVIDER_REPORTED'},
        {id:'duckdb',role:'DERIVED_ANALYTICS',status:'ADAPTER_AVAILABLE_PROVIDER_UNBOUND'},
        {id:'pouchdb',role:'OFFLINE_REPLICA',status:'ADAPTER_AVAILABLE_PROVIDER_UNBOUND'},
        {id:'electric_postgresql',role:'OPTIONAL_SYNC_TRANSPORT',status:'ADAPTER_AVAILABLE_PROVIDER_UNBOUND'}
      ],
      storageCompartments:[
        {id:'cloudflare-r2',role:'OPTIONAL_ENCRYPTED_OBJECT_BACKUP',status:'CREDENTIALS_AND_BUCKET_UNBOUND'},
        {id:'oracle-oci-object',role:'OPTIONAL_ENCRYPTED_OBJECT_BACKUP',status:'CREDENTIALS_AND_BUCKET_UNBOUND'},
        {id:'github-release',role:'RELEASE_PACKAGES_AND_ENCRYPTED_RELEASE_EVIDENCE_ONLY',status:'RELEASE_MANIFEST_ONLY'}
      ],
      logicalCells:['runtime-state','evidence-vault','memory','learning'].map(id=>({id,state:'RESOURCE_UNVERIFIED'})),
      capacity:{executionAuthorized:false}
    }
  };
}

test('valid source route and full Continuum inventory never assert live readiness',()=>{
  const value=inspectThreePartSources(fixture());
  assert.equal(value.sourceContract,'PASS');
  assert.equal(value.liveIntegration,'UNVERIFIED');
  assert.equal(value.authenticatedMcp,'NOT_PROBED');
  assert.equal(value.deviceExecution,'NOT_AUTHORIZED_BY_THIS_GATE');
  assert.equal(value.continuumCanonicalReadback,'NOT_PROBED');
  assert.equal(value.databases.length,4);
  assert.equal(value.storageCompartments.length,3);
  assert.equal(value.logicalCells.length,4);
  assert.equal(value.databases.every(x=>x.liveVerified===false),true);
  assert.match(STANDARDS_MERGE_SHA,/^[a-f0-9]{40}$/);
});

test('missing public OAuth route denies source pass',()=>{
  const input=fixture();
  input.vercel.rewrites.pop();
  assert.throws(()=>inspectThreePartSources(input),/VERCEL_OAUTH_ROUTE_MISSING/);
});

test('duplicate database identities and omitted canonical SQLite deny pass',()=>{
  const input=fixture();
  input.continuumTopology.databases[1].id='sqlite';
  assert.throws(()=>inspectThreePartSources(input),/CONTINUUM_DATABASE_DUPLICATE/);
  const other=fixture();
  other.continuumTopology.databases.shift();
  assert.throws(()=>inspectThreePartSources(other),/CONTINUUM_DATABASE_REQUIRED_SQLITE/);
});

test('a source candidate cannot authorize capacity execution',()=>{
  const input=fixture();
  input.continuumTopology.capacity.executionAuthorized=true;
  assert.throws(()=>inspectThreePartSources(input),/CANDIDATE_TOPOLOGY_CANNOT_AUTHORIZE_EXECUTION/);
});

test('GitHub Releases cannot be promoted to the canonical database',()=>{
  const input=fixture();
  input.continuumTopology.storageCompartments[2].role='CANONICAL_DATABASE';
  assert.throws(()=>inspectThreePartSources(input),/GITHUB_RELEASE_MUST_NOT_BE_PRIMARY_DATABASE/);
});

test('incomplete source inventory cannot conceal a missing storage cell',()=>{
  const input=fixture();
  input.continuumTopology.logicalCells.pop();
  assert.throws(()=>inspectThreePartSources(input),/CONTINUUM_CELL_REQUIRED_LEARNING/);
});

test('missing original authority is fail-closed',()=>{
  const input=fixture();
  input.continuumTopology.canonicalAuthority.component='some-other-provider';
  assert.throws(()=>inspectThreePartSources(input),/CANONICAL_CONTINUUM_AUTHORITY_MISSING/);
});
