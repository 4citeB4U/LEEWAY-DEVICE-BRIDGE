/*
LEEWAY HEADER — DO NOT REMOVE
WHO: GUARD_FAMILY_5_SIGNAL_SENTINEL.
WHAT: Live Runtime-bound Bridge qualification for one workspace and canonical device IDs.
WHEN: 2026-11-15.
WHERE: tests/mcp/live-device-qualification.test.mjs.
HOW: Use an explicit host-only qualification plan and authenticated stdio MCP.
WHY: Keep execution, read-only device inspection, aliases, and unavailable adapters distinct.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const planPath = process.env.LEEWAY_LIVE_QUALIFICATION_PLAN;

function parseToolResult(response) {
  const text = response.content?.find(item => item.type === 'text')?.text;
  assert.equal(typeof text, 'string', 'MCP tool must return a text result');
  return JSON.parse(text);
}

test('GUARD_FAMILY_5_SIGNAL_SENTINEL: live Runtime-bound workspace and canonical-device qualification', {
  skip: !planPath && 'Set LEEWAY_LIVE_QUALIFICATION_PLAN to an owner-controlled host-only plan',
  timeout: 120000,
}, async () => {
  const plan = JSON.parse(fs.readFileSync(path.resolve(planPath), 'utf8'));
  for (const key of ['bridgeRoot', 'hostConfigPath', 'sourceDeviceConfigPath', 'workspace', 'resultPath']) {
    assert.equal(typeof plan[key], 'string');
    assert.ok(path.isAbsolute(plan[key]), `${key} must be absolute`);
  }
  const bridgeRoot = fs.realpathSync(plan.bridgeRoot);
  const isWithinBridge = candidate => {
    const relative = path.relative(bridgeRoot, path.resolve(candidate));
    return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
  };
  assert.ok(!isWithinBridge(plan.hostConfigPath), 'host config must remain outside the repository');
  assert.ok(!isWithinBridge(plan.sourceDeviceConfigPath), 'source device config must remain outside the repository');
  assert.ok(!isWithinBridge(plan.resultPath), 'private result must remain outside the repository');
  const actualSourceCommit = execFileSync('git', ['-C', bridgeRoot, 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
    timeout: 5000,
    windowsHide: true,
  }).trim();
  assert.equal(plan.sourceCommit, actualSourceCommit);

  const sourceConfig = JSON.parse(fs.readFileSync(plan.sourceDeviceConfigPath, 'utf8'));
  const configuredFold6 = sourceConfig.devices.find(device => device.id === 'phone-fold6');
  const configuredAlias = sourceConfig.devices.find(device =>
    device.id === 'LDB-04ff1b33-8a70-434c-9aba-8752a30789ee');
  const configuredHp = sourceConfig.devices.find(device => device.id === 'pc-hp-secondary');
  assert.equal(configuredFold6?.type, 'physical-android');
  assert.equal(configuredAlias?.type, 'physical-android');
  assert.equal(typeof configuredFold6?.serial, 'string');
  assert.ok(configuredFold6.serial.length > 0);
  assert.equal(configuredFold6.serial, configuredAlias.serial);
  assert.equal(configuredHp?.type, 'desktop');
  assert.equal(typeof configuredHp.workspace, 'string');
  assert.equal(fs.existsSync(path.resolve(path.dirname(plan.sourceDeviceConfigPath), configuredHp.workspace)), false);

  const hostConfig = JSON.parse(fs.readFileSync(plan.hostConfigPath, 'utf8'));
  assert.ok(path.isAbsolute(hostConfig.bridgeConfig));
  assert.ok(!isWithinBridge(hostConfig.bridgeConfig), 'host bridge config must remain outside the repository');
  const hostBridgeConfig = JSON.parse(fs.readFileSync(hostConfig.bridgeConfig, 'utf8'));
  assert.deepEqual(hostBridgeConfig.devices.map(device => device.id).sort(), [
    'pc-primary',
    'phone-apple-iphone',
    'phone-fold6',
  ].sort());
  assert.equal(hostBridgeConfig.devices.find(device => device.id === 'phone-fold6')?.type, 'physical-android');
  assert.equal(hostBridgeConfig.devices.find(device => device.id === 'phone-apple-iphone')?.type, 'physical-apple');
  assert.ok(hostBridgeConfig.devices.some(device =>
    device.id === 'pc-primary' && path.resolve(device.workspace) === path.resolve(plan.workspace)));

  assert.deepEqual(plan.devices.map(device => device.deviceId), [
    'phone-fold6',
    'phone-apple-iphone',
  ]);
  assert.deepEqual(plan.blockedDevices.map(({ deviceId, reason }) => ({ deviceId, reason })), [
    { deviceId: 'pc-hp-secondary', reason: 'NO_REMOTE_ADAPTER' },
  ]);

  const client = new Client({ name: 'live-device-qualification', version: '1.0.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(plan.bridgeRoot, 'operator/start-provider-bound-mcp.mjs'), plan.hostConfigPath],
    env: process.env,
    stderr: 'pipe',
  });
  const observations = [];
  let temporaryPath;
  observations.push({
    deviceId: configuredAlias.id,
    canonicalDeviceId: 'phone-fold6',
    operation: 'alias-reconciliation',
    status: 'DUPLICATE_CONFIGURED_TRANSPORT_NOT_EXPOSED',
  });
  observations.push(...plan.blockedDevices.map(device => ({
    deviceId: device.deviceId,
    operation: 'device.info',
    status: 'BLOCKED',
    error: device.reason,
  })));

  try {
    try {
      await client.connect(transport);
    } catch (error) {
      observations.push({
        operation: 'provider-bound-mcp.start',
        status: 'G4_NOT_TRANSITIONED',
        error: error.message,
      });
      throw error;
    }

    const relativePath = `qualification-${randomUUID()}.mjs`;
    const workspace = fs.realpathSync(plan.workspace);
    temporaryPath = path.resolve(workspace, relativePath);
    assert.equal(path.dirname(temporaryPath), workspace);
    const text = [
      '/*',
      'WHO: GUARD_FAMILY_5_SIGNAL_SENTINEL.',
      'WHAT: Bounded live Runtime-authorized workspace write.',
      'WHEN: 2026-11-15.',
      'WHERE: Isolated qualification workspace.',
      'HOW: Device Bridge MCP write and independent readback.',
      'WHY: Verify the live provider-bound host contract.',
      '*/',
      'export const qualification = true;',
      '',
    ].join('\n');

    const written = parseToolResult(await client.callTool({
      name: 'device_files_write',
      arguments: { deviceId: 'pc-primary', arguments: { path: relativePath, text } },
    }));
    observations.push({
      deviceId: 'pc-primary',
      operation: 'device.files.write',
      status: written.governance?.state === 'G4_ADMITTED' ? 'G4_ADMITTED' : 'G4_NOT_TRANSITIONED',
      error: written.ok === true ? null : written.error ?? 'WRITE_NOT_ADMITTED',
      ...(typeof written.governance?.receipt?.receiptId === 'string'
        ? { receiptId: written.governance.receipt.receiptId }
        : {}),
      ...(typeof written.governance?.admission?.admissionId === 'string'
        ? { admissionId: written.governance.admission.admissionId }
        : {}),
    });
    assert.equal(written.ok, true, JSON.stringify({
      error: written.error,
      governance: written.governance?.state,
    }));
    assert.equal(written.governance?.state, 'G4_ADMITTED');
    assert.equal(written.governance?.receiptState, 'READBACK_CONFIRMED');
    assert.equal(written.governance?.learningLedgerState, 'ADMITTED');

    const read = parseToolResult(await client.callTool({
      name: 'device_files_read',
      arguments: { deviceId: 'pc-primary', arguments: { path: relativePath } },
    }));
    observations.push({
      deviceId: 'pc-primary',
      operation: 'device.files.read',
      status: read.governance?.state === 'G4_ADMITTED' ? 'G4_ADMITTED' : 'G4_NOT_TRANSITIONED',
      error: read.ok === true ? null : read.error ?? 'READ_NOT_ADMITTED',
    });
    assert.equal(read.ok, true);
    assert.equal(read.result?.text, text);
    assert.equal(read.governance?.state, 'G4_ADMITTED');

    assert.equal(typeof written.governance.receipt?.receiptId, 'string');
    assert.equal(typeof written.governance.admission?.admissionId, 'string');

    for (const device of plan.devices) {
      const observed = parseToolResult(await client.callTool({
        name: 'device_info',
        arguments: { deviceId: device.deviceId, arguments: {} },
      }));
      const infoState = observed.ok === true ? observed.governance?.state : 'G4_NOT_TRANSITIONED';
      observations.push({
        deviceId: device.deviceId,
        operation: 'device.info',
        status: infoState,
        error: observed.ok === true ? null : observed.error ?? 'DEVICE_INFO_DENIED',
      });
      if (observed.ok === true) {
        assert.equal(infoState, 'G4_NOT_TRANSITIONED');
      }

      const view = parseToolResult(await client.callTool({
        name: 'device_screen_capture',
        arguments: { deviceId: device.deviceId, arguments: {} },
      }));
      const capture = view.result;
      observations.push({
        deviceId: device.deviceId,
        operation: 'device.screen.capture',
        status: 'G4_NOT_TRANSITIONED',
        observed: view.ok === true,
        ...(view.ok === true
          ? { mimeType: capture?.mimeType, width: capture?.width, height: capture?.height }
          : { error: view.error ?? 'SCREEN_CAPTURE_DENIED' }),
      });
      if (view.ok === true) {
        assert.ok(['image/jpeg', 'image/png'].includes(capture?.mimeType));
        assert.ok(Number.isInteger(capture.width) && capture.width > 0);
        assert.ok(Number.isInteger(capture.height) && capture.height > 0);
      }
    }

  } finally {
    if (temporaryPath && fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
    if (observations.length > 0) {
      fs.mkdirSync(path.dirname(plan.resultPath), { recursive: true });
      fs.writeFileSync(plan.resultPath, JSON.stringify({
        schema: 'leeway.live-device-qualification-result.v1',
        observedAt: new Date().toISOString(),
        host: os.hostname(),
        sourceCommit: plan.sourceCommit,
        observations,
      }, null, 2), { flag: 'wx', mode: 0o600 });
      console.log(JSON.stringify({ observations }));
    }
    await client.close();
  }
});
