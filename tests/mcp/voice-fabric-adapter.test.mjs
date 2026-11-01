import test from 'node:test';
import assert from 'node:assert/strict';
import { VoiceFabricAdapter } from '../../apps/desktop/voice-fabric-adapter.mjs';
import { DesktopAdapter } from '../../apps/desktop/adapter.mjs';

function response(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('Voice Fabric is optional and never appears without an explicit endpoint', async () => {
  const adapter = new DesktopAdapter(process.cwd());
  const capabilities = await adapter.discover();
  assert.equal(capabilities.includes('voice.status'), false);
  await assert.rejects(() => adapter.execute('voice.status', {}), error => error.message === 'CAPABILITY_UNAVAILABLE');
});

test('Voice Fabric status requires the canonical authority binding', async () => {
  const calls = [];
  const adapter = new VoiceFabricAdapter('http://127.0.0.1:8890', {
    fetchImpl: async (url) => {
      calls.push(String(url));
      return calls.length === 1
        ? response({ voice: { ready: true, state: 'VOICE_PROVIDER_REPORTED_READY', provider: 'kokoro', voicePackageId: 'kokoro-bm_lewis' } })
        : response({ voiceBinding: { authority: 'LEEWAY_VOICE_FABRIC', provider: 'kokoro', voicePackageId: 'kokoro-bm_lewis', voiceId: 'bm_lewis' } });
    },
  });
  assert.deepEqual(await adapter.status(), {
    authority: 'LEEWAY_VOICE_FABRIC',
    endpoint: 'http://127.0.0.1:8890',
    ready: true,
    state: 'VOICE_PROVIDER_REPORTED_READY',
    provider: 'kokoro',
    voicePackageId: 'kokoro-bm_lewis',
    voiceId: 'bm_lewis',
    canonicalCloneActive: false,
    playbackVerified: false,
  });
  assert.deepEqual(calls, ['http://127.0.0.1:8890/health', 'http://127.0.0.1:8890/voice/binding']);
});

test('Voice Fabric synthesis remains admitted but not playback-verified', async () => {
  let body;
  const adapter = new VoiceFabricAdapter('http://localhost:8890', {
    fetchImpl: async (_url, init) => {
      body = JSON.parse(init.body);
      return response({
        voiceAuthority: 'LEEWAY_VOICE_FABRIC',
        provider: 'kokoro',
        voicePackageId: 'kokoro-bm_lewis',
        voiceId: 'bm_lewis',
        format: 'wav',
        sampleRate: 24000,
        audioContent: 'UklGRg==',
        state: 'SYNTHESIZED_NOT_PLAYBACK_VERIFIED',
        productionAdmitted: true,
        textHash: 'hash',
      });
    },
  });
  const result = await adapter.speak({ text: 'LeeWay verification.' });
  assert.equal(body.text, 'LeeWay verification.');
  assert.equal(result.authority, 'LEEWAY_VOICE_FABRIC');
  assert.equal(result.productionAdmitted, true);
  assert.equal(result.playbackVerified, false);
  assert.equal(result.state, 'SYNTHESIZED_NOT_PLAYBACK_VERIFIED');
});

test('Voice Fabric rejects non-loopback endpoints and invalid authority responses', async () => {
  assert.throws(() => new VoiceFabricAdapter('https://voice.example.test'), { code: 'VOICE_FABRIC_LOOPBACK_ENDPOINT_REQUIRED' });
  const adapter = new VoiceFabricAdapter('http://127.0.0.1:8890', {
    fetchImpl: async () => response({ voice: { ready: true } }),
  });
  await assert.rejects(() => adapter.status(), error => error.code === 'VOICE_FABRIC_AUTHORITY_INVALID');
});
