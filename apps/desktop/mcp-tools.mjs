/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.MCP
TAG: LEEWAY_SHARED_MCP_TOOLS
5WH: WHAT=Shared MCP tools; WHY=One dispatcher across transports; WHO=LeeWay Industries; WHERE=apps/desktop/mcp-tools.mjs; WHEN=2026-10-26; HOW=Existing Bridge calls.
AUTHORIZED_ROLES: Trusted Runtime hosts. LICENSE: MIT
*/
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { schemas } from '../../packages/protocol/index.mjs';

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

