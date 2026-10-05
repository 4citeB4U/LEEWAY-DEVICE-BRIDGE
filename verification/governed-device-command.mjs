import { validateCommandEnvelope } from "./command-envelope.mjs";
import { TimeoutPolicyRegistry } from "./timeout-policy.mjs";
import { executeVerifiedCommand } from "./closed-loop.mjs";

export async function executeGovernedDeviceCommand({
  fabric,
  envelope,
  argumentsValue,
  hashArguments,
  firstSeen,
  verifyIntegrity,
  maxLifetimeMs,
  maxClockSkewMs = 0,
  timeoutRegistry,
  deviceClass,
  targetState,
  readBack,
  compare,
  failSafe,
  authorityGate,
  formulaGate
} = {}) {
  if (!fabric || typeof fabric.get !== "function") throw new Error("DEVICE_FABRIC_REQUIRED");
  if (typeof authorityGate !== "function") throw new Error("DEVICE_AUTHORITY_GATE_REQUIRED");
  if (typeof formulaGate !== "function") throw new Error("DEVICE_FORMULA_GATE_REQUIRED");
  if (!(timeoutRegistry instanceof TimeoutPolicyRegistry)) throw new Error("TIMEOUT_POLICY_REGISTRY_REQUIRED");
  if (typeof readBack !== "function") throw new Error("FRESH_READBACK_REQUIRED");

  const validated = await validateCommandEnvelope({
    envelope, argumentsValue, hashArguments, firstSeen, verifyIntegrity,
    maxLifetimeMs, maxClockSkewMs
  });

  const authority = await authorityGate({ envelope, validated });
  if (!authority || authority.status !== "PASS") throw new Error("DEVICE_AUTHORITY_REJECTED");

  const formula = await formulaGate({ envelope, validated, authority });
  if (!formula || formula.status !== "PASS" || formula.receiptRef !== envelope.formulaDecisionRef) {
    throw new Error("DEVICE_FORMULA_REJECTED");
  }

  const timeout = timeoutRegistry.resolve({
    providerId: envelope.providerId,
    deviceClass,
    capability: envelope.capabilityId
  });
  const provider = fabric.get(envelope.providerId);

  return executeVerifiedCommand({
    providerId: envelope.providerId,
    deviceId: envelope.deviceId,
    capability: envelope.capabilityId,
    targetState,
    timeoutMs: timeout.timeoutMs,
    pollIntervalMs: timeout.pollIntervalMs,
    compare,
    failSafe,
    dispatch: () => provider.invoke(envelope.capabilityId, argumentsValue, {
      authority,
      formula,
      commandId: envelope.commandId
    }),
    readBack
  });
}
