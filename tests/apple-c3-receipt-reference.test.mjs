import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readCanonical} from '../scripts/apple-acceptance-checkpoint.mjs';
import {mapAppleLocalReceiptToC3Reference,readAppleLocalC3Reference} from '../scripts/apple-c3-receipt-reference.mjs';
const file=new URL('../evidence/apple/artifacts/iphone11-metal-receipt-20261018.json',import.meta.url);
const original=()=>JSON.parse(readFileSync(file,'utf8'));
test('real archived Metal receipt yields only local reference, never C3 admission',()=>{
 const r=readAppleLocalC3Reference();
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.mappingScope,'ARCHIVED_APPLE_METAL_LOCAL_REFERENCE_ONLY');
 assert.equal(r.localReference.localReceiptSha256,original().receiptHash);
 assert.equal(r.canonicalC3EvidenceProduced,false);
 assert.equal(r.runtimeExecutionObserved,false);
 assert.equal(r.learningLedgerUpdated,false);
 assert.ok(r.missingCanonicalEvidence.includes('VERITAS_POST_RECEIPT_HASH_NOT_OBSERVED'));
});
test('tampered local hash checkpoint fails closed',()=>{
 const c=readCanonical();c.localEvidence={...c.localEvidence,receiptMatches:false};
 const r=mapAppleLocalReceiptToC3Reference(c,original());
 assert.equal(r.localReference,null);
 assert.ok(r.failures.includes('LOCAL_RECEIPT_HASH_REPLAY_NOT_PASSED'));
});
test('missing local stable identity or digest is rejected',()=>{
 const a=original();a.receiptId='';
 const b=mapAppleLocalReceiptToC3Reference(readCanonical(),a);
 assert.equal(b.localReference,null);
 assert.ok(b.failures.includes('LOCAL_RECEIPT_REFERENCE_INVALID'));
});
test('caller-asserted provider qualification never changes blocked status',()=>{
 const r=mapAppleLocalReceiptToC3Reference({...readCanonical(),qualifiedProviders:true,independentVeritasAdmitted:true},original());
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.independentVeritasAdmitted,false);
 assert.equal(r.executable,false);
});
test('local receipt result PASS is not canonical execution pass',()=>{
 const r=mapAppleLocalReceiptToC3Reference(readCanonical(),original());
 assert.equal(r.localReference.localProbeResult,'PASS');
 assert.equal(r.runtimeExecutionObserved,false);
 assert.ok(r.missingCanonicalEvidence.includes('FORMULA_RECEIPT_HASH_NOT_OBSERVED'));
});
