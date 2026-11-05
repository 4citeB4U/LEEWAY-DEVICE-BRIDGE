import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import test from 'node:test';
import { DesktopAdapter } from '../apps/desktop/adapter.mjs';
import { Bridge } from '../packages/protocol/index.mjs';

test('Model Hub search is a loopback-only Bridge read and does not claim weights or inference', async t => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'leeway-model-hub-'));
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  const server = http.createServer((req, res) => {
    assert.equal(req.method, 'GET');
    assert.equal(req.url, '/v1/catalog');
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({schema:'leeway.model-hub.catalog.v1',models:[
      {id:'qwen3-4b',displayName:'Qwen3 4B',family:'Qwen',weightLicense:'verify separately',hfRepo:'private-external-field'},
      {id:'gemma-3-1b',displayName:'Gemma 3 1B',family:'Gemma',weightLicense:'terms'}
    ]}));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const adapter = new DesktopAdapter(workspace, {modelHubUrl:`http://127.0.0.1:${server.address().port}`});
  assert.ok((await adapter.discover()).includes('model.hub.catalog'));

  const receipts=[];
  const bridge=new Bridge([{id:'host',grants:['model.hub.catalog'],adapter}],{
    admission:async()=>true,receiptSink:async receipt=>receipts.push(receipt),
  });
  const result=await bridge.call('host','model.hub.catalog',{query:'qwen'});
  assert.equal(result.ok,true);
  assert.equal(result.receipt.capability,'model.hub.catalog');
  assert.equal(result.receipt.outcome,'PASS');
  assert.deepEqual(receipts.map(receipt=>receipt.outcome),['ADMITTED','PASS']);
  assert.deepEqual(result.result.models,[{id:'qwen3-4b',displayName:'Qwen3 4B',family:'Qwen',license:'verify separately'}]);
  assert.equal(JSON.stringify(result).includes('private-external-field'),false);
  assert.equal(result.result.assetState,'NOT_ESTABLISHED_BY_CATALOG');
  assert.equal(result.result.residencyState,'NOT_ESTABLISHED_BY_CATALOG');
  assert.equal(result.result.inferenceState,'NOT_REQUESTED');
  assert.deepEqual((await bridge.call('host','model.hub.catalog',{query:'missing'})).result.models,[]);
});

test('unbound, non-loopback, and malformed Model Hub endpoints fail closed', async t => {
  const workspace=await fs.mkdtemp(path.join(os.tmpdir(),'leeway-model-hub-invalid-'));
  t.after(()=>fs.rm(workspace,{recursive:true,force:true}));
  const unbound=new DesktopAdapter(workspace,{modelHubUrl:''});
  assert.equal((await unbound.discover()).includes('model.hub.catalog'),false);
  await assert.rejects(unbound.execute('model.hub.catalog',{}));
  const remote=new DesktopAdapter(workspace,{modelHubUrl:'https://models.example'});
  await assert.rejects(remote.execute('model.hub.catalog',{}),/MODEL_HUB_LOOPBACK_ENDPOINT_REQUIRED/);

  const server=http.createServer((_req,res)=>{res.writeHead(200,{'content-type':'application/json'});res.end('{"schema":"wrong","models":[]}');});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const malformed=new DesktopAdapter(workspace,{modelHubUrl:`http://127.0.0.1:${server.address().port}`});
  await assert.rejects(malformed.execute('model.hub.catalog',{}),/MODEL_HUB_CATALOG_INVALID/);
});

