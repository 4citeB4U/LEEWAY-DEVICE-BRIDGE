/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.TEST
TAG: LEEWAY_HTTP_MCP_ACCEPTANCE
5WH: WHAT=HTTP MCP integration tests; WHY=Prove common routing and principal isolation; WHO=LeeWay Industries; WHERE=tests/mcp/http-transport.test.mjs; WHEN=2026-10-26; HOW=Real SDK client and HTTP server with explicit test-only providers.
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Bridge } from '../../packages/protocol/index.mjs';
import { createRemoteMcpHandler } from '../../apps/desktop/mcp-http.mjs';

async function fixture(t, options = {}) {
  const executed = [], receipts = [];
  const identities = ['android-unit','ios-unit','windows-unit','linux-unit','future-unit'];
  let resolutions = 0;
  const server = createServer();
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = new URL('http://127.0.0.1:' + server.address().port + '/mcp');
  const handler = createRemoteMcpHandler({
    allowedHosts: [url.host],
    authenticate: async req => req.headers.authorization === 'Bearer test-owner'
      ? 'owner' : req.headers.authorization === 'Bearer test-limited' ? 'limited' : null,
    resolveBridge: async principal => {
      resolutions++;
      if (options.unavailable) return null;
      const ids = principal === 'owner' ? identities : ['ios-unit'];
      return new Bridge(ids.map(id => ({
        id, grants: ['device.health','device.files.write'],
        adapter: {
          discover: async () => ['device.health','device.files.write'],
          execute: async (capability, args) => {
            executed.push({id,capability,args});
            return { deviceId: id, ok: true };
          }
        }
      })), {
        admission: async ({capability}) => capability === 'device.health',
        receiptSink: async r => { if(options.receiptFailure) throw Error('FAIL'); receipts.push(r); }
      });
    }
  });
  server.on('request', handler);
  const clients = [];
  t.after(async () => {
    await Promise.all(clients.map(c => c.close()));
    await new Promise(r => server.close(r));
  });
  async function connect(token='test-owner') {
    const client = new Client({ name:'transport-test', version:'1.0.0' });
    clients.push(client);
    await client.connect(new StreamableHTTPClientTransport(url, {
      requestInit: { headers: { Authorization:'Bearer '+token } }
    }));
    return client;
  }
  return {url,connect,executed,receipts,resolutions:()=>resolutions};
}
const decode = result => JSON.parse(result.content[0].text);

test('HTTP MCP uses one dispatcher for all registered device adapters', async t => {
  const f=await fixture(t), c=await f.connect();
  const tools=await c.listTools();
  assert.ok(tools.tools.some(x=>x.name==='device_health'));
  const ids=decode(await c.callTool({name:'bridge_devices',arguments:{}})).devices;
  assert.equal(ids.length,5);
  for(const deviceId of ids) {
    const caps=decode(await c.callTool({name:'bridge_capabilities',arguments:{deviceId}}));
    assert.ok(caps.capabilities.some(x=>x.name==='device.health'));
    const response=decode(await c.callTool({name:'device_health',arguments:{deviceId,arguments:{}}}));
    assert.equal(response.ok,true);
    assert.equal(response.result.deviceId,deviceId);
  }
  assert.equal(f.executed.length,5);
  assert.equal(f.receipts.filter(x=>x.outcome==='ADMITTED').length,5);
});
test('concurrent principals cannot enumerate or execute each others devices', async t => {
  const f=await fixture(t);
  const [owner, limited]=await Promise.all([f.connect(),f.connect('test-limited')]);
  const [all, scoped]=await Promise.all([owner,limited].map(c=>c.callTool({name:'bridge_devices',arguments:{}})));
  assert.equal(decode(all).devices.length,5);
  assert.deepEqual(decode(scoped).devices,['ios-unit']);
  const denied=decode(await limited.callTool({name:'device_health',arguments:{deviceId:'windows-unit',arguments:{}}}));
  assert.equal(denied.error,'UNKNOWN_DEVICE');
  assert.equal(f.executed.length,0);
});
test('unauthorized mutation and unavailable receipt sink execute nothing',async t=>{
  const f=await fixture(t),c=await f.connect();
  const denied=decode(await c.callTool({name:'device_files_write',arguments:{deviceId:'ios-unit',arguments:{path:'never.txt',text:'no'}}}));
  assert.equal(denied.error,'ADMISSION_DENIED');
  assert.equal(f.executed.length,0);
  const g=await fixture(t,{receiptFailure:true}),d=await g.connect();
  const failed=decode(await d.callTool({name:'device_health',arguments:{deviceId:'ios-unit',arguments:{}}}));
  assert.equal(failed.error,'RECEIPT_WRITE_FAILED');
  assert.equal(g.executed.length,0);
});
test('HTTP rejects missing auth and hostile origins before resolving devices',async t=>{
  const f=await fixture(t);
  assert.equal((await fetch(f.url,{method:'POST',body:'{}'})).status,401);
  assert.equal((await fetch(f.url,{method:'POST',headers:{authorization:'Bearer test-owner',origin:'https://evil.invalid'},body:'{}'})).status,403);
  assert.equal(f.resolutions(),0);
});
test('HTTP rejects invalid JSON, oversized input and unsupported methods',async t=>{
  const f=await fixture(t),headers={authorization:'Bearer test-owner','content-type':'application/json'};
  assert.equal((await fetch(f.url,{method:'POST',headers,body:'{'})).status,400);
  assert.equal((await fetch(f.url,{method:'POST',headers,body:JSON.stringify('x'.repeat(1024*1024))})).status,413);
  assert.equal((await fetch(f.url,{headers})).status,405);
  assert.equal(f.resolutions(),0);
});
test('HTTP refuses missing trusted Bridge and missing startup callbacks',async t=>{
  assert.throws(()=>createRemoteMcpHandler(),/TRUSTED_MCP_HTTP_CONFIGURATION_REQUIRED/);
  const f=await fixture(t,{unavailable:true});
  assert.equal((await fetch(f.url,{method:'POST',headers:{authorization:'Bearer test-owner','content-type':'application/json'},body:'{}'})).status,503);
  assert.equal(f.executed.length,0);
});
