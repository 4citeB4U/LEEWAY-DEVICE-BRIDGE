import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const binary = path.join(root, 'target', 'release', process.platform === 'win32' ? 'leeway-core.exe' : 'leeway-core');

function assertLaunched(result) {
  assert.equal(result.error, undefined, result.error?.message);
}

test('release core projects exact input into a deterministic bounded 16x16 matrix', () => {
  const input = Buffer.alloc(4096);
  for (let index = 0; index < input.length; index += 1) input[index] = index % 251;
  const first = spawnSync(binary, ['continuum-project'], { input, encoding: 'utf8' });
  const second = spawnSync(binary, ['continuum-project'], { input, encoding: 'utf8' });
  assertLaunched(first);
  assertLaunched(second);
  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  const projection = JSON.parse(first.stdout);
  assert.deepEqual(projection, JSON.parse(second.stdout));
  assert.equal(projection.rows, 16);
  assert.equal(projection.columns, 16);
  assert.equal(projection.values.length, 256);
  assert.equal(projection.sourceBytes, input.length);
  assert.equal(projection.losslessReconstruction, false);
  assert.match(projection.sourceSha256, /^[a-f0-9]{64}$/);
  assert.match(projection.projectionSha256, /^[a-f0-9]{64}$/);
});

test('release core rejects projection input above the eight MiB contract', () => {
  const input = Buffer.alloc(8 * 1024 * 1024 + 1, 7);
  const result = spawnSync(binary, ['continuum-project'], { input, encoding: 'utf8', maxBuffer: 1024 * 1024 });
  assertLaunched(result);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /CONTINUUM_PROJECTION_INPUT_LIMIT_EXCEEDED/);
});

test('release core emits a reversible 256-byte custody stream', () => {
  const input = Buffer.alloc(257);
  for (let index = 0; index < input.length; index += 1) input[index] = index % 251;
  const result = spawnSync(binary, ['continuum-block-encode'], { input, encoding: 'utf8' });
  assertLaunched(result);
  assert.equal(result.status, 0, result.stderr);
  const encoded = JSON.parse(result.stdout);
  assert.equal(encoded.manifest.codec, 'IDENTITY_256_V1');
  assert.equal(encoded.manifest.originalBytes, 257);
  assert.equal(encoded.manifest.blockCount, 2);
  assert.equal(encoded.blocks[0].validBytes, 256);
  assert.equal(encoded.blocks[1].validBytes, 1);
  assert.equal(encoded.blocks[0].bytes.length, 256);
  assert.equal(encoded.blocks[1].bytes.length, 256);
  const decoded = spawnSync(binary, ['continuum-block-decode'], {
    input: JSON.stringify(encoded),
    encoding: null,
  });
  assertLaunched(decoded);
  assert.equal(decoded.status, 0, decoded.stderr?.toString());
  assert.deepEqual(decoded.stdout, input);

  encoded.blocks[0].bytes[0] ^= 1;
  const tampered = spawnSync(binary, ['continuum-block-decode'], {
    input: JSON.stringify(encoded),
    encoding: 'utf8',
  });
  assertLaunched(tampered);
  assert.notEqual(tampered.status, 0);
  assert.match(tampered.stderr, /CONTINUUM_CODEC_MANIFEST_INVALID/);
});
