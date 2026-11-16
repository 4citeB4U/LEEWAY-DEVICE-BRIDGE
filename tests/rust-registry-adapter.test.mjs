import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRustRegistryList, authorizeRustCommand } from '../operator/rust-registry-adapter.mjs';

test('Rust registry adapter accepts arbitrary bounded admitted IDs without device enums', () => {
  const registry=parseRustRegistryList(JSON.stringify({devices:['windows-node','galaxy-fold6','iphone-metal','agent-virtual-tablet','future-2040'].map(deviceId=>({deviceId,platform:'portable',publicKey:`ed25519:${'a'.repeat(64)}`}))}));
  assert.deepEqual([...registry.keys()],['windows-node','galaxy-fold6','iphone-metal','agent-virtual-tablet','future-2040']);
  assert.equal(registry.get('iphone-metal').registryAuthority,'LEEWAY_RUST_CORE_V2');
});

test('Rust registry adapter rejects duplicates and malformed IDs', () => {
  assert.throws(()=>parseRustRegistryList('{"devices":[{"deviceId":"same"},{"deviceId":"same"}]}'),/RUST_REGISTRY_RESPONSE_INVALID/);
  assert.throws(()=>parseRustRegistryList('{"devices":[{"deviceId":"bad id"}]}'),/RUST_REGISTRY_RESPONSE_INVALID/);
});

test('Rust command authorization receives the presented token over stdin and rejects a failed core decision', () => {
  let observed;
    const accepted=authorizeRustCommand({
      deviceId:'future-node',payload:{capability:'device.health'},meshToken:'expected-mesh-token-0123456789',
      spawn:(_binary,_args,options)=>{
        observed=JSON.parse(options.input);
        return {status:0,stdout:JSON.stringify({authorized:true,targetDeviceId:'future-node'})};
      },
    });
    assert.equal(accepted,true);
    assert.equal(observed.meshToken,'expected-mesh-token-0123456789');
    assert.equal(authorizeRustCommand({
      deviceId:'future-node',payload:{},meshToken:'wrong-presented-token',
      spawn:()=>({status:1,stdout:''}),
    }),false);
});

test('Rust command authorization sends both identities for Continuum transfer',()=>{
  let observed;
  const accepted=authorizeRustCommand({
    deviceId:'target-node',meshToken:'device-token-0123456789',
    payload:{capability:'continuum.transfer.stage',arguments:{sourceNodeId:'source-node'}},
    spawn:(_binary,_args,options)=>{observed=JSON.parse(options.input);return {status:0,stdout:JSON.stringify({authorized:true,targetDeviceId:'target-node',sourceDeviceId:'source-node'})};},
  });
  assert.equal(accepted,true);
  assert.equal(observed.sourceDeviceId,'source-node');
});
