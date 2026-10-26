import test from 'node:test';
import assert from 'node:assert/strict';
import { requireTrustedRuntimeComposition } from '../../apps/desktop/runtime-composition.mjs';

test('trusted MCP startup refuses missing authority or evidence providers',()=>{
 const admission=async()=>true,receiptSink=async()=>{};
 assert.throws(()=>requireTrustedRuntimeComposition(),/TRUSTED_RUNTIME_COMPOSITION_REQUIRED/);
 assert.throws(()=>requireTrustedRuntimeComposition({admission}),/TRUSTED_RUNTIME_COMPOSITION_REQUIRED/);
 assert.throws(()=>requireTrustedRuntimeComposition({receiptSink}),/TRUSTED_RUNTIME_COMPOSITION_REQUIRED/);
 const result=requireTrustedRuntimeComposition({admission,receiptSink});
 assert.equal(result.admission,admission);assert.equal(result.receiptSink,receiptSink);assert.equal(Object.isFrozen(result),true);
});
