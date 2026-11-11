/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.RUNTIME.AUTHORITY
TAG: LEEWAY.RUNTIME.COMPLIANCE.CARD.PROVIDER
WHAT: Build a per-operation card from the trusted Runtime enforcement manifest.
WHY: LLM callers must not hand-author or omit compliance cards.
HOW: Host-trusted provider creates a scoped request; Runtime validates it before admission.
AUTHORITY: Runtime manifest and validation endpoint; this module never marks a card valid.
*/
import { randomUUID } from 'node:crypto';
import { digest } from '../packages/protocol/index.mjs';

const CHANNELS = Object.freeze({
  voice: 'LACF.CHANNEL.001.LEEWAY_VOICE',
  data: 'LACF.CHANNEL.003.LEEWAY_DATA',
  gpu: 'LACF.CHANNEL.005.LEEWAY_GPU',
  telemetry: 'LACF.CHANNEL.006.LEEWAY_TELEMETRY',
  governance: 'LACF.CHANNEL.007.LEEWAY_GOVERNANCE',
});

function classify(capability) {
  if (capability === 'voice.status' || capability === 'device.health') {
    return { action: 'service.health', channel: CHANNELS.telemetry, source: 'LACF.UI.003.LEEWAY_FABRIC_OPERATIONS_CONSOLE' };
  }
  if (capability === 'voice.speak') {
    return { action: 'voice.claim', channel: CHANNELS.voice, source: 'LACF.UI.002.LEEWAY_VOICE_CLONE_CONFIGURATION' };
  }
  if (capability.startsWith('gpu.') || capability.startsWith('model.inference')) {
    return { action: 'gpu.claim', channel: CHANNELS.gpu, source: 'LACF.UI.003.LEEWAY_FABRIC_OPERATIONS_CONSOLE' };
  }
  if (capability.startsWith('device.files.')) {
    return { action: 'tool.execution', channel: CHANNELS.data, source: 'LACF.UI.003.LEEWAY_FABRIC_OPERATIONS_CONSOLE' };
  }
  return { action: 'tool.execution', channel: CHANNELS.governance, source: 'LACF.UI.003.LEEWAY_FABRIC_OPERATIONS_CONSOLE' };
}

function riskForCapability(capability) {
  const destructive = /(?:\.delete|\.terminate|\.unload|\.move)$/.test(capability);
  const active = /(?:\.write|\.input|\.invoke|\.speak|\.execute|\.start|\.stop|\.create|\.activate)$/.test(capability);
  return destructive ? 'HIGH' : active ? 'MEDIUM' : 'LOW';
}

function resolveApprovedValidationUrl(baseUrl, approvedRuntimeOrigin) {
  if (typeof baseUrl !== 'string' || !baseUrl.trim() || baseUrl !== baseUrl.trim() ||
      typeof approvedRuntimeOrigin !== 'string' || !approvedRuntimeOrigin.trim() ||
      approvedRuntimeOrigin !== approvedRuntimeOrigin.trim()) {
    throw new Error('RUNTIME_FABRIC_ORIGIN_NOT_APPROVED');
  }

  let base;
  let approved;
  try {
    base = new URL(baseUrl);
    approved = new URL(approvedRuntimeOrigin);
  } catch {
    throw new Error('RUNTIME_FABRIC_URL_INVALID');
  }

  const isUnambiguousOrigin = (url) =>
    !url.username && !url.password && !url.search && !url.hash && url.pathname === '/';
  if (!isUnambiguousOrigin(base) || !isUnambiguousOrigin(approved) ||
      approvedRuntimeOrigin !== approved.origin || base.origin !== approved.origin) {
    throw new Error('RUNTIME_FABRIC_ORIGIN_NOT_APPROVED');
  }
  if (!['http:', 'https:'].includes(base.protocol) ||
      (base.protocol === 'http:' && !['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname))) {
    throw new Error('RUNTIME_FABRIC_URL_INVALID');
  }
  return new URL('/runtime/validate-object-chain', base);
}

function buildCard({ manifest, agentId, deviceId, capability, args, id }) {
  if (!manifest || typeof manifest !== 'object' || !Array.isArray(manifest.requiredComplianceCardFields) ||
      !manifest.rootObjectId || !manifest.receiptRoot || !Array.isArray(manifest.actionTypes)) {
    throw new Error('RUNTIME_ENFORCEMENT_MANIFEST_INVALID');
  }
  const binding = classify(capability);
  const policy = manifest.channels?.[binding.channel];
  if (!policy || !manifest.actionTypes.includes(binding.action)) throw new Error('RUNTIME_CARD_POLICY_UNBOUND');
  if (typeof deviceId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(deviceId)) {
    throw new Error('RUNTIME_CARD_DEVICE_ID_INVALID');
  }
  if (typeof capability !== 'string' || !/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(capability)) {
    throw new Error('RUNTIME_CARD_CAPABILITY_INVALID');
  }
  if (typeof id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9-]{0,127}$/.test(id)) {
    throw new Error('RUNTIME_CARD_ID_INVALID');
  }
  const taskId = `bridge-${id}`;
  const receiptSuffix = `-${id}.json`;
  const maxReceiptPrefixLength = 240 - receiptSuffix.length;
  const safeReceiptPrefix = `${deviceId}-${capability}`
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .slice(0, maxReceiptPrefixLength);
  const safeReceiptName = `${safeReceiptPrefix}${receiptSuffix}`;
  const receiptRoot = String(manifest.receiptRoot).replace(/\\/g, '/').replace(/\/$/, '');
  const card = {
    agentId,
    taskId,
    action: binding.action,
    reason: `LeeWay Device Bridge operation ${capability} for device ${deviceId}`,
    rootObjectId: manifest.rootObjectId,
    channelObjectId: binding.channel,
    sourceObjectId: binding.source,
    governancePolicy: policy.governancePolicy,
    telemetryKey: policy.telemetryKey,
    verificationMode: policy.verificationMode,
    proofCommand: `device-bridge ${capability} Runtime validation`,
    receiptPath: `${receiptRoot}/${safeReceiptName}`,
    riskLevel: riskForCapability(capability),
    failureMode: 'FAIL_CLOSED',
    metadata: {
      schema: 'leeway.runtime.operation-context.v1',
      deviceId,
      capability,
      argumentsSha256: digest(args)
    },
  };
  if (manifest.requiredComplianceCardFields.some(field => typeof card[field] !== 'string' || !card[field].trim())) {
    throw new Error('RUNTIME_CARD_REQUIRED_FIELDS_UNBOUND');
  }
  return card;
}

export function createRuntimeComplianceCardIntegration({
  baseUrl, approvedRuntimeOrigin, manifest, controlToken, agentId = 'Codex', fetchImpl = globalThis.fetch, timeoutMs = 5000,
  idFactory = randomUUID,
} = {}) {
  // The host supplies this allowlisted origin explicitly; operation input cannot select it.
  const validationUrl = resolveApprovedValidationUrl(baseUrl, approvedRuntimeOrigin);
  if (typeof fetchImpl !== 'function' || !Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000) {
    throw new Error('RUNTIME_CARD_CLIENT_INVALID');
  }
  if (typeof agentId !== 'string' || !agentId.trim()) throw new Error('RUNTIME_CARD_AGENT_REQUIRED');
  // The host injects this binding; task and card data must never supply it.
  if (typeof controlToken !== 'string' || !controlToken.trim()) throw new Error('RUNTIME_CONTROL_TOKEN_REQUIRED');

  const complianceCardProvider = async ({ deviceId, capability, args }) => {
    if (typeof deviceId !== 'string' || typeof capability !== 'string' || !args || typeof args !== 'object') {
      throw new Error('RUNTIME_CARD_OPERATION_CONTEXT_INVALID');
    }
    return buildCard({ manifest, agentId, deviceId, capability, args, id: idFactory() });
  };

  const complianceCardGate = async ({ complianceCard, deviceId, capability, args }) => {
    if (!complianceCard || typeof complianceCard !== 'object' || Array.isArray(complianceCard) ||
        typeof deviceId !== 'string' || typeof capability !== 'string' ||
        !args || typeof args !== 'object' || Array.isArray(args)) return false;
    const metadata = complianceCard.metadata;
    if (!metadata || metadata.schema !== 'leeway.runtime.operation-context.v1' ||
        metadata.deviceId !== deviceId || metadata.capability !== capability ||
        metadata.argumentsSha256 !== digest(args)) return false;
    const binding = classify(capability);
    const policy = manifest?.channels?.[binding.channel];
    if (!policy || !Array.isArray(manifest?.actionTypes) ||
        !manifest.actionTypes.includes(binding.action) ||
        complianceCard.action !== binding.action ||
        complianceCard.channelObjectId !== binding.channel ||
        complianceCard.sourceObjectId !== binding.source ||
        complianceCard.governancePolicy !== policy.governancePolicy ||
        complianceCard.telemetryKey !== policy.telemetryKey ||
        complianceCard.verificationMode !== policy.verificationMode ||
        complianceCard.riskLevel !== riskForCapability(capability)) return false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(validationUrl, {
        method: 'POST', redirect: 'error', signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          authorization: 'Bearer '.concat(controlToken)
        },
        body: JSON.stringify({ leewayComplianceCard: complianceCard }),
      });
      if (response?.status !== 200) return false;
      const body = await response.json();
      if (body?.valid !== true || !body.card || digest(body.card) !== digest(complianceCard)) return false;
      return { valid: true, cardHash: digest(complianceCard), authority: 'LEEWAY_RUNTIME_FABRIC' };
    } catch { return false; }
    finally { clearTimeout(timer); }
  };

  return Object.freeze({ complianceCardProvider, complianceCardGate });
}
