/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.TEST
TAG: LEEWAY.POCKET_ID.UNIVERSAL.DISCOVERY.TEST
WHO: LeeWay Industries
WHAT: Universal MCP Pocket ID discovery-only tool policy
WHEN: 2026-10-26
WHERE: tests/mcp/pocket-id-universal-handler.test.mjs
WHY: A read-only OAuth scope must never publish the Device Bridge mutation tools
HOW: Node built-in tests, explicit test-only principal and Bridge
AUTHORITY: Test-only, not production JWT enrollment
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {Bridge} from '../../packages/protocol/index.mjs';
import {createRemoteMcpHandler} from '../../apps/desktop/mcp-http.mjs';
import {createPocketIdUniversalHandler} from '../../operator/identity/create-pocket-id-universal-handler.mjs';
test('Pocket ID universal factory rejects missing principal-scoped Bridge resolver',()=>{
 assert.throws(()=>createPocketIdUniversalHandler({issuer:'https://id.example.org',resource:'https://mcp.example.org/mcp',ownerSubject:'owner'}),/TRUSTED_BRIDGE_RESOLVER_REQUIRED/);
});
test('discoveryOnly HTTP ingress uses canonical tool factory without advertising device mutation',async t=>{
 const server=createServer();
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(()=>new Promise(r=>server.close(r)));
 const host='127.0.0.1:'+server.address().port;
 const bridge=new Bridge([{id:'device-any',grants:[],adapter:{discover:async()=>[],execute:async()=>{throw Error('UNREACHABLE')}}}],{admission:async()=>false,receiptSink:async()=>{}});
 const handler=createRemoteMcpHandler({authenticate:async req=>req.headers.authorization==='Bearer test-only'?'owner':null,resolveBridge:async()=>bridge,allowedHosts:[host],discoveryOnly:true});
 server.on('request',handler);
 const {Client}=await import('@modelcontextprotocol/sdk/client/index.js');
 const {StreamableHTTPClientTransport}=await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
 const client=new Client({name:'policy-test',version:'1.0'});
 t.after(()=>client.close());
 await client.connect(new StreamableHTTPClientTransport(new URL('http://'+host+'/mcp'),{requestInit:{headers:{Authorization:'Bearer test-only'}}}));
 const names=(await client.listTools()).tools.map(x=>x.name);
 assert.deepEqual(names.sort(),['bridge_capabilities','bridge_devices']);
});
