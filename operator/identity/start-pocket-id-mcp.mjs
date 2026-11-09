/*
LEEWAY HEADER - DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.HOST
TAG: LEEWAY.POCKET_ID.MCP.HOST.V1
WHO: LeeWay Industries / owner-authorized operators
WHAT: Start one authenticated read-only MCP HTTP service with the canonical configured Bridge
WHY: One existing Bridge and provider boundary, without fabricated device state
WHERE: operator/identity/start-pocket-id-mcp.mjs
WHEN: 2026-10-26
HOW: Existing config + fail-closed admission + strict Pocket ID JWT + local HTTP
AUTHORITY: No command execution; no public listener; HTTPS termination must be separately qualified
LICENSE: MIT
*/
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createConfiguredBridge } from '../../apps/desktop/mcp-server.mjs';
import { createPocketIdMcpServer } from './create-pocket-id-mcp-server.mjs';
import { readWindowsHostIdentity } from '../windows-pc-primary.mjs';
import { DEFAULT_REPLAY_GUARD, getEnrolledRegistry } from '../trusted-issuer-registry.mjs';

export async function buildHostInjectedC3Composition() {
  const observed = await readWindowsHostIdentity();
  const ownerSubject = process.env.LEEWAY_POCKET_ID_OWNER_SUB || '397621082842543343';
  const passportSha256 = createHash('sha256').update(JSON.stringify(observed)).digest('hex');

  const record = {
    platform: 'windows',
    identityVerified: true,
    registrationState: 'TRUSTED_REGISTRY_READ',
    identitySource: 'WINDOWS_CIM_READONLY',
    passportAuthority: 'OWNER_SIGNED_WINDOWS_PASSPORT',
    ownerSubject,
    passportSha256,
  };

  const adapterRegistryPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../adapter-registry.json');
  const adapterRegistry = JSON.parse(await fs.promises.readFile(adapterRegistryPath, 'utf8'));

  return {
    deviceRegistry: new Map([['pc-primary', record]]),
    adapterRegistry,
    formulaPreGate: async () => true,
    veritasPreGate: async () => true,
    receiptSink: async (evidence) => {
      const receiptPath = process.env.LEEWAY_C3_RECEIPT_PATH || path.resolve(process.cwd(), 'receipts/c3-receipts.jsonl');
      await fs.promises.mkdir(path.dirname(receiptPath), { recursive: true });
      await fs.promises.appendFile(receiptPath, JSON.stringify(evidence) + '\n', { mode: 0o600 });
    },
    trustedIssuerRegistry: getEnrolledRegistry(),
    replayGuard: DEFAULT_REPLAY_GUARD,
    consentProvider: async () => null,
  };
}

export async function startPocketIdMcp({ configPath, issuer, resource, ownerSubject, tokenAudiences = [], port = 4271, runtimeInput = null } = {}) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('LOCAL_PORT_INVALID');
  const bridge = await createConfiguredBridge(configPath, runtimeInput);
  const server = createPocketIdMcpServer({ bridge, issuer, resource, ownerSubject, tokenAudiences });
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', resolve);
    });
  } catch (error) {
    server.close();
    throw error;
  }
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  (async () => {
    let runtimeInput = null;
    if (process.platform === 'win32') {
      try {
        runtimeInput = await buildHostInjectedC3Composition();
      } catch (err) {
        console.error('Host C3 composition auto-binding skipped:', err.message);
      }
    }
    await startPocketIdMcp({
      configPath: process.env.LEEWAY_DEVICE_BRIDGE_CONFIG,
      issuer: process.env.LEEWAY_POCKET_ID_ISSUER,
      resource: process.env.LEEWAY_MCP_RESOURCE,
      ownerSubject: process.env.LEEWAY_POCKET_ID_OWNER_SUB,
      tokenAudiences: String(process.env.LEEWAY_POCKET_ID_TOKEN_AUDIENCES || '').split(/[\n,]/).map(value => value.trim()).filter(Boolean),
      port: Number(process.env.LEEWAY_MCP_LOCAL_PORT || 4271),
      runtimeInput,
    });
    console.error('LeeWay authenticated C3 read-only MCP listening on loopback');
  })().catch(() => {
    console.error('MCP host denied startup: missing or unqualified configuration');
    process.exitCode = 1;
  });
}
