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

function buildCard({ manifest, agentId, deviceId, capability, args, id }) {
  if (!manifest || typeof manifest !== 'object' || !Array.isArray(manifest.requiredComplianceCardFields) ||
      !manifest.rootObjectId || !manifest.receiptRoot || !Array.isArray(manifest.actionTypes)) {
    throw new Error('RUNTIME_ENFORCEMENT_MANIFEST_INVALID');
  }
  const binding = classify(capability);
  const policy = manifest.channels?.[binding.channel];
  if (!policy || !manifest.actionTypes.includes(binding.action)) throw new Error('RUNTIME_CARD_POLICY_UNBOUND');
  const safeDevice = String(deviceId).replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 48) || 'device';
  const safeCapability = String(capability).replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 48) || 'operation';
  const taskId = `bridge-${safeDevice}-${safeCapability}-${id}`;
  const relativeReceipt = `${String(manifest.receiptRoot).replace(/\\/g, '/').replace(/\/$/, '')}/${taskId}.json`;
  const destructive = /(?:\.delete|\.terminate|\.unload|\.move)$/.test(capability);
  const active = /(?:\.write|\.input|\.invoke|\.speak|\.execute|\.start|\.stop|\.create|\.activate)$/.test(capability);
  const card = {
    agentId,
    taskId,
    action: binding.action,
    reason: `LeeWay Device Bridge operation ${capability} for device ${safeDevice}`,
    rootObjectId: manifest.rootObjectId,
    channelObjectId: binding.channel,
    sourceObjectId: binding.source,
    governancePolicy: policy.governancePolicy,
    telemetryKey: policy.telemetryKey,
    verificationMode: policy.verificationMode,
    proofCommand: `device-bridge ${capability} Runtime validation`,
    receiptPath: relativeReceipt,
    riskLevel: destructive ? 'HIGH' : active ? 'MEDIUM' : 'LOW',
    failureMode: 'FAIL_CLOSED',
    metadata: { deviceId: safeDevice, capability, argumentsSha256: digest(args) },
  };
  if (manifest.requiredComplianceCardFields.some(field => typeof card[field] !== 'string' || !card[field].trim())) {
    throw new Error('RUNTIME_CARD_REQUIRED_FIELDS_UNBOUND');
  }
  return card;
}

export function createRuntimeComplianceCardIntegration({
  baseUrl, manifest, agentId = 'Codex', fetchImpl = globalThis.fetch, timeoutMs = 5000,
  idFactory = randomUUID,
} = {}) {
  if (typeof baseUrl !== 'string' || !baseUrl.trim()) throw new Error('RUNTIME_FABRIC_URL_REQUIRED');
  const base = new URL(baseUrl);
  if (!['http:', 'https:'].includes(base.protocol) ||
      (base.protocol === 'http:' && !['127.0.0.1', 'localhost', '[::1]', '::1'].includes(base.hostname))) {
    throw new Error('RUNTIME_FABRIC_URL_INVALID');
  }
  if (typeof fetchImpl !== 'function' || !Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000) {
    throw new Error('RUNTIME_CARD_CLIENT_INVALID');
  }
  if (typeof agentId !== 'string' || !agentId.trim()) throw new Error('RUNTIME_CARD_AGENT_REQUIRED');
  const validationUrl = new URL('/runtime/validate-object-chain', base);

  const complianceCardProvider = async ({ deviceId, capability, args }) => {
    if (typeof deviceId !== 'string' || typeof capability !== 'string' || !args || typeof args !== 'object') {
      throw new Error('RUNTIME_CARD_OPERATION_CONTEXT_INVALID');
    }
    return buildCard({ manifest, agentId, deviceId, capability, args, id: idFactory() });
  };

  const complianceCardGate = async ({ complianceCard }) => {
    if (!complianceCard || typeof complianceCard !== 'object' || Array.isArray(complianceCard)) return false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(validationUrl, {
        method: 'POST', redirect: 'error', signal: controller.signal,
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ leewayComplianceCard: complianceCard }),
      });
      if (!response.ok) return false;
      const body = await response.json();
      if (body?.valid !== true || !body.card || digest(body.card) !== digest(complianceCard)) return false;
      return { valid: true, cardHash: digest(complianceCard), authority: 'LEEWAY_RUNTIME_FABRIC' };
    } catch { return false; }
    finally { clearTimeout(timer); }
  };

  return Object.freeze({ complianceCardProvider, complianceCardGate });
}
