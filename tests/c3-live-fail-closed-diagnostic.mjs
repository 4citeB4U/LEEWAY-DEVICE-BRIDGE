/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE
TAG: LEEWAY.C3.HOST_INGRESS_NEGATIVE_ACCEPTANCE
5WH:
WHO = LeeWay Device Bridge creator-authorized diagnostic.
WHAT = Exercise real host MCP ingress while production pre-gates are absent.
WHEN = 2026-10-23.
WHERE = tests/c3-live-fail-closed-diagnostic.mjs.
WHY = Distinguish successful MCP connection from admitted device execution.
HOW = SDK MCP client -> CLI stdio transport -> configured Windows adapter; assert DENIED.
LICENSE: MIT
*/
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const root = path.resolve(import.meta.dirname, '..');
const config = 'E:/LeeWay-Work/evidence-staging/device-bridge-cli-20261023/windows-c3-ingress.config.json';
const devices = 'agent-lee-windows-ingress';
const client = new Client({ name: 'leeway-c3-host-ingress-negative-diagnostic', version: '1.0.0' });
const transport = new StdioClientTransport({ command: process.execPath,
  args: [path.join(root, 'operator/device-bridge-cli.mjs'), 'mcp', '--config', config], stderr: 'pipe' });
try {
  await client.connect(transport);
  const tools = await client.listTools();
  assert.ok(tools.tools.some(t => t.name === 'device_health'));
  const cap = await client.callTool({ name: 'bridge_capabilities', arguments: { deviceId: devices } });
  const capability = JSON.parse(cap.content[0].text).capabilities.find(x => x.name === 'device.health');
  assert.equal(capability?.granted, true);
  const result = await client.callTool({ name: 'device_health', arguments: { deviceId: devices, arguments: {} } });
  const output = JSON.parse(result.content[0].text);
  assert.equal(output.ok, false);
  assert.equal(output.error, 'ADMISSION_DENIED');
  assert.equal(output.receipt?.formula, 'NOT_EVALUATED');
  const location = path.join(path.dirname(config), 'windows-c3-ingress-observations.jsonl');
  const receipts = (await fs.readFile(location, 'utf8')).trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
  assert.ok(receipts.some(r => r.outcome === 'BLOCKED' && r.formula === 'NOT_EVALUATED'));
  process.stdout.write(JSON.stringify({ type: 'LIVE_LOCAL_MCP_INGRESS', toolsEnumerated: tools.tools.length,
    configuredHost: devices, healthCapabilityGranted: capability.granted,
    actualAdmission: output.error, localControllerReceipt: 'BLOCKED',
    formula: output.receipt.formula, productionVeritas: 'NOT_EXECUTED',
    platformAdapterExecution: 'NOT_EXECUTED', learningLedger: 'NOT_UPDATED',
    receiptLocation: location }, null, 2) + '\n');
} finally {
  await client.close();
}
