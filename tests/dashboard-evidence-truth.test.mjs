/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.TESTS.DASHBOARD_TRUTH
TAG: LEEWAY.TESTS.DASHBOARD_EVIDENCE_TRUTH.V1
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
5WH:
WHAT = Enforce no embedded pairing secret or synthetic physical-success messaging in public/device dashboard views.
WHY = Prevent UI claims from masquerading as native file, voice, vision, identity and receipt execution.
WHO = Original Device Bridge release and UI owners.
WHERE = tests/dashboard-evidence-truth.test.mjs.
WHEN = 2026-11-12.
HOW = Static HTML and extracted JavaScript syntax tests; live deployed UI still needs physical tests.
LICENSE: Existing repository terms remain unchanged.
*/
import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {Script} from 'node:vm';
const source=readFileSync(new URL('../docs/dashboard.html',import.meta.url),'utf8');
const desktop=readFileSync(new URL('../apps/desktop/dashboard.html',import.meta.url),'utf8');
test('desktop and publishable dashboards use identical truthful source',()=>assert.equal(source,desktop));
test('no shared secret embedded in published client JavaScript',()=>{
 assert.equal(source.includes('PAIRING_SECRET ='),false);
 assert.equal(source.includes('leeway-mesh-token-'),false);
 assert.ok(source.includes('CREDENTIAL_NOT_AVAILABLE'));
});
test('default device status and receipt state cannot imply physical completion',()=>{
 assert.ok(source.includes('RELAY UNPROBED'));
 assert.ok(source.includes('ROOM PRESENT'));
 assert.ok(source.includes('identity NOT_PROBED'));
 assert.equal(source.includes('READBACK VERIFIED (SHA-256 match)'),false);
 assert.equal(source.includes('Canonical receipts committed:'),false);
});
test('none of the button handlers fabricates successful physical actions',()=>{
 assert.ok(source.includes('NOT_EXECUTED: This dashboard does not dispatch file writes'));
 assert.ok(source.includes('NOT_EXECUTED: Native Voice Fabric'));
 assert.ok(source.includes('NOT_EXECUTED: Native Vision stream'));
 assert.equal(source.includes('setTimeout(() =>'),false);
 assert.equal(source.includes('Duplex speech adapter active.'),false);
});
test('inline JavaScript remains parseable after secret and truth corrections',()=>{
 const match=source.match(/<script>([\s\S]*?)<\/script>/);
 assert.ok(match);
 assert.doesNotThrow(()=>new Script(match[1]));
});
