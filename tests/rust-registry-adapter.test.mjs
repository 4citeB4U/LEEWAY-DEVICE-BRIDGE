import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRustRegistryList } from '../operator/rust-registry-adapter.mjs';

test('Rust registry adapter accepts arbitrary bounded admitted IDs without device enums', () => {
  const registry=parseRustRegistryList(JSON.stringify({devices:['windows-node','galaxy-fold6','iphone-metal','agent-virtual-tablet','future-2040']}));
  assert.deepEqual([...registry.keys()],['windows-node','galaxy-fold6','iphone-metal','agent-virtual-tablet','future-2040']);
  assert.equal(registry.get('iphone-metal').registryAuthority,'LEEWAY_RUST_CORE_V2');
});

test('Rust registry adapter rejects duplicates and malformed IDs', () => {
  assert.throws(()=>parseRustRegistryList('{"devices":["same","same"]}'),/RUST_REGISTRY_RESPONSE_INVALID/);
  assert.throws(()=>parseRustRegistryList('{"devices":["bad id"]}'),/RUST_REGISTRY_RESPONSE_INVALID/);
});
