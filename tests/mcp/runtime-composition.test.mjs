import test from 'node:test';
import assert from 'node:assert/strict';
import { requireTrustedRuntimeComposition } from '../../apps/desktop/runtime-composition.mjs';

test('trusted MCP startup refuses missing authority or evidence providers',()=>{
 const admission=async()=>true,receiptSink=async()=>{};
 assert.throws(()=>requireTrustedRuntimeComposition(),/TRUSTED_RUNTIME_COMPOSITION_REQUIRED/);
 assert.throws(()=>requireTrustedRuntimeComposition({admission}),/TRUSTED_RUNTIME_COMPOSITION_REQUIRED/);
 assert.throws(()=>requireTrustedRuntimeComposition({receiptSink}),/TRUSTED_RUNTIME_COMPOSITION_REQUIRED/);
 const result=requireTrustedRuntimeComposition({admission,receiptSink});
 assert.equal(result.admission,admission);assert.equal(result.receiptSink,receiptSink);assert.equal(result.mode,'direct');assert.equal(Object.isFrozen(result),true);
});

test('trusted MCP startup composes Formula and Veritas owner gates through C3',()=>{
 const admission=async()=>true;
 const formulaPreGate=async()=>({passed:true});
 const veritasPreGate=async()=>true;
 const receiptSink=async()=>{};
 const result=requireTrustedRuntimeComposition({formulaPreGate,veritasPreGate,receiptSink,adapterRegistry:{adapters:[]}});
 assert.equal(result.mode,'c3');
 assert.equal(result.formulaPreGate,formulaPreGate);
 assert.equal(result.veritasPreGate,veritasPreGate);
 assert.equal(result.receiptSink,receiptSink);
 assert.throws(()=>requireTrustedRuntimeComposition({formulaPreGate,receiptSink}),/TRUSTED_RUNTIME_COMPOSITION_REQUIRED/);
 assert.throws(()=>requireTrustedRuntimeComposition({admission,formulaPreGate,veritasPreGate,receiptSink}),/TRUSTED_RUNTIME_COMPOSITION_REQUIRED/);
 assert.throws(()=>requireTrustedRuntimeComposition({admission,receiptSink,unreviewed:true}),/TRUSTED_RUNTIME_COMPOSITION_INVALID/);
 const accessor={receiptSink};
 Object.defineProperty(accessor,'admission',{get(){return admission;}});
 assert.throws(()=>requireTrustedRuntimeComposition(accessor),/TRUSTED_RUNTIME_COMPOSITION_INVALID/);
});
