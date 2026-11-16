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
import { Bridge, digest } from '../../packages/protocol/index.mjs';
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
        deviceRegistry: new Map(ids.map(id => [id, { platform: 'test-platform' }])),
        ...(options.cardRequired ? {
          complianceCardGate: async ({complianceCard}) => complianceCard?.taskId === 'http-card'
            ? {valid:true,cardHash:digest(complianceCard),authority:'LEEWAY_RUNTIME_FABRIC'}
            : false,
        } : {}),
        receiptSink: async r => { if(options.receiptFailure) throw Error('FAIL'); receipts.push(r); }
      });
    },
    ...(options.cardProvider ? {
      resolveComplianceCardProvider: async principal => principal === 'owner'
        ? async ({deviceId,capability,args}) => ({
          taskId:'http-card',agentId:'ChatGPT',deviceId,capability,argumentsHash:digest(args),
        })
        : null,
    } : {}),
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
  assert.match(c.getInstructions() || '', /LeeWay Device Bridge Agent Operating Contract/);
  assert.match(c.getInstructions() || '', /GATE 0 — AGENT LEE VOICE IS MANDATORY/);
  assert.match(c.getInstructions() || '', /4citeB4U\/LeeWay-Engineering/);
  assert.match(c.getInstructions() || '', /4citeB4U\/Receipt-Authority/);
  assert.match(c.getInstructions() || '', /GATE P — PORTABLE CODE WRITING AND DEVICE AUTHORITY/);
  assert.match(c.getInstructions() || '', /development computer/);
  assert.match(c.getInstructions() || '', /INVESTIGATE → DIAGNOSE → PLAN → IMPLEMENT → TEST → VALIDATE → REPAIR → RETEST → VERIFY → EVIDENCE → CHECKPOINT → CONTINUE/);
  const tools=await c.listTools();
  assert.ok(tools.tools.some(x=>x.name==='leeway_operating_contract'));
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

test('owner-scoped HTTP MCP issues Runtime-validated cards server-side and omits card input',async t=>{
  const f=await fixture(t,{cardRequired:true,cardProvider:true}),client=await f.connect();
  const tools=(await client.listTools()).tools;
  const health=tools.find(tool=>tool.name==='device_health');
  assert.ok(health);
  assert.equal(Object.hasOwn(health.inputSchema.properties,'complianceCard'),false);
  const result=decode(await client.callTool({name:'device_health',arguments:{deviceId:'android-unit',arguments:{}}}));
  assert.equal(result.ok,true);
  assert.equal(result.operationMayHaveExecuted,true);
  assert.equal(result.receipt.complianceCardStatus,'VALID');
  assert.equal(result.receipt.complianceCardAuthority,'LEEWAY_RUNTIME_FABRIC');
  assert.equal(f.receipts.filter(r=>r.outcome==='ADMITTED').at(-1).complianceCardStatus,'VALID');
  assert.equal(f.receipts.filter(r=>r.outcome==='PASS').at(-1).operationMayHaveExecuted,true);
});

test('HTTP execution fails closed when a card-required Bridge has no trusted issuer/validator',async t=>{
  const f=await fixture(t,{cardRequired:true}),headers={authorization:'Bearer test-owner','content-type':'application/json'};
  const response=await fetch(f.url,{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'missing-provider-test',version:'1'}}})});
  assert.equal(response.status,503);
  assert.equal((await response.json()).error,'TRUSTED_COMPLIANCE_CARD_PROVIDER_REQUIRED');
  assert.equal(f.executed.length,0);
});



test('five separately authenticated agents receive equal authorized Bridge tools without a Codex proxy', async t => {
  // Source-level fixture: real HTTP/MCP client sessions, synthetic Runtime policy,
  // not live ZITADEL, physical keyboard input, independent Veritas or production.
  const agentIds = ['F1_CODEX', 'F2_CHATGPT', 'F3_GEMINI', 'F4_ANTIGRAVITY', 'F5_COPILOT'];
  const eligible = [
    'device.health', 'device.windows.window.list', 'device.windows.window.observe',
    'device.windows.window.input', 'device.windows.window.submit', 'device.windows.window.read',
  ];
  const executions = [];
  const revocations = new Set();
  const clients = [];
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = new URL('http://127.0.0.1:' + server.address().port + '/mcp');
  t.after(async () => {
    await Promise.all(clients.map(client => client.close()));
    await new Promise(resolve => server.close(resolve));
  });
  server.on('request', createRemoteMcpHandler({
    allowedHosts: [url.host],
    authenticate: async req => {
      const agentId = String(req.headers.authorization || '').replace(/^Bearer fixture-/, '');
      return agentIds.includes(agentId)
        ? { agentId, ownerSubject: 'fixture-owner', identitySource: 'TEST_ONLY' }
        : null;
    },
    resolveBridge: async principal => new Bridge([{
      id: 'fixture-workstation',
      grants: [...eligible, 'device.files.write'],
      adapter: {
        discover: async () => [...eligible, 'device.files.write'],
        execute: async (capability, args) => {
          executions.push({ capability, args, agentId: principal.agentId });
          return { deviceId: 'fixture-workstation', capability, accepted: true };
        },
      },
    }], {
      admission: async () => true, // synthetic fixture ONLY; not production C3/Formula
      deviceRegistry: new Map([['fixture-workstation', {platform: 'test-platform'}]]),
      receiptSink: async () => {}, // fixture receipt, NOT canonical Receipt Authority
    }),
    resolveAgentExecutionPolicy: async principal => ({
      agentId: principal.agentId,
      allowedCapabilities: eligible,
      recheckCapability: async ({ principal: current, agentId, deviceId, capability }) =>
        current.agentId === agentId &&
        current.ownerSubject === 'fixture-owner' &&
        deviceId === 'fixture-workstation' &&
        eligible.includes(capability) &&
        !revocations.has(agentId),
    }),
  }));
  for (const agentId of agentIds) {
    const client = new Client({ name: 'independent-' + agentId, version: '1.0.0' });
    clients.push(client);
    await client.connect(new StreamableHTTPClientTransport(url, {
      requestInit: { headers: { Authorization: 'Bearer fixture-' + agentId } },
    }));
    const tools = (await client.listTools()).tools.map(tool => tool.name);
    for (const capability of eligible) assert.ok(tools.includes(capability.replaceAll('.', '_')), agentId + ' missing ' + capability);
    assert.ok(!tools.includes('device_files_write'), agentId + ' must not inherit unapproved file writes');
    const result = decode(await client.callTool({
      name: 'device_windows_window_list',
      arguments: { deviceId: 'fixture-workstation', arguments: { app: 'chatgpt', limit: 1 } },
    }));
    assert.equal(result.ok, true, agentId + ' independent invocation');
  }
  assert.deepEqual(executions.map(e => e.agentId), agentIds);
  assert.ok(executions.every(e => e.capability === 'device.windows.window.list'));
  revocations.add('F3_GEMINI');
  const denied = decode(await clients[2].callTool({
    name: 'device_windows_window_list',
    arguments: { deviceId: 'fixture-workstation', arguments: { app: 'chatgpt', limit: 1 } },
  }));
  assert.equal(denied.error, 'AGENT_CAPABILITY_NOT_AUTHORIZED');
  assert.equal(denied.operationMayHaveExecuted, false);
  assert.equal(executions.length, 5);
  const chatgpt = decode(await clients[1].callTool({
    name: 'device_windows_window_list',
    arguments: { deviceId: 'fixture-workstation', arguments: { app: 'chatgpt', limit: 1 } },
  }));
  assert.equal(chatgpt.ok, true, 'one agent losing a grant must not disable the others');
  assert.equal(executions.length, 6);
  const unauth = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer fixture-unknown' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'unknown', version: '1' } } }) });
  assert.equal(unauth.status, 401);
});

test('scoped agent execution rejects mismatched identity and cannot override a host discovery hold', async t => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = new URL('http://127.0.0.1:' + server.address().port + '/mcp');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const bridge = new Bridge([], { admission: async () => false, receiptSink: async () => {} });
  server.on('request', createRemoteMcpHandler({
    allowedHosts: [url.host],
    authenticate: async req => req.headers.authorization === 'Bearer fixture-a'
      ? { agentId: 'F2_CHATGPT' } : null,
    resolveBridge: async () => bridge,
    discoveryOnly: true,
    resolveAgentExecutionPolicy: async () => ({
      agentId: 'F2_CHATGPT',
      allowedCapabilities: ['device.windows.window.list'],
      recheckCapability: async () => true,
    }),
  }));
  const response = await fetch(url, { method: 'POST', headers: {
    authorization: 'Bearer fixture-a', 'content-type': 'application/json',
  }, body: '{}' });
  assert.equal(response.status, 403, 'runtime discovery hold cannot be overridden by agent policy');
});
