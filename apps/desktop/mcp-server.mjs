import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { Bridge, schemas } from '../../packages/protocol/index.mjs';
import {
  LEEWAY_MCP_INSTRUCTIONS,
  LEEWAY_OPERATING_CONTRACT,
  LEEWAY_OPERATING_CONTRACT_ID,
  LEEWAY_OPERATING_CONTRACT_VERSION,
} from '../../packages/protocol/operating-contract.mjs';
import { RelayAdapter } from '../../packages/agent-relay/index.mjs';
import { DesktopAdapter } from './adapter.mjs';
import { PhysicalAndroidAdapter, PhysicalAppleAdapter } from '../../operator/physical-adapters.mjs';
import { createC3AdmissionBinding } from '../../operator/c3-admission-binding.mjs';
import { requireTrustedRuntimeComposition } from './runtime-composition.mjs';

function screenResult(value) {
  if (value.ok !== true) return null;
  const capture = value.result;
  const fail = () => ({ isError: true, content: [{ type: 'text', text: JSON.stringify({ ok: false, error: 'INVALID_SCREEN_IMAGE', receipt: value.receipt }) }] });
  if (!capture || capture.ok !== true || !['image/jpeg', 'image/png'].includes(capture.mimeType)
    || typeof capture.base64 !== 'string' || capture.base64.length === 0 || capture.base64.length > 8 * 1024 * 1024
    || capture.base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(capture.base64)
    || !Number.isInteger(capture.width) || capture.width < 1 || capture.width > 32768
    || !Number.isInteger(capture.height) || capture.height < 1 || capture.height > 32768) return fail();
  const bytes = Buffer.from(capture.base64, 'base64');
  if (bytes.toString('base64') !== capture.base64) return fail();
  const magicMatches = capture.mimeType === 'image/jpeg'
    ? bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9
    : bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (!magicMatches) return fail();
  // The existing receipt binds the complete adapter result including image bytes.
  // Only safe image metadata enters text; the native image is sent exactly once.
  return { content: [
    { type: 'text', text: JSON.stringify({ ok: true, result: { ok: true, mimeType: capture.mimeType, width: capture.width, height: capture.height }, receipt: value.receipt }) },
    { type: 'image', mimeType: capture.mimeType, data: capture.base64 },
  ] };
}

function visionFrameResult(value) {
  if (value.ok !== true) return null;
  const frame = value.result?.frame;
  if (!frame || frame.image === undefined || frame.image === null) return null;
  const capture = frame.image;
  const fail = () => ({ isError: true, content: [{ type: 'text', text: JSON.stringify({ ok: false, error: 'INVALID_VISION_IMAGE', receipt: value.receipt }) }] });
  if (!capture || typeof capture !== 'object' || !['image/jpeg', 'image/png'].includes(capture.mimeType)
    || typeof capture.base64 !== 'string' || capture.base64.length === 0 || capture.base64.length > 8 * 1024 * 1024
    || capture.base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(capture.base64)
    || !Number.isInteger(capture.width) || capture.width < 1 || capture.width > 32768
    || !Number.isInteger(capture.height) || capture.height < 1 || capture.height > 32768
    || typeof capture.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(capture.sha256)) return fail();
  const bytes = Buffer.from(capture.base64, 'base64');
  if (bytes.length === 0 || bytes.length > 8 * 1024 * 1024 || bytes.toString('base64') !== capture.base64) return fail();
  const magicMatches = capture.mimeType === 'image/jpeg'
    ? bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9
    : bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (!magicMatches || createHash('sha256').update(bytes).digest('hex') !== capture.sha256) return fail();
  const safeFrame = { ...frame, image: {
    mimeType: capture.mimeType, width: capture.width, height: capture.height, sha256: capture.sha256,
  } };
  return { content: [
    { type: 'text', text: JSON.stringify({ ok: true, result: { ...value.result, frame: safeFrame }, receipt: value.receipt }) },
    { type: 'image', mimeType: capture.mimeType, data: capture.base64 },
  ] };
}

export function createServer(bridge, { discoveryOnly = false, readOnlyCapabilities = [], complianceCardProvider = null, visionClientId = null } = {}) {
  const boundVisionClientId = typeof visionClientId === 'string' && visionClientId.trim() && visionClientId.length <= 128 ? visionClientId : null;
  const server = new McpServer({ name: 'leeway-device-bridge', version: '0.1.0' }, {
    instructions: LEEWAY_MCP_INSTRUCTIONS,
  });
  const result = value => ({ content: [{ type: 'text', text: JSON.stringify(value) }], ...(value.ok === false ? { isError: true } : {}) });
  server.registerTool('leeway_operating_contract', {
    title: 'LeeWay agent operating contract',
    description: 'Read the versioned LeeWay engineering-loop and evidence contract delivered in MCP initialize instructions. Guidance does not grant capability or replace Runtime admission.',
    inputSchema: {},
  }, async () => result({
    contractId: LEEWAY_OPERATING_CONTRACT_ID,
    version: LEEWAY_OPERATING_CONTRACT_VERSION,
    source: 'LEEWAY_DEVICE_BRIDGE_CANONICAL_PROTOCOL',
    enforcementBoundary: 'CLIENT_GUIDANCE_AND_EXISTING_RUNTIME_ADMISSION',
    contract: LEEWAY_OPERATING_CONTRACT,
  }));
  server.registerTool('bridge_devices', { description: 'List configured device IDs. Configuration does not prove connectivity.', inputSchema: {} }, async () => result({ devices: [...bridge.devices.keys()] }));
  server.registerTool('bridge_capabilities', { description: 'Discover current capabilities for one device; grants and verification are distinct.', inputSchema: { deviceId: z.string().min(1).max(128) } }, async ({ deviceId }) => {
    try { return result(await bridge.discover(deviceId)); } catch { return result({ ok: false, error: 'DISCOVERY_FAILED' }); }
  });
  // Never advertise agent-facing optical operations without an identity supplied by trusted Runtime or authenticated MCP ingress.
  const selectedCapabilities = discoveryOnly ? [...new Set(readOnlyCapabilities)] :
    Object.keys(schemas).filter(name => !name.startsWith('vision.') || boundVisionClientId !== null);
  for (const capability of selectedCapabilities) {
    const schema = schemas[capability];
    if (!schema || (discoveryOnly && !['device.health', 'device.info', 'device.directories.list', 'device.files.read', 'model.hub.catalog'].includes(capability)))
      throw new Error('DISCOVERY_READ_ONLY_CAPABILITY_DENIED');
    server.registerTool(capability.replaceAll('.', '_'), {
      description: `Invoke ${capability} on an explicitly granted device. Availability is checked for each call; unsupported platforms fail closed.`,
      inputSchema: {
        deviceId: z.string().min(1).max(128),
        ...(bridge.requiresComplianceCard && typeof complianceCardProvider !== 'function'
          ? { complianceCard: z.object({}).passthrough() }
          : {}),
        arguments: schema,
      },
    }, async ({ deviceId, arguments: args, complianceCard }) => {
      if (capability.startsWith('vision.') && args.clientId !== boundVisionClientId) {
        return result({ ok: false, error: 'VISION_PRINCIPAL_MISMATCH', operationMayHaveExecuted: false });
      }
      let effectiveComplianceCard = complianceCard;
      if (!effectiveComplianceCard && typeof complianceCardProvider === 'function') {
        try { effectiveComplianceCard = await complianceCardProvider({ deviceId, capability, args }); }
        catch { return result({ ok: false, error: 'COMPLIANCE_CARD_PROVIDER_FAILED', operationMayHaveExecuted: false }); }
      }
      const value = await bridge.call(deviceId, capability, args, { complianceCard: effectiveComplianceCard });
      if (capability === 'device.screen.capture') return screenResult(value) || result(value);
      if (capability === 'vision.frames.observe') return visionFrameResult(value) || result(value);
      return result(value);
    });
  }
  return server;
}

const deviceSchema = z.object({
  id: z.string().min(1).max(128), type: z.enum(['desktop', 'relay', 'physical-android', 'physical-apple']),
  grants: z.array(z.enum(Object.keys(schemas))).max(Object.keys(schemas).length),
  // Platform names are resolved against the owner-controlled adapter registry.
  // Do not bake a finite OS list or an implicit desktop default into this contract.
  platform: z.string().min(1).max(64).optional(),
  workspace: z.string().optional(), skillsRoot: z.string().max(2048).optional(), voiceEndpoint: z.string().url().optional(), tokenEnv: z.string().regex(/^[A-Z][A-Z0-9_]*$/).optional(),
  url: z.string().url().optional(),
  // Explicit owner-enrolled USB identity; never rely on a built-in device serial default.
  serial: z.string().regex(/^[A-Za-z0-9._:-]{4,128}$/).optional(),
  hardwareId: z.string().regex(/^[0-9a-fA-F]{16,64}$/).optional(),
}).strict().superRefine((device, context) => {
  const invalid = (message) => context.addIssue({ code: 'custom', message });
  if (device.type === 'physical-android') {
    if (device.platform !== 'android' || !device.serial || device.hardwareId || device.url || device.workspace || device.tokenEnv) invalid('ANDROID_USB_EXPLICIT_IDENTITY_REQUIRED');
  } else if (device.type === 'physical-apple') {
    if (device.platform !== 'ios' || !device.hardwareId || device.serial || device.url || device.workspace || device.tokenEnv) invalid('APPLE_USB_EXPLICIT_IDENTITY_REQUIRED');
  } else if (device.serial || device.hardwareId) {
    invalid('PHYSICAL_USB_FIELDS_NOT_ALLOWED');
  }
});

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

export async function createConfiguredBridge(configPath, runtimeInput = null) {
  if (!configPath) throw new Error('CONFIG_REQUIRED');
  const runtimeComposition = runtimeInput === null ? null : requireTrustedRuntimeComposition(runtimeInput);
  const config = z.object({ devices: z.array(deviceSchema).min(1).max(32), receipts: z.string().min(1).optional() }).strict().parse(JSON.parse(await fs.readFile(configPath, 'utf8')));
  const base = path.dirname(path.resolve(configPath));
  const receiptPath = config.receipts ? path.resolve(base, config.receipts) : null;
  if (!runtimeComposition && !receiptPath) throw new Error('RECEIPTS_REQUIRED');
  const visionProviders = runtimeComposition?.visionProviders ?? new Map();
  for (const deviceId of visionProviders.keys()) {
    if (!config.devices.some(device => device.id === deviceId && device.type === 'desktop')) {
      throw new Error('TRUSTED_VISION_PROVIDER_DEVICE_NOT_CONFIGURED');
    }
  }
  const devices = config.devices.map(d => {
    let adapter;
    if (d.type === 'desktop') {
      adapter = new DesktopAdapter(d.workspace ? path.resolve(base, d.workspace) : (() => { throw new Error('WORKSPACE_REQUIRED'); })(), {
        skillsRoot: d.skillsRoot ? path.resolve(base, d.skillsRoot) : null,
        voiceEndpoint: d.voiceEndpoint || null, receiptPath, visionProvider: visionProviders.get(d.id) ?? null
      });
    } else if (d.type === 'physical-android') {
      adapter = new PhysicalAndroidAdapter({ serial: d.serial });
    } else if (d.type === 'physical-apple') {
      adapter = new PhysicalAppleAdapter({ deviceId: d.hardwareId });
    } else {
      adapter = new RelayAdapter({ deviceId: d.id, url: d.url, token: d.tokenEnv ? process.env[d.tokenEnv] : undefined });
    }
    return { ...d, adapter };
  });
  if (receiptPath) await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  const admission = runtimeComposition?.mode === 'direct'
    ? runtimeComposition.admission
    : createProductionAdmission(devices, runtimeComposition ?? {});
  const bridge = new Bridge(devices, {
    // Without an injected Runtime composition, C3 deliberately denies all execution.
    admission,
    complianceCardGate: runtimeComposition?.complianceCardGate ?? null,
    receiptSink: runtimeComposition?.receiptSink ?? (evidence => fs.appendFile(receiptPath, JSON.stringify(evidence) + '\n', { mode: 0o600 })),
  });
  return bridge;
}

export async function start(configPath, runtimeInput = null) {
  const bridge = await createConfiguredBridge(configPath, runtimeInput);
  const runtimeComposition = runtimeInput === null ? null : requireTrustedRuntimeComposition(runtimeInput);
  const server = createServer(bridge, {
    complianceCardProvider: runtimeComposition?.complianceCardProvider ?? null,
    visionClientId: runtimeComposition?.visionClientId ?? null
  });
  await server.connect(new StdioServerTransport());
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  start(process.argv[2]).catch(() => { console.error('Device Bridge MCP startup failed; check configuration and credential environment.'); process.exitCode = 1; });
}

