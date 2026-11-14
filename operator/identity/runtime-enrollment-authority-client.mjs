/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.RUNTIME.ENROLLMENT.CLIENT
TAG: LEEWAY.RUNTIME.ENROLLMENT.AUTHORITY.CLIENT.V1
WHAT: Exact-origin client adapter for the canonical Runtime enrollment API.
WHY: Native Device Bridge enrollment must use Runtime authority rather than a
     local JSON file, a relay room, or a source-controlled static grant.
HOW: Discover endpoint -> bearer/DPoP provider -> bounded JSON requests.
AUTHORITY: Client only. It cannot mint challenges, approve owners, or persist records.
*/

function approvedBaseUrl(baseUrl, approvedRuntimeOrigin) {
  let base;
  let approved;
  try { base = new URL(baseUrl); approved = new URL(approvedRuntimeOrigin); }
  catch { throw new Error('RUNTIME_ENROLLMENT_URL_INVALID'); }
  if (base.origin !== approved.origin || approvedRuntimeOrigin !== approved.origin ||
      !['https:', 'http:'].includes(base.protocol) ||
      (base.protocol === 'http:' && !['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname))) {
    throw new Error('RUNTIME_ENROLLMENT_ORIGIN_UNAPPROVED');
  }
  return base;
}

async function boundedJson(response) {
  if (!response.ok) throw new Error(`RUNTIME_ENROLLMENT_HTTP_${response.status}`);
  const text = await response.text();
  if (text.length > 128 * 1024) throw new Error('RUNTIME_ENROLLMENT_RESPONSE_TOO_LARGE');
  try { return JSON.parse(text); } catch { throw new Error('RUNTIME_ENROLLMENT_RESPONSE_INVALID'); }
}

export function createRuntimeEnrollmentAuthorityClient({ baseUrl, approvedRuntimeOrigin, accessTokenProvider, dpopProofProvider = null, fetchImpl = globalThis.fetch } = {}) {
  const base = approvedBaseUrl(baseUrl, approvedRuntimeOrigin);
  if (!accessTokenProvider || typeof accessTokenProvider.getAccessToken !== 'function' || typeof fetchImpl !== 'function') {
    throw new Error('RUNTIME_ENROLLMENT_AUTH_PROVIDER_REQUIRED');
  }

  async function request(path, body) {
    const token = await accessTokenProvider.getAccessToken();
    if (typeof token !== 'string' || token.length < 16) throw new Error('RUNTIME_ENROLLMENT_ACCESS_TOKEN_REQUIRED');
    const url = new URL(path, base);
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json' };
    if (dpopProofProvider) {
      if (typeof dpopProofProvider.createProof !== 'function') throw new Error('RUNTIME_ENROLLMENT_DPOP_PROVIDER_INVALID');
      const proof = await dpopProofProvider.createProof({ method: 'POST', url: url.toString(), accessToken: token });
      if (typeof proof !== 'string' || proof.length < 16) throw new Error('RUNTIME_ENROLLMENT_DPOP_PROOF_REQUIRED');
      headers.dpop = proof;
    }
    return boundedJson(await fetchImpl(url, { method: 'POST', headers, body: JSON.stringify(body) }));
  }

  return Object.freeze({
    beginEnrollment(requestBody) { return request('/v1/device-enrollments', requestBody); },
    completeEnrollment({ enrollmentId, deviceProof, ownerProof }) {
      if (typeof enrollmentId !== 'string' || !/^[A-Za-z0-9._-]{3,128}$/.test(enrollmentId)) throw new Error('RUNTIME_ENROLLMENT_ID_INVALID');
      return request(`/v1/device-enrollments/${encodeURIComponent(enrollmentId)}/complete`, { deviceProof, ownerProof });
    },
  });
}
