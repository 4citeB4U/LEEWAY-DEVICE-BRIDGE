/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.RUNTIME.AUTHORITY
TAG: LEEWAY.RUNTIME.COMPLIANCE.CARD.HTTP.GATE
WHAT: Validate a supplied compliance card through the authoritative Runtime Fabric.
WHY: Device Bridge must not reconstruct or locally bless execution authority.
HOW: Explicit host callback -> Runtime Fabric validation route -> digest equality.
AUTHORITY: Runtime Fabric response is accepted only when it validates the supplied card unchanged.
*/

import { digest } from '../packages/protocol/index.mjs';

function runtimeValidationUrl(baseUrl) {
  if (typeof baseUrl !== 'string' || baseUrl.trim() === '') throw new Error('RUNTIME_FABRIC_URL_REQUIRED');
  const base = new URL(baseUrl);
  if (!['http:', 'https:'].includes(base.protocol)) throw new Error('RUNTIME_FABRIC_URL_INVALID');
  if (base.protocol === 'http:' && !['127.0.0.1', 'localhost', '[::1]', '::1'].includes(base.hostname)) {
    throw new Error('RUNTIME_FABRIC_HTTP_MUST_BE_LOOPBACK');
  }
  return new URL('/runtime/validate-object-chain', base);
}

export function createRuntimeComplianceCardGate({ baseUrl, fetchImpl = globalThis.fetch, timeoutMs = 5000 } = {}) {
  const url = runtimeValidationUrl(baseUrl);
  if (typeof fetchImpl !== 'function') throw new Error('RUNTIME_FABRIC_FETCH_REQUIRED');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000) throw new Error('RUNTIME_FABRIC_TIMEOUT_INVALID');

  return async ({ complianceCard }) => {
    if (!complianceCard || typeof complianceCard !== 'object' || Array.isArray(complianceCard)) return false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, {
        method: 'POST',
        redirect: 'error',
        signal: controller.signal,
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ leewayComplianceCard: complianceCard }),
      });
      if (!response.ok) return false;
      const body = await response.json();
      if (body?.valid !== true || !body.card || digest(body.card) !== digest(complianceCard)) return false;
      return { valid: true, cardHash: digest(complianceCard), authority: 'LEEWAY_RUNTIME_FABRIC' };
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  };
}
