import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { Bridge, schemas } from '../../packages/protocol/index.mjs';
import { RelayAdapter } from '../../packages/agent-relay/index.mjs';
import { DesktopAdapter } from './adapter.mjs';
import { createC3AdmissionBinding } from '../../operator/c3-admission-binding.mjs';
import { requireTrustedRuntimeComposition } from './runtime-composition.mjs';

import { createServer } from './mcp-tools.mjs';
export { createServer } from './mcp-tools.mjs';

const deviceSchema = z.object({
  id: z.string().min(1).max(128), type: z.enum(['desktop', 'relay']),
  grants: z.array(z.enum(Object.keys(schemas))).max(Object.keys(schemas).length),
  // Platform names are resolved against the owner-controlled adapter registry.
  // Do not bake a finite OS list or an implicit desktop default into this contract.
  platform: z.string().min(1).max(64).optional(),
  workspace: z.string().optional(), skillsRoot: z.string().max(2048).optional(), tokenEnv: z.string().regex(/^[A-Z][A-Z0-9_]*$/).optional(),
  url: z.string().url().optional(),
}).strict();

// Configuration grants never act as Formula/Veritas approval. Trusted Runtime
// startup may supply the owner callbacks; otherwise the canonical C3 binding
// receives no Formula/Veritas gates and denies every command.
export function createProductionAdmission(devices, providers = {}) {
  const deviceRegistry = providers.deviceRegistry ?? new Map(devices.map(device => [device.id, {
    platform: device.platform || null,
  }]));
  return createC3AdmissionBinding({
    deviceRegistry,
    registry: providers.adapterRegistry,
    trustedIssuerRegistry: providers.trustedIssuerRegistry,
    replayGuard: providers.replayGuard,
    veritasPreGate: providers.veritasPreGate ?? null,
    consentProvider: providers.consentProvider ?? null,
    formulaPreGate: providers.formulaPreGate ?? null,
  });
}

export async function start(configPath, runtimeInput = null) {
  if (!configPath) throw new Error('CONFIG_REQUIRED');
  const runtimeComposition = runtimeInput === null ? null : requireTrustedRuntimeComposition(runtimeInput);
  const config = z.object({ devices: z.array(deviceSchema).min(1).max(32), receipts: z.string().min(1).optional() }).strict().parse(JSON.parse(await fs.readFile(configPath, 'utf8')));
  const base = path.dirname(path.resolve(configPath));
  const receiptPath = config.receipts ? path.resolve(base, config.receipts) : null;
  if (!runtimeComposition && !receiptPath) throw new Error('RECEIPTS_REQUIRED');
  const devices = config.devices.map(d => ({ ...d, adapter: d.type === 'desktop'
    ? new DesktopAdapter(d.workspace ? path.resolve(base, d.workspace) : (() => { throw new Error('WORKSPACE_REQUIRED'); })(), {skillsRoot: d.skillsRoot ? path.resolve(base,d.skillsRoot) : null, receiptPath})
    : new RelayAdapter({ deviceId: d.id, url: d.url, token: d.tokenEnv ? process.env[d.tokenEnv] : undefined }) }));
  if (receiptPath) await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  const admission = runtimeComposition?.mode === 'direct'
    ? runtimeComposition.admission
    : createProductionAdmission(devices, runtimeComposition ?? {});
  const bridge = new Bridge(devices, {
    // Without an injected Runtime composition, C3 deliberately denies all execution.
    admission,
    receiptSink: runtimeComposition?.receiptSink ?? (evidence => fs.appendFile(receiptPath, JSON.stringify(evidence) + '\n', { mode: 0o600 })),
  });
  const server = createServer(bridge);
  await server.connect(new StdioServerTransport());
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  start(process.argv[2]).catch(() => { console.error('Device Bridge MCP startup failed; check configuration and credential environment.'); process.exitCode = 1; });
}
