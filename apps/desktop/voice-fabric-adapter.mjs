/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.DESKTOP.VOICE
TAG: LEEWAY.VOICE_FABRIC_EXISTING_CARRIER_ADAPTER_V1
WHAT: Bind the existing local LeeWay Voice Fabric carrier to the existing DesktopAdapter.
WHY: Voice is a canonical capability of the current bridge, not a second authority.
AUTHORITY: LeeWay Voice Fabric only; synthesis is not playback verification.
*/

const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

function fail(code) {
  throw Object.assign(new Error(code), { code });
}

function normalizeEndpoint(value) {
  let url;
  try { url = new URL(String(value || '')); } catch { fail('VOICE_FABRIC_ENDPOINT_INVALID'); }
  if (url.protocol !== 'http:' || !LOOPBACK_HOSTS.has(url.hostname)
    || url.username || url.password || url.search || url.hash) {
    fail('VOICE_FABRIC_LOOPBACK_ENDPOINT_REQUIRED');
  }
  return url.toString().replace(/\/$/, '');
}

async function readJson(response) {
  if (!response.ok) fail(`VOICE_FABRIC_HTTP_${response.status}`);
  const type = response.headers?.get?.('content-type') || '';
  if (!/^application\/json(?:\s*;|$)/i.test(type)) fail('VOICE_FABRIC_JSON_REQUIRED');
  const text = await response.text();
  if (Buffer.byteLength(text, 'utf8') > MAX_RESPONSE_BYTES) fail('VOICE_FABRIC_RESPONSE_TOO_LARGE');
  let value;
  try { value = JSON.parse(text); } catch { fail('VOICE_FABRIC_INVALID_JSON'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('VOICE_FABRIC_RESPONSE_INVALID');
  return value;
}

export class VoiceFabricAdapter {
  constructor(endpoint, { fetchImpl = globalThis.fetch } = {}) {
    this.endpoint = normalizeEndpoint(endpoint);
    this.fetchImpl = fetchImpl;
    if (typeof fetchImpl !== 'function') fail('VOICE_FABRIC_FETCH_UNAVAILABLE');
  }

  async request(pathname, init = {}) {
    let response;
    try {
      response = await this.fetchImpl(new URL(pathname, `${this.endpoint}/`), {
        ...init,
        redirect: 'error',
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      fail('VOICE_FABRIC_UNAVAILABLE');
    }
    return readJson(response);
  }

  async status() {
    const health = await this.request('/health');
    const bindingResponse = await this.request('/voice/binding');
    const binding = bindingResponse.voiceBinding;
    if (binding?.authority !== 'LEEWAY_VOICE_FABRIC') fail('VOICE_FABRIC_AUTHORITY_INVALID');
    return {
      authority: 'LEEWAY_VOICE_FABRIC',
      endpoint: this.endpoint,
      ready: health.voice?.ready === true,
      state: health.voice?.state || 'UNKNOWN',
      provider: binding.provider || health.voice?.provider || null,
      voicePackageId: binding.voicePackageId || health.voice?.voicePackageId || null,
      voiceId: binding.voiceId || health.voice?.voiceId || null,
      canonicalCloneActive: false,
      playbackVerified: false,
    };
  }

  async speak({ text } = {}) {
    if (typeof text !== 'string' || text.length < 1 || text.length > 4096) fail('VOICE_TEXT_INVALID');
    const rendered = await this.request('/render-voice', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (rendered.voiceAuthority !== 'LEEWAY_VOICE_FABRIC'
      || rendered.productionAdmitted !== true
      || typeof rendered.audioContent !== 'string'
      || rendered.audioContent.length < 1
      || rendered.audioContent.length > MAX_RESPONSE_BYTES * 2) {
      fail('VOICE_FABRIC_RENDER_INVALID');
    }
    return {
      authority: 'LEEWAY_VOICE_FABRIC',
      provider: rendered.provider || null,
      voicePackageId: rendered.voicePackageId || null,
      voiceId: rendered.voiceId || null,
      format: rendered.format || null,
      sampleRate: rendered.sampleRate || null,
      audioContent: rendered.audioContent,
      state: rendered.state || 'SYNTHESIZED_NOT_PLAYBACK_VERIFIED',
      playbackVerified: false,
      productionAdmitted: true,
      textHash: rendered.textHash || null,
    };
  }
}
