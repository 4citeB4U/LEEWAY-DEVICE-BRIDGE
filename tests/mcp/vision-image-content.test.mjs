/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.MCP.VISION
TAG: LEEWAY.VISION.NATIVE_IMAGE_CONTENT_TEST
5WH:
  WHAT = Verify native MCP image content for an authorized Vision observation
  WHY = Preserve image bytes for the model while keeping base64 out of text and rejecting tampering
  WHO = LeeWay Device Bridge production qualification
  WHERE = tests/mcp/vision-image-content.test.mjs
  WHEN = 2026-11-07
  HOW = Real MCP client over the SDK in-memory transport and canonical Bridge receipts
LICENSE: Internal LeeWay governance.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Bridge, digest } from '../../packages/protocol/index.mjs';
import { createServer } from '../../apps/desktop/mcp-server.mjs';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
const validImage = {
  mimeType: 'image/jpeg', base64: jpeg.toString('base64'), width: 1, height: 1,
  sha256: createHash('sha256').update(jpeg).digest('hex'),
};

test('MCP Vision observation emits native image content once and rejects invalid bytes', async t => {
  let frame = { sessionId: 'session-1', frameNumber: 2, image: validImage };
  const bridge = new Bridge([{
    id: 'pc-primary', grants: ['vision.frames.observe'], adapter: {
      discover: async () => ['vision.frames.observe'],
      execute: async () => ({ ok: true, route: 'vision.frames.observe', frame }),
    },
  }], { admission: async () => true, receiptSink: async () => {} });
  const server = createServer(bridge, { visionClientId: 'model-image' });
  const client = new Client({ name: 'vision-image-test', version: '1' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  t.after(async () => { await client.close(); await server.close(); });

  const call = () => client.callTool({ name: 'vision_frames_observe', arguments: {
    deviceId: 'pc-primary', arguments: { clientId: 'model-image', sessionId: 'session-1' },
  } });
  const result = await call();
  assert.equal(result.isError, undefined);
  assert.equal(result.content.length, 2);
  assert.deepEqual(result.content[1], { type: 'image', mimeType: 'image/jpeg', data: validImage.base64 });
  assert.ok(!result.content[0].text.includes(validImage.base64));
  const text = JSON.parse(result.content[0].text);
  assert.equal(text.result.frame.image.sha256, validImage.sha256);
  assert.equal(text.receipt.resultHash, digest({ ok: true, route: 'vision.frames.observe', frame }));

  frame = { ...frame, image: { ...validImage, sha256: '0'.repeat(64) } };
  const bad = await call();
  assert.equal(bad.isError, true);
  assert.equal(bad.content.length, 1);
  const failure = JSON.parse(bad.content[0].text);
  assert.equal(failure.error, 'INVALID_VISION_IMAGE');
  assert.equal(failure.receipt.resultHash, digest({ ok: true, route: 'vision.frames.observe', frame }));
});

