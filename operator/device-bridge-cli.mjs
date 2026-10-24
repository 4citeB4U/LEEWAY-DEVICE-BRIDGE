#!/usr/bin/env node
/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE
TAG: LEEWAY.DEVICE.BRIDGE.CLI
5WH:
WHAT = Cross-platform CLI ingress for the existing LeeWay Device Bridge transports.
WHY = One discoverable launcher without creating a competing runtime or authority.
WHO = Leeway Industries / authorized device owners and Agent Lee clients.
WHERE = operator/device-bridge-cli.mjs
WHEN = 2026-10-23
HOW = Node CLI -> canonical MCP server, relay gateway, or approved remote controller.
LICENSE: MIT
*/
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const command = argv.shift() || 'help';
const flags = new Map();
const positional = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--config' || argv[i] === '--manifest') {
    if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('MISSING_OPTION_VALUE');
    flags.set(argv[i++], argv[i]);
  } else if (argv[i].startsWith('--')) throw new Error('UNKNOWN_OPTION');
  else positional.push(argv[i]);
}
const config = flags.get('--config') || process.env.LEEWAY_BRIDGE_CONFIG;
const configPath = config ? path.resolve(config) : null;
const manifestPath = flags.get('--manifest') ? path.resolve(flags.get('--manifest')) : path.join(root, 'docs', 'package-manifest.json');
const print = obj => process.stdout.write(JSON.stringify(obj, null, 2) + '\n');
const has = async p => fs.access(p).then(() => true, () => false);
function usage() {
  process.stdout.write(`LeeWay Device Bridge CLI
Usage: leeway-bridge <command> [options]

  voice-status              Check local Voice Fabric duplex service (read-only)
  voice-binding             Read canonical owner voice without publishing
  voice-start               Launch configured local duplex runtime explicitly
  voice-open                Open local duplex UI by explicit operator command
  doctor                    Check local entrypoints and admission readiness
  status [--config FILE]     Show source/configuration status, NOT live connection
  devices --config FILE      List configured device IDs, NOT online state
  catalog                   Read the existing published package manifest
  verify-catalog             Hash-check local published artifacts against manifest
  probe --config FILE        Open real MCP session and enumerate live tools
  mcp --config FILE          Start existing local stdio MCP server
  gateway                   Start existing authenticated loopback relay gateway
  call CAPABILITY [JSON]     Invoke existing paired remote controller (requires credentials)
  help                      Print this help

Connection/installation claims require physical execution and separate verification.
`);
}
async function main() {
  if (command === 'help' || command === '--help' || command === '-h') { usage(); return; }
  if (command === 'doctor' || command === 'status') {
    const state = {
      service: 'leeway-device-bridge', command, platform: process.platform,
      node: process.version,
      mcpSourcePresent: await has(path.join(root, 'apps/desktop/mcp-server.mjs')),
      gatewaySourcePresent: await has(path.join(root, 'clients/remote-controller/device-mcp-gateway.mjs')),
      packageManifestPresent: await has(manifestPath),
      configSelected: Boolean(configPath), configPresent: configPath ? await has(configPath) : false,
      pairedRemoteCredentialsPresent: Boolean(process.env.LEEWAY_DEVICE_ID && process.env.LEEWAY_PAIRING_TOKEN),
      gatewayCredentialVariablesPresent: Boolean(process.env.LEEWAY_DEVICE_MCP_BEARER_TOKEN),
      productionAdmission: 'NOT_VERIFIED',
      connected: 'NOT_TESTED',
    };
    print(state);
    if (!state.mcpSourcePresent || !state.packageManifestPresent) process.exitCode = 2;
    return;
  }
  if (command === 'voice-status' || command === 'voice-open' || command === 'voice-start' || command === 'voice-binding') {
    const {getVoiceDuplexStatus,openLocalVoiceDuplex,startLocalVoiceDuplex,getLocalVoiceBinding}=await import('./voice-duplex.mjs');
    if(command === 'voice-status'){print(await getVoiceDuplexStatus());return;}
    if(command === 'voice-binding'){print(await getLocalVoiceBinding());return;}
    if(command === 'voice-start'){print(await startLocalVoiceDuplex());return;}
    print(openLocalVoiceDuplex());
    return;
  }
  if (command === 'devices') {
    if (!configPath) throw new Error('CONFIG_REQUIRED');
    const data = JSON.parse(await fs.readFile(configPath, 'utf8'));
    if (!Array.isArray(data.devices)) throw new Error('INVALID_DEVICE_CONFIG');
    print({ connected: 'NOT_TESTED', devices: data.devices.map(d => ({ id: d.id, type: d.type, configured: true })) });
    return;
  }
  if (command === 'catalog') {
    const data = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    if (!Array.isArray(data.packages)) throw new Error('INVALID_PACKAGE_MANIFEST');
    print({ authority: data.authority, packages: data.packages.map(p => ({
      id: p.id, platform: p.platform, channel: p.channel, status: p.status,
      manifestHasDownloadAndSha256: Boolean(p.downloadUrl && /^[0-9a-f]{64}$/i.test(p.sha256 || '')),
      downloadVerifiedNow: false, installationVerified: false,
    })) });
    return;
  }
  if (command === 'verify-catalog') {
    const data = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    if (!Array.isArray(data.packages)) throw new Error('INVALID_PACKAGE_MANIFEST');
    const manifestDir = path.dirname(manifestPath);
    const rows = [];
    for (const p of data.packages) {
      const item = { id: p.id, platform: p.platform, state: 'NOT_QUALIFIED' };
      if (!p.downloadUrl || p.status === 'NOT_BUILT') { item.state = 'NO_ARTIFACT_DECLARED'; rows.push(item); continue; }
      if (typeof p.downloadUrl !== 'string' || !/^\.\/[a-zA-Z0-9._/-]+$/.test(p.downloadUrl) ||
          p.downloadUrl.split('/').includes('..') || !/^[0-9a-f]{64}$/i.test(p.sha256 || '')) {
        item.state = 'INVALID_MANIFEST_ENTRY'; rows.push(item); continue;
      }
      const target = path.resolve(manifestDir, p.downloadUrl);
      if (!target.startsWith(manifestDir + path.sep)) { item.state = 'PATH_OUTSIDE_MANIFEST'; rows.push(item); continue; }
      try {
        const stat = await fs.lstat(target);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > (data.targetBootstrapPackageMaxBytes || 104857600)) {
          item.state = 'UNSAFE_ARTIFACT'; rows.push(item); continue;
        }
        const hash = createHash('sha256');
        for await (const chunk of createReadStream(target)) hash.update(chunk);
        const actual = hash.digest('hex');
        item.state = stat.size === p.sizeBytes && actual.toLowerCase() === p.sha256.toLowerCase()
          ? 'LOCAL_FILE_MATCHES_MANIFEST' : 'ARTIFACT_MISMATCH';
        item.actualBytes = stat.size;
        item.actualSha256 = actual;
      } catch (err) { item.state = err?.code === 'ENOENT' ? 'ARTIFACT_NOT_PRESENT_LOCALLY' : 'ARTIFACT_READ_FAILED'; }
      rows.push(item);
    }
    print({ manifest: manifestPath, verification: 'LOCAL_FILES_ONLY', packages: rows });
    if (rows.some(x => !['LOCAL_FILE_MATCHES_MANIFEST', 'NO_ARTIFACT_DECLARED'].includes(x.state))) process.exitCode = 1;
    return;
  }
  if (command === 'probe') {
    if (!configPath || !(await has(configPath))) throw new Error('CONFIG_REQUIRED_OR_MISSING');
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
    const client = new Client({ name: 'leeway-device-bridge-cli-probe', version: '1.0.0' });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [fileURLToPath(import.meta.url), 'mcp', '--config', configPath],
      stderr: 'pipe'
    });
    try {
      await client.connect(transport);
      const tools = await client.listTools();
      const response = await client.callTool({ name: 'bridge_devices', arguments: {} });
      if (response.isError || !response.content?.[0]?.text) throw new Error('MCP_DEVICE_DISCOVERY_FAILED');
      const devices = JSON.parse(response.content[0].text);
      const discoveries = [];
      for (const id of devices.devices || []) {
        try {
          const r = await client.callTool({ name: 'bridge_capabilities', arguments: { deviceId: id } });
          const caps = JSON.parse(r.content?.[0]?.text || '{}');
          discoveries.push({ deviceId: id, adapterResponded: Boolean(!r.isError && Array.isArray(caps.capabilities)),
            availableCapabilities: Array.isArray(caps.capabilities) ? caps.capabilities.map(c => c.name) : [],
            state: Array.isArray(caps.capabilities) ? 'CAPABILITIES_DISCOVERED' : 'DISCOVERY_FAILED' });
        } catch { discoveries.push({ deviceId: id, adapterResponded: false, state: 'DISCOVERY_FAILED' }); }
      }
      print({ transport: 'LOCAL_STDIO_MCP_CONNECTED', toolsEnumerated: tools.tools.length,
        devicesConfigured: devices.devices, discoveries, devicesOnline: 'NOT_TESTED',
        chatgptConnectorRegistered: 'NOT_TESTED', productionAdmission: 'NOT_VERIFIED' });
    } finally { await client.close(); }
    return;
  }
  if (command === 'mcp') {
    if (!configPath || !(await has(configPath))) throw new Error('CONFIG_REQUIRED_OR_MISSING');
    const { start } = await import('../apps/desktop/mcp-server.mjs');
    await start(configPath);
    return;
  }
  if (command === 'gateway') {
    if (!process.env.LEEWAY_DEVICE_MCP_BEARER_TOKEN) throw new Error('GATEWAY_TOKEN_REQUIRED');
    await import('../clients/remote-controller/device-mcp-gateway.mjs');
    return;
  }
  if (command === 'call') {
    const [capability = 'device.health', rawArgs = '{}'] = positional;
    const { schemas } = await import('../packages/protocol/index.mjs');
    if (!Object.hasOwn(schemas, capability)) throw new Error('CAPABILITY_NOT_REGISTERED');
    const parsed = JSON.parse(rawArgs);
    schemas[capability].parse(parsed);
    if (!process.env.LEEWAY_DEVICE_ID || !process.env.LEEWAY_PAIRING_TOKEN) throw new Error('PAIRING_CREDENTIALS_REQUIRED');
    const client = path.join(root, 'clients/remote-controller/client.mjs');
    const result = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [client, capability, JSON.stringify(parsed)], { shell: false, stdio: 'inherit' });
      child.once('error', reject);
      child.once('exit', (code, signal) => resolve({ code, signal }));
    });
    if (result.code !== 0) process.exitCode = result.code || 1;
    return;
  }
  throw new Error('UNKNOWN_COMMAND');
}
main().catch(error => { process.stderr.write('LEEWAY_BRIDGE_ERROR: ' + error.message + '\n'); process.exitCode = 2; });
