import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { Bridge, schemas } from '../../packages/protocol/index.mjs';
import { RelayAdapter } from '../../packages/agent-relay/index.mjs';
import { DesktopAdapter } from './adapter.mjs';

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

export function createServer(bridge) {
  const server = new McpServer({ name: 'leeway-device-bridge', version: '0.1.0' });
  const result = value => ({ content: [{ type: 'text', text: JSON.stringify(value) }], ...(value.ok === false ? { isError: true } : {}) });
  server.registerTool('bridge_devices', { description: 'List configured device IDs. Configuration does not prove connectivity.', inputSchema: {} }, async () => result({ devices: [...bridge.devices.keys()] }));
  server.registerTool('bridge_capabilities', { description: 'Discover current capabilities for one device; grants and verification are distinct.', inputSchema: { deviceId: z.string().min(1).max(128) } }, async ({ deviceId }) => {
    try { return result(await bridge.discover(deviceId)); } catch { return result({ ok: false, error: 'DISCOVERY_FAILED' }); }
  });
  for (const [capability, schema] of Object.entries(schemas)) {
    server.registerTool(capability.replaceAll('.', '_'), {
      description: `Invoke ${capability} on an explicitly granted device. Availability is checked for each call; unsupported platforms fail closed.`,
      inputSchema: { deviceId: z.string().min(1).max(128), arguments: schema },
    }, async ({ deviceId, arguments: args }) => {
      const value = await bridge.call(deviceId, capability, args);
      return capability === 'device.screen.capture' ? screenResult(value) || result(value) : result(value);
    });
  }
  return server;
}

const deviceSchema = z.object({
  id: z.string().min(1).max(128), type: z.enum(['desktop', 'relay']),
  grants: z.array(z.enum(Object.keys(schemas))).max(Object.keys(schemas).length),
  workspace: z.string().optional(), tokenEnv: z.string().regex(/^[A-Z][A-Z0-9_]*$/).optional(),
  url: z.string().url().optional(),
}).strict();

export async function start(configPath) {
  if (!configPath) throw new Error('CONFIG_REQUIRED');
  const config = z.object({ devices: z.array(deviceSchema).min(1).max(32), receipts: z.string().min(1) }).strict().parse(JSON.parse(await fs.readFile(configPath, 'utf8')));
  const base = path.dirname(path.resolve(configPath));
  const devices = config.devices.map(d => ({ ...d, adapter: d.type === 'desktop'
    ? new DesktopAdapter(d.workspace ? path.resolve(base, d.workspace) : (() => { throw new Error('WORKSPACE_REQUIRED'); })())
    : new RelayAdapter({ deviceId: d.id, url: d.url, token: d.tokenEnv ? process.env[d.tokenEnv] : undefined }) }));
  const receiptPath = path.resolve(base, config.receipts);
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  const bridge = new Bridge(devices, {
    // This explicit config policy is not a canonical Formula or Veritas evaluation.
    admission: async () => true,
    receiptSink: evidence => fs.appendFile(receiptPath, JSON.stringify(evidence) + '\n', { mode: 0o600 }),
  });
  const server = createServer(bridge);
  await server.connect(new StdioServerTransport());
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  start(process.argv[2]).catch(() => { console.error('Device Bridge MCP startup failed; check configuration and credential environment.'); process.exitCode = 1; });
}
