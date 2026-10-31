import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT_OBJECT_ID = 'LACF.ROOT.001.LEEWAY_AGENTIC_COMMUNICATIONS_FABRIC';
export const DEFAULT_CHANNEL_OBJECT_ID = 'LACF.CHANNEL.007.LEEWAY_GOVERNANCE';
export const DEFAULT_SOURCE_OBJECT_ID = 'LACF.UI.003.LEEWAY_FABRIC_OPERATIONS_CONSOLE';
export const DEFAULT_GOVERNANCE_POLICY = 'LEEWAY_L2_GOVERNANCE_ADMISSION_POLICY';
export const DEFAULT_TELEMETRY_KEY = 'L8.LEEWAY.DEVICE_BRIDGE.PULSE';
export const DEFAULT_VERIFICATION_MODE = 'SIGNATURE_REQUIRED';
export const ALLOWED_VERIFICATION_MODES = ['SIGNATURE_REQUIRED', 'DETERMINISTIC_CHECKSUM', 'VOICEPRINT_PROOF', 'GPU_PROOF', 'LIRS_ATTESTED'];

export function buildRuntimeAuth({
  agentId,
  taskId,
  action,
  rootObjectId = ROOT_OBJECT_ID,
  channelObjectId = DEFAULT_CHANNEL_OBJECT_ID,
  sourceObjectId = DEFAULT_SOURCE_OBJECT_ID,
  governancePolicy = DEFAULT_GOVERNANCE_POLICY,
  telemetryKey = DEFAULT_TELEMETRY_KEY,
  verificationMode = DEFAULT_VERIFICATION_MODE,
  reason = 'LEEWAY_L2_ADMITTED_BY_RUNTIME_FABRIC',
} = {}) {
  return {
    agentId: String(agentId || 'leeway-device-bridge-agent'),
    taskId: String(taskId || 'device-bridge-task'),
    action: String(action || 'LEEWAY_DEVICE_BRIDGE_ACTION'),
    rootObjectId: String(rootObjectId || ROOT_OBJECT_ID),
    channelObjectId: String(channelObjectId || DEFAULT_CHANNEL_OBJECT_ID),
    sourceObjectId: String(sourceObjectId || DEFAULT_SOURCE_OBJECT_ID),
    governancePolicy: String(governancePolicy || DEFAULT_GOVERNANCE_POLICY),
    telemetryKey: String(telemetryKey || DEFAULT_TELEMETRY_KEY),
    verificationMode: String(verificationMode || DEFAULT_VERIFICATION_MODE),
    reason: String(reason || 'LEEWAY_L2_ADMITTED_BY_RUNTIME_FABRIC'),
    standard: 'LEEWAY_STANDARD::LEEWAY_AGENTIC_COMMUNICATIONS_FABRIC',
  };
}

export function normalizeRuntimeCard(input) {
  if (!input || typeof input !== 'object') return null;
  if (typeof input.runtimeAuth === 'object' && input.runtimeAuth) return input.runtimeAuth;
  if (typeof input.complianceCard === 'object' && input.complianceCard) return input.complianceCard;
  return input;
}

export function validateRuntimeAuth(runtimeAuth) {
  const card = normalizeRuntimeCard(runtimeAuth) || {};
  const required = ['agentId', 'taskId', 'action', 'rootObjectId', 'channelObjectId', 'sourceObjectId', 'governancePolicy', 'telemetryKey', 'verificationMode'];
  const missing = required.filter((key) => !String(card[key] || '').trim());
  const blockers = [];

  if (!card.rootObjectId || card.rootObjectId !== ROOT_OBJECT_ID) {
    blockers.push(`ROOT_OBJECT_MISMATCH::${card.rootObjectId || 'missing'}`);
  }

  if (!card.channelObjectId || !String(card.channelObjectId).startsWith('LACF.CHANNEL.')) {
    blockers.push(`CHANNEL_OBJECT_INVALID::${card.channelObjectId || 'missing'}`);
  }

  if (!card.sourceObjectId || !String(card.sourceObjectId).startsWith('LACF.')) {
    blockers.push(`SOURCE_OBJECT_INVALID::${card.sourceObjectId || 'missing'}`);
  }

  if (!card.governancePolicy || !String(card.governancePolicy).startsWith('LEEWAY_L')) {
    blockers.push(`GOVERNANCE_POLICY_INVALID::${card.governancePolicy || 'missing'}`);
  }

  if (!card.telemetryKey || !String(card.telemetryKey).startsWith('L')) {
    blockers.push(`TELEMETRY_KEY_INVALID::${card.telemetryKey || 'missing'}`);
  }

  if (!card.verificationMode || !ALLOWED_VERIFICATION_MODES.includes(card.verificationMode)) {
    blockers.push(`VERIFICATION_MODE_INVALID::${card.verificationMode || 'missing'}`);
  }

  const valid = missing.length === 0 && blockers.length === 0;
  return {
    valid,
    status: valid ? 'LEEWAY_RUNTIME_AUTH_PASS' : 'LEEWAY_RUNTIME_AUTH_BLOCKED',
    missing,
    blockers,
    runtimeAuth: {
      agentId: card.agentId,
      taskId: card.taskId,
      action: card.action,
      rootObjectId: card.rootObjectId,
      channelObjectId: card.channelObjectId,
      sourceObjectId: card.sourceObjectId,
      governancePolicy: card.governancePolicy,
      telemetryKey: card.telemetryKey,
      verificationMode: card.verificationMode,
      reason: card.reason || 'LEEWAY_L2_ADMITTED_BY_RUNTIME_FABRIC',
      standard: 'LEEWAY_STANDARD::LEEWAY_AGENTIC_COMMUNICATIONS_FABRIC',
    },
    requiredRule: 'No device or local execution without a valid LeeWay runtime authorization card and proof receipt.',
  };
}

export async function writeBridgeRuntimeReceipt({
  agentId,
  taskId,
  action,
  deviceId,
  rootObjectId = ROOT_OBJECT_ID,
  channelObjectId = DEFAULT_CHANNEL_OBJECT_ID,
  sourceObjectId = DEFAULT_SOURCE_OBJECT_ID,
  governancePolicy = DEFAULT_GOVERNANCE_POLICY,
  telemetryKey = DEFAULT_TELEMETRY_KEY,
  verificationMode = DEFAULT_VERIFICATION_MODE,
  reason = 'LEEWAY_L2_ADMITTED_BY_RUNTIME_FABRIC',
  result,
  status = 'AUTHORIZED',
}, options = {}) {
  const rootDir = options.rootDir || path.resolve(fileURLToPath(new URL('..', import.meta.url)), 'receipts');
  const receiptDir = path.join(rootDir, 'runtime-auth');
  await fs.mkdir(receiptDir, { recursive: true });
  const receipt = {
    standard: 'LEEWAY_STANDARD::LEEWAY_AGENTIC_COMMUNICATIONS_FABRIC',
    timestamp: new Date().toISOString(),
    agentId,
    taskId,
    action,
    deviceId,
    rootObjectId,
    channelObjectId,
    sourceObjectId,
    governancePolicy,
    telemetryKey,
    verificationMode,
    reason,
    result,
    status,
  };
  const fileName = `${Date.now()}-${String(action || 'runtime-auth').replace(/[^a-zA-Z0-9-_]+/g, '-').toLowerCase()}.json`;
  const filePath = path.join(receiptDir, fileName);
  await fs.writeFile(filePath, JSON.stringify(receipt, null, 2), 'utf8');
  return { ok: true, status: 'LEEWAY_RECEIPT_WRITTEN', filePath, receipt };
}

export function createBridgeRuntimeGuard({
  defaultSourceObjectId = DEFAULT_SOURCE_OBJECT_ID,
  defaultChannelObjectId = DEFAULT_CHANNEL_OBJECT_ID,
} = {}) {
  return function bridgeRuntimeGuard(runtimeAuth, context = {}) {
    const card = normalizeRuntimeCard(runtimeAuth) || {};
    const normalized = buildRuntimeAuth({
      ...card,
      rootObjectId: card.rootObjectId || ROOT_OBJECT_ID,
      channelObjectId: card.channelObjectId || defaultChannelObjectId,
      sourceObjectId: card.sourceObjectId || defaultSourceObjectId,
      governancePolicy: card.governancePolicy || DEFAULT_GOVERNANCE_POLICY,
      telemetryKey: card.telemetryKey || DEFAULT_TELEMETRY_KEY,
      verificationMode: card.verificationMode || DEFAULT_VERIFICATION_MODE,
    });
    const validation = validateRuntimeAuth(normalized);
    if (!validation.valid) {
      return {
        ok: false,
        status: 'LEEWAY_BLOCKED',
        reason: 'MISSING_OR_INVALID_RUNTIME_AUTH',
        ...validation,
      };
    }
    return {
      ok: true,
      status: 'LEEWAY_AUTHORIZED',
      validation,
      runtimeAuth: normalized,
      context,
    };
  };
}
