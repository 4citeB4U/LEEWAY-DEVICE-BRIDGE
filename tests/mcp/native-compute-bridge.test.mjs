import test from 'node:test';
import assert from 'node:assert/strict';
import { Bridge, schemas } from '../../packages/protocol/index.mjs';
import { DesktopAdapter } from '../../apps/desktop/adapter.mjs';

const values=Array.from({length:256},(_,index)=>index/255);

test('native compute schema accepts exactly 256 normalized finite lanes',()=>{
 assert.equal(schemas['gpu.compute.native.probe'].parse({values}).values.length,256);
 assert.throws(()=>schemas['gpu.compute.native.probe'].parse({values:values.slice(1)}));
 assert.throws(()=>schemas['gpu.compute.native.probe'].parse({values:[...values.slice(0,255),2]}));
});

test('desktop advertises and executes native compute only when host provider is bound',async()=>{
 const provider={execute:async args=>({laneCount:args.values.length,toleranceMismatchCount:0,canonicalReceiptIssued:false})};
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
