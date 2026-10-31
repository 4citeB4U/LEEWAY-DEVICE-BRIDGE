/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.RUNTIME_AUTH.TEST
TAG: LEEWAY.C3.SCOPED_RUNTIME_AUTH.NEGATIVE_TESTS
5WH:
WHO = W07 bounded bridge source qualification
WHAT = Runtime-issued scoped authorization contract regression tests
WHEN = 2026-10-31
WHERE = tests/runtime-auth-contract.regression.test.mjs
WHY = Prevent raw AI, fake cards, wrong targets and replay evidence from reaching native execution
HOW = Node test fixtures only, no device operation
LICENSE: MIT
ASSURANCE = Fixtures do not establish production issuer enrollment or Veritas acceptance
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import {createBridgeRuntimeGuard,verifyScopedRuntimeAuth,buildRuntimeAuth} from '../operator/runtime-auth-contract.mjs';
const card=()=>({...buildRuntimeAuth({agentId:'agent-lee-prime',taskId:'c3-test-work',action:'device.files.write'}),deviceId:'local-device',capability:'device.files.write',argsSha256:'a'.repeat(64),authorizationId:'AUTHORIZATION-123456',expiresAt:Date.now()+60000,signature:'f'.repeat(80)});
test('empty compliance card is denied, not default-filled',()=> {
  const result=createBridgeRuntimeGuard()({});
  assert.equal(result.ok,false);
});
test('shape-valid card is never labeled authorized',()=>{
  const result=createBridgeRuntimeGuard()(card());
  assert.equal(result.ok,true);
  assert.equal(result.status,'LEEWAY_RUNTIME_AUTH_SHAPE_VALID_ONLY');
});
test('no trusted host Runtime verifier denies',async()=>{
  assert.equal(await verifyScopedRuntimeAuth({runtimeAuth:card(),deviceId:'local-device',capability:'device.files.write',argsDigest:'a'.repeat(64)}),false);
});
test('cross-device or cross-capability scoped card denies',async()=>{
  const verifier=async()=>({verified:true,issuer:'LEEWAY_RUNTIME_FABRIC',ownerAuthorized:true,replayConsumed:true});
  assert.equal(await verifyScopedRuntimeAuth({runtimeAuth:card(),deviceId:'other-device',capability:'device.files.write',argsDigest:'a'.repeat(64),verifyRuntimeAuthorization:verifier}),false);
  assert.equal(await verifyScopedRuntimeAuth({runtimeAuth:card(),deviceId:'local-device',capability:'device.process.execute',argsDigest:'a'.repeat(64),verifyRuntimeAuthorization:verifier}),false);
});
test('expired signed card denies before host callback',async()=>{
  let called=false;
  assert.equal(await verifyScopedRuntimeAuth({runtimeAuth:{...card(),expiresAt:Date.now()-1},deviceId:'local-device',capability:'device.files.write',argsDigest:'a'.repeat(64),verifyRuntimeAuthorization:async()=>{called=true;return true;}}),false);
  assert.equal(called,false);
});
test('host proof must include owner consent, replay consumption and exact binding',async()=>{
  const c=card(),base={verified:true,issuer:'LEEWAY_RUNTIME_FABRIC',authorizationId:c.authorizationId,deviceId:c.deviceId,capability:c.capability,argsSha256:c.argsSha256,ownerAuthorized:true,replayConsumed:true};
  const input={runtimeAuth:c,deviceId:c.deviceId,capability:c.capability,argsDigest:c.argsSha256};
  assert.equal(await verifyScopedRuntimeAuth({...input,verifyRuntimeAuthorization:async()=>({...base,replayConsumed:false})}),false);
  assert.equal(await verifyScopedRuntimeAuth({...input,verifyRuntimeAuthorization:async()=>({...base,ownerAuthorized:false})}),false);
  assert.equal(await verifyScopedRuntimeAuth({...input,verifyRuntimeAuthorization:async()=>({...base,argsSha256:'b'.repeat(64)})}),false);
  assert.equal(await verifyScopedRuntimeAuth({...input,verifyRuntimeAuthorization:async()=>base}),true);
});
