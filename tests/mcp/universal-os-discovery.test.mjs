/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.OPERATOR.OS_FAMILY.TEST
TAG: LEEWAY.UNIVERSAL.OS_DISCOVERY.REGRESSION.V1
5WH:
WHAT = Verify four OS families are discoverable through original MCP interfaces.
WHY = Never require a Windows host or confuse reported platform with real device reachability.
WHO = LeeWay Device Bridge qualified engineering.
WHERE = tests/mcp/universal-os-discovery.test.mjs.
WHEN = 2026-11-23.
HOW = In-memory MCP client with explicit registry and adapter fixtures, negative mismatches.
AUTHORITY = Source-only fixtures; no production passports or physical device execution.
LICENSE = MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Bridge } from '../../packages/protocol/index.mjs';
import { createServer } from '../../apps/desktop/mcp-server.mjs';
import { DEVICE_OS_FAMILIES, classifyDeviceOS, hostDeviceOS, deviceOSDescriptor } from '../../operator/device-os-family.mjs';

const WINDOWS_ID=id=>({id,deviceId:id,platform:'windows',identityVerified:true,
  registrationState:'TRUSTED_REGISTRY_READ',identitySource:'WINDOWS_CIM_READONLY',
  passportAuthority:'OWNER_SIGNED_WINDOWS_PASSPORT',
  ownerSubject:'owner-source-test-123456',passportSha256:'a'.repeat(64)});

const NODE=(id,platform,type='relay')=>({
 id,platform,type,grants:['device.health'],
 adapter:{discover:async()=>['device.health'],execute:async()=>{throw Error('NO_EXECUTION')}}
});

async function fixture(t,devices,records){
 const bridge=new Bridge(devices,{deviceRegistry:new Map(records),
  admission:async()=>false,receiptSink:async()=>{}});
 const server=createServer(bridge);
 const client=new Client({name:'universal-os-discovery-test',version:'1.0'});
 const [clientTransport,serverTransport]=InMemoryTransport.createLinkedPair();
 await Promise.all([server.connect(serverTransport),client.connect(clientTransport)]);
 t.after(async()=>{await client.close();await server.close()});
 const call=async (name,args={})=>{
  const response=await client.callTool({name,arguments:args});
  return JSON.parse(response.content[0].text);
 };
 return {call,bridge};
}

test('OS family normalization distinguishes Microsoft, Linux, Apple and Android',()=>{
 assert.deepEqual(DEVICE_OS_FAMILIES,['Microsoft','Linux','Apple','Android']);
 for(const [value,expected] of [
  ['windows','Microsoft'],['win32','Microsoft'],['microsoft','Microsoft'],
  ['linux','Linux'],['gnu/linux','Linux'],
  ['macos','Apple'],['darwin','Apple'],['ios','Apple'],['ipados','Apple'],
  ['android','Android']
 ]) assert.equal(classifyDeviceOS(value),expected,value);
 for(const value of ['','pocket-device','samsung','pc-primary','unix','freebsd',null,undefined]){
  assert.equal(classifyDeviceOS(value),null,String(value));
 }
 assert.equal(hostDeviceOS('darwin'),'Apple');
 assert.equal(hostDeviceOS('win32'),'Microsoft');
 assert.equal(hostDeviceOS('linux'),'Linux');
 assert.equal(hostDeviceOS('android'),'Android');
});

test('canonical bridge_devices reports all four OS families without asserting reachability or execution',async t=>{
 const ids=['ms-owner-01','linux-owner-02','apple-owner-03','android-owner-04'];
 const devices=[
  NODE(ids[0],'windows'),NODE(ids[1],'linux'),
  NODE(ids[2],'ios'),NODE(ids[3],'android')
 ];
 const records=[
  [ids[0],WINDOWS_ID(ids[0])],
  [ids[1],{id:ids[1],platform:'linux'}],
  [ids[2],{id:ids[2],platform:'ios'}],
  [ids[3],{id:ids[3],platform:'android'}]
 ];
 const {call}=await fixture(t,devices,records);
 const roster=await call('bridge_devices');
 assert.deepEqual(roster.devices,ids);
 assert.deepEqual(roster.devicePlatforms.map(row=>row.osFamily),
  ['Microsoft','Linux','Apple','Android']);
 assert.deepEqual(roster.devicePlatforms.map(row=>row.adapterType),
  ['relay','relay','relay','relay']);
 assert.ok(roster.devicePlatforms.every(row=>row.reachability==='NOT_PROBED'
  &&row.executionAdmission==='NOT_CONFERRED_BY_DISCOVERY'));
 assert.equal(roster.reachability,'NOT_PROBED');
 for(const [i,id] of ids.entries()){
  const caps=await call('bridge_capabilities',{deviceId:id});
  assert.equal(caps.deviceId,id);
  assert.equal(caps.osFamily,roster.devicePlatforms[i].osFamily);
  assert.equal(caps.platform,records[i][1].platform);
  assert.equal(caps.identityVerified,true);
  assert.equal(caps.reachability,'NOT_PROBED');
  assert.equal(caps.executionAdmission,'NOT_CONFERRED_BY_DISCOVERY');
 }
});

test('OS mismatched transport, forged Windows identity and unregistered device do not qualify',async t=>{
 const devices=[
  NODE('mismatch-android','windows','physical-android'),
  NODE('mismatch-apple','android','physical-apple'),
  NODE('mismatch-os','linux','relay'),
  NODE('unregistered','android','relay'),
  NODE('forged-windows','windows','desktop')
 ];
 const records=[
  ['mismatch-android',WINDOWS_ID('mismatch-android')],
  ['mismatch-apple',{platform:'android'}],
  ['mismatch-os',{platform:'android'}],
  ['forged-windows',{...WINDOWS_ID('forged-windows'),identityVerified:false}]
 ];
 const {call}=await fixture(t,devices,records);
 const roster=await call('bridge_devices');
 assert.deepEqual(roster.devices,[]);
 assert.deepEqual(roster.devicePlatforms,[]);
 assert.equal(roster.registrationState,'NO_REGISTERED_ADAPTERS');
 const cap=await call('bridge_capabilities',{deviceId:'mismatch-os'});
 assert.equal(cap.osFamily,null);
 assert.equal(cap.identityVerified,false);
 assert.equal(cap.executionAdmission,'IDENTITY_UNVERIFIED');
});

test('unknown platform cannot be represented as a supported OS or invent enrollment',()=>{
 assert.equal(deviceOSDescriptor({deviceId:'unbound',record:{platform:'other'},configuredAdapter:{type:'relay'}}),null);
 assert.equal(deviceOSDescriptor({deviceId:'owner-a',record:{platform:'android'},configuredAdapter:{type:'physical-apple'}}),null);
 const apple=deviceOSDescriptor({deviceId:'owner-a',record:{platform:'ipados'},configuredAdapter:{type:'physical-apple',platform:'ios'}});
 assert.equal(apple.osFamily,'Apple');
 assert.equal(apple.reachability,'NOT_PROBED');
});
