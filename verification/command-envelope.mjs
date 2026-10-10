/*
REGION: LeeWay Device Bridge command envelope
TAG: LEEWAY-DEVICE-COMMAND-ENVELOPE
WHO: Agent Lee / authorized Device Bridge transports
WHAT: Deterministic validation helpers for replay-resistant device command envelopes.
WHEN: Before consequential provider dispatch.
WHERE: 4citeB4U/LEEWAY-DEVICE-BRIDGE/verification
WHY: Separate transport integrity, authorization, Formula admission and replay protection.
HOW: Stable canonical payload + expiry/nonce/sequence checks + injectable cryptographic verifier.
LICENSE: MIT
*/

const REQUIRED = [
  "version","commandId","sessionId","deviceId","capabilityId","providerId",
  "createdAt","expiresAt","nonce","sequence","argumentsHash","authorityTier",
  "formulaDecisionRef","timeoutPolicyRef","expectedStateHash","failSafePolicyRef",
  "replayPolicy","integrity"
];

export function canonicalEnvelopePayload(envelope = {}) {
  const value = {};
  for (const key of REQUIRED.filter((key) => key !== "integrity")) {
    value[key] = envelope[key];
  }
  return JSON.stringify(value);
}

export async function validateCommandEnvelope({
  envelope,
  nowMs = Date.now(),
  firstSeen = () => true,
  verifyIntegrity
} = {}) {
  if (!envelope || typeof envelope !== "object") throw new Error("COMMAND_ENVELOPE_REQUIRED");
  for (const key of REQUIRED) {
    if (envelope[key] === undefined || envelope[key] === null || envelope[key] === "") {
      throw new Error("COMMAND_ENVELOPE_FIELD_REQUIRED:" + key);
    }
  }
  if (envelope.version !== "1.0.0") throw new Error("COMMAND_ENVELOPE_VERSION_UNSUPPORTED");
  if (envelope.replayPolicy !== "COMMAND_ID_NONCE_SEQUENCE_FIRST_SEEN_REQUIRED") {
    throw new Error("COMMAND_ENVELOPE_REPLAY_POLICY_REQUIRED");
  }
  if (!Number.isInteger(envelope.sequence) || envelope.sequence < 0) {
    throw new Error("COMMAND_ENVELOPE_SEQUENCE_INVALID");
  }

  const createdAt = Date.parse(envelope.createdAt);
  const expiresAt = Date.parse(envelope.expiresAt);
  if (!Number.isFinite(createdAt) || !Number.isFinite(expiresAt) || expiresAt <= createdAt) {
    throw new Error("COMMAND_ENVELOPE_TIME_INVALID");
  }
  if (nowMs > expiresAt) throw new Error("COMMAND_ENVELOPE_EXPIRED");

  const replayKey = [envelope.commandId, envelope.nonce, envelope.sequence].join("::");
  if (!(await firstSeen(replayKey))) throw new Error("COMMAND_ENVELOPE_REPLAY_REJECTED");

  if (typeof verifyIntegrity !== "function") throw new Error("COMMAND_ENVELOPE_CRYPTO_VERIFIER_REQUIRED");
  const ok = await verifyIntegrity({
    algorithm: envelope.integrity?.algorithm,
    stamp: envelope.integrity?.stamp,
    payload: canonicalEnvelopePayload(envelope)
  });
  if (!ok) throw new Error("COMMAND_ENVELOPE_INTEGRITY_REJECTED");

  return {
    ok: true,
    commandId: envelope.commandId,
    deviceId: envelope.deviceId,
    capabilityId: envelope.capabilityId,
    providerId: envelope.providerId,
    authorityTier: envelope.authorityTier,
    formulaDecisionRef: envelope.formulaDecisionRef,
    timeoutPolicyRef: envelope.timeoutPolicyRef,
    failSafePolicyRef: envelope.failSafePolicyRef,
    state: "ENVELOPE_VALIDATED_NOT_YET_DISPATCHED"
  };
}
