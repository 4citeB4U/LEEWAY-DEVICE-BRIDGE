import test from 'node:test';
import assert from 'node:assert/strict';
import { Bridge, schemas } from '../../packages/protocol/index.mjs';
import { DesktopAdapter } from '../../apps/desktop/adapter.mjs';
import { NativeComputeProvider, bindDiscoveredNativeComputeProvider } from '../../apps/desktop/native-compute-provider.mjs';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { createConfiguredBridge } from '../../apps/desktop/mcp-server.mjs';

const values=Array.from({length:256},(_,index)=>index/255);

test('native compute schema accepts exactly 256 normalized finite lanes',()=>{
 assert.equal(schemas['gpu.compute.native.probe'].parse({values}).values.length,256);
 assert.throws(()=>schemas['gpu.compute.native.probe'].parse({values:values.slice(1)}));
 assert.throws(()=>schemas['gpu.compute.native.probe'].parse({values:[...values.slice(0,255),2]}));
});

test('desktop advertises and executes native compute only when host provider is bound',async()=>{
 const provider={descriptor:null,discover:async function(){return this.descriptor={capabilityId:'gpu.compute.native.probe'};},execute:async args=>({laneCount:args.values.length,toleranceMismatchCount:0,canonicalReceiptIssued:false})};
 const unbound=new DesktopAdapter(process.cwd());
 const bound=new DesktopAdapter(process.cwd(),{nativeComputeProvider:provider});
 assert.equal((await unbound.discover()).includes('gpu.compute.native.probe'),false);
 assert.equal((await bound.discover()).includes('gpu.compute.native.probe'),true);
 assert.deepEqual(await bound.execute('gpu.compute.native.probe',{values}),{laneCount:256,toleranceMismatchCount:0,canonicalReceiptIssued:false});
});

test('Bridge keeps native compute behind grant, admission, discovery, and receipts',async()=>{
 const evidence={laneCount:256,toleranceMismatchCount:0,canonicalReceiptIssued:false};
 const adapter={discover:async()=>['gpu.compute.native.probe'],execute:async()=>evidence};
 const receipts=[];
 const bridge=new Bridge([{id:'future-node',grants:['gpu.compute.native.probe'],adapter}],{
   admission:async({deviceId,capability})=>deviceId==='future-node'&&capability==='gpu.compute.native.probe',
   receiptSink:async receipt=>receipts.push(receipt),
 });
 const result=await bridge.call('future-node','gpu.compute.native.probe',{values});
 assert.equal(result.ok,true);
 assert.deepEqual(result.result,evidence);
 assert.equal(receipts.length,2);
 assert.equal(receipts[0].outcome,'ADMITTED');
 assert.equal(receipts[1].outcome,'PASS');
 assert.equal(receipts[1].formula,'NOT_EVALUATED');
});

test('provider rejects binary mismatch, stale discovery, spoofed evidence, and malformed envelopes',async()=>{
 const provider=new NativeComputeProvider(path.resolve('qualified-core'),{expectedSha256:'a'.repeat(64),platform:'windows'});
 provider.binarySha256=async()=>{throw new Error('NATIVE_COMPUTE_BINARY_HASH_MISMATCH');};
 await assert.rejects(provider.discover(),/NATIVE_COMPUTE_BINARY_HASH_MISMATCH/);
 provider.binarySha256=async()=> 'a'.repeat(64);
 const base={descriptorVersion:1,capabilityId:'gpu.compute.native.probe',providerVersion:'2.0.0',backendId:'Dx12',adapterName:'GPU',adapterDeviceType:'DiscreteGpu',driverName:'driver',driverInfo:'',physicalHardwareClaimed:true,health:'READY_PHYSICAL',discoveredUtc:new Date().toISOString(),expiresUtc:new Date(Date.now()+60000).toISOString(),maximumBufferBytes:1024,maximumStorageBindingBytes:1024,maximumComputeWorkgroupsPerDimension:1,memoryBudgetState:'UNAVAILABLE_UNSUPPORTED',memoryBudgetReason:'TEST',workloadExecuted:false,memoryReserved:false};
 provider.run=async()=>({...base,expiresUtc:new Date(Date.now()-1).toISOString()});
 await assert.rejects(provider.discover(),/NATIVE_COMPUTE_DESCRIPTOR_INVALID/);
 provider.run=async()=>({...base,expiresUtc:new Date(Date.now()+60*60*1000).toISOString()});
 await assert.rejects(provider.discover(),/NATIVE_COMPUTE_DESCRIPTOR_INVALID/);
 provider.run=async()=>({...base,backendId:'Metal'});
 await assert.rejects(provider.discover(),/NATIVE_COMPUTE_DESCRIPTOR_INVALID/);
 provider.run=async command=>command==='compute-native-inventory'?base:{operationId:'LEEWAY_TENSOR_AFFINE_16X16_V1',backendId:'Vulkan',adapterName:'GPU',adapterDeviceType:'DiscreteGpu',physicalHardwareClaimed:true,laneCount:256,inputSha256:'9ed9a3de93af48c17f91caa8e7906f635930aee688ad93e12e1800fe1f79cc9d',outputSha256:'e'.repeat(64),cpuOutputSha256:'e'.repeat(64),exactMismatchCount:0,toleranceMismatchCount:0,maximumAbsoluteError:0,absoluteTolerance:0.000001,canonicalReceiptIssued:false};
 await assert.rejects(provider.execute({values}),/NATIVE_COMPUTE_EVIDENCE_INVALID/);
 provider.run=async()=>{throw new Error('NATIVE_COMPUTE_ENVELOPE_INVALID');};
 await assert.rejects(provider.discover(),/NATIVE_COMPUTE_ENVELOPE_INVALID/);
});

test('revoked grant, wrong target, provider loss, and reconnect remain fail-closed',async()=>{
 let executions=0,available=false;
 const provider={descriptor:null,discover:async function(){if(!available)throw new Error('OFFLINE');return this.descriptor={capabilityId:'gpu.compute.native.probe'};},execute:async()=>{executions++;return{laneCount:256};}};
 const adapter=new DesktopAdapter(process.cwd(),{nativeComputeProvider:provider});
 assert.equal((await adapter.discover()).includes('gpu.compute.native.probe'),false);
 available=true;
 assert.equal((await adapter.discover()).includes('gpu.compute.native.probe'),true);
 const bridge=new Bridge([{id:'runtime-node',grants:[],adapter}],{admission:async()=>true,receiptSink:async()=>{}});
 assert.equal((await bridge.call('runtime-node','gpu.compute.native.probe',{values})).error,'CAPABILITY_NOT_GRANTED');
 assert.equal((await bridge.call('wrong-node','gpu.compute.native.probe',{values})).error,'UNKNOWN_DEVICE');
 assert.equal(executions,0);
});

test('dynamic binder uses authenticated runtime IDs without fixed machine names',async()=>{
 const original=NativeComputeProvider.prototype.discover;
 NativeComputeProvider.prototype.discover=async function(){return this.descriptor={capabilityId:'gpu.compute.native.probe'};};
 try{
  for(const id of ['node-alpha','node-bravo','new-node-charlie']){
   const registry=new Map([[id,{platform:'windows',identityVerified:true,registrationState:'TRUSTED_REGISTRY_READ'}]]);
   const providers=await bindDiscoveredNativeComputeProvider({localNodeId:id,enrolledDevices:registry,executablePath:path.resolve('alternate-install','leeway-core.exe'),expectedSha256:'b'.repeat(64)});
   assert.equal(providers.has(id),true);
  }
  await assert.rejects(bindDiscoveredNativeComputeProvider({localNodeId:'revoked-node',enrolledDevices:new Map(),executablePath:path.resolve('core'),expectedSha256:'b'.repeat(64)}),/LOCAL_NODE_NOT_ENROLLED/);
 }finally{NativeComputeProvider.prototype.discover=original;}
});

test('configured Bridge startup derives provider map from the authenticated local node binding',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'leeway-native-binding-'));
 const original=NativeComputeProvider.prototype.discover;
 NativeComputeProvider.prototype.discover=async function(){return this.descriptor={capabilityId:'gpu.compute.native.probe',health:'READY_PHYSICAL'};};
 try{
  await fs.mkdir(path.join(root,'workspace'));
  const configPath=path.join(root,'bridge.json');
  await fs.writeFile(configPath,JSON.stringify({devices:[{id:'owner-node-77',type:'desktop',platform:'windows',workspace:'workspace',grants:['gpu.compute.native.probe']}]}));
  const deviceRegistry=new Map([['owner-node-77',{platform:'windows',identityVerified:true,registrationState:'TRUSTED_REGISTRY_READ',identitySource:'WINDOWS_CIM_READONLY',passportAuthority:'OWNER_SIGNED_WINDOWS_PASSPORT',ownerSubject:'owner',passportSha256:'c'.repeat(64)}]]);
  const bridge=await createConfiguredBridge(configPath,{formulaPreGate:async()=>({passed:true}),veritasPreGate:async()=>true,receiptSink:async()=>{},deviceRegistry,adapterRegistry:{adapters:[{platform:'windows',capabilities:{'gpu.compute.native.probe':{state:'AVAILABLE'}}}]},trustedIssuerRegistry:{owner:{}},replayGuard:{has:()=>false,consume:()=>true},consentProvider:async()=>null,nativeComputeBinding:{localNodeId:'owner-node-77',executablePath:path.resolve(root,'qualified','leeway-core.exe'),expectedSha256:'d'.repeat(64)}});
  const discovery=await bridge.discover('owner-node-77');
  assert.equal(discovery.capabilities.some(capability=>capability.name==='gpu.compute.native.probe'),true);
 }finally{NativeComputeProvider.prototype.discover=original;await fs.rm(root,{recursive:true,force:true});}
});
