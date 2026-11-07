/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.MCP.C3
TAG: LEEWAY.C3.VISION_PRINCIPAL_BINDING_TEST
5WH:
  WHAT = Verify authenticated MCP principals cannot spoof another Vision client
  WHY = The caller-controlled clientId must never be an authority grant
  WHO = LeeWay Industries
  WHERE = tests/mcp/vision-principal-binding.test.mjs
  WHEN = 2026-11-07
  HOW = Real MCP client/HTTP transport against explicitly scoped fixture Bridge
LICENSE: Internal LeeWay governance.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Bridge } from '../../packages/protocol/index.mjs';
import { createRemoteMcpHandler } from '../../apps/desktop/mcp-http.mjs';

test('MCP Vision principal is derived from host auth and rejects a forged clientId before dispatch', async t => {
  const executions = [];
  const server = createHttpServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = new URL('http://127.0.0.1:' + server.address().port + '/mcp');
  const handler = createRemoteMcpHandler({
    allowedHosts: [url.host],
    authenticate: async request => request.headers.authorization === 'Bearer llm-one'
      ? { visionClientId: 'llm-one' }
      : request.headers.authorization === 'Bearer no-vision'
        ? { subject: 'llm-without-vision-authorization' } : null,
    resolveBridge: async () => new Bridge([{
      id: 'pc-primary',
      grants: ['vision.sources.list'],
      adapter: {
        discover: async () => ['vision.sources.list'],
        execute: async (name, args) => {
          executions.push({ name, args });
          return { sources: [], fixtureOnly: true };
        }
      }
    }], {
      admission: async () => true, // Synthetic admission fixture, not production proof
      receiptSink: async () => {}
    })
  });
  server.on('request', handler);
  const clients = [];
  t.after(async () => {
    await Promise.all(clients.map(client => client.close()));
    await new Promise(resolve => server.close(resolve));
  });
  async function connect(token) {
    const client = new Client({ name: 'vision-principal-fixture', version: '1' });
    clients.push(client);
    await client.connect(new StreamableHTTPClientTransport(url, {
      requestInit: { headers: { Authorization: 'Bearer ' + token } }
    }));
    return client;
  }
  const llm = await connect('llm-one');
  const tools = (await llm.listTools()).tools.map(tool => tool.name);
  assert.ok(tools.includes('vision_sources_list'));
  const spoof = await llm.callTool({ name: 'vision_sources_list', arguments: {
    deviceId: 'pc-primary', arguments: { clientId: 'another-model' }
  } });
  assert.equal(JSON.parse(spoof.content[0].text).error, 'VISION_PRINCIPAL_MISMATCH');
  assert.equal(executions.length, 0);

  const allowed = await llm.callTool({ name: 'vision_sources_list', arguments: {
    deviceId: 'pc-primary', arguments: { clientId: 'llm-one' }
  } });
  assert.equal(JSON.parse(allowed.content[0].text).ok, true);
  assert.equal(executions.length, 1);
  assert.equal(executions[0].args.clientId, 'llm-one');

  const missingIdentity = await connect('no-vision');
  const otherTools = (await missingIdentity.listTools()).tools.map(tool => tool.name);
  assert.equal(otherTools.some(name => name.startsWith('vision_')), false);
});
