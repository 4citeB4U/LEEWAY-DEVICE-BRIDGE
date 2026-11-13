/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.SECURITY.TESTS.MESH_SECRET
TAG: LEEWAY.TESTS.MESH_CREDENTIAL_CUSTODY.V1
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
5WH:
WHAT = Verify missing host mesh token cannot silently authenticate via committed fallback.
WHY = Prevent a client knowing a public HTML/agent source credential from claiming owner authority.
WHO = Device Bridge security source and CI owners.
WHERE = tests/mesh-credential-custody.test.mjs.
WHEN = 2026-11-12.
HOW = Read-only source tests; not live ZITADEL issuer validation or four device reconnection.
LICENSE: Existing repo terms remain unchanged.
*/
import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('relay does not use publicly source-committed fallback and denies absent mesh override',()=>{
 const src=file('api/device-relay.mjs');
 assert.ok(src.includes('process.env.LEEWAY_MESH_TOKEN || null'));
 assert.ok(src.includes('!!SOVEREIGN_MESH_TOKEN && digestsMatch'));
});
test('published dashboard includes no static privileged pairing secret',()=>{
 for(const path of ['docs/dashboard.html','apps/desktop/dashboard.html']){
  const src=file(path);
  assert.equal(src.includes('PAIRING_SECRET ='),false);
  assert.ok(src.includes('CREDENTIAL_NOT_AVAILABLE'));
 }
});
test('native proxies require external configuration rather than a source default',()=>{
 for(const path of ['operator/hp-standalone-agent.mjs','operator/workstation-relay-agent.mjs',
 'operator/hp-secondary-relay-agent.mjs','operator/apple-device-supervisor.mjs']){
  const src=file(path);
  assert.ok(src.includes('process.env.LEEWAY_MESH_TOKEN || null'),path);
 }
});
