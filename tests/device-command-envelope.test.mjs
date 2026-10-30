import test from "node:test";
import assert from "node:assert/strict";
import { validateCommandEnvelope } from "../verification/command-envelope.mjs";

const argumentsValue = { requested:"test" };
const hashArguments = async () => "a".repeat(64);
const policy = { argumentsValue, hashArguments, maxLifetimeMs:60000, maxClockSkewMs:1000 };

const base = {
  version: "1.0.0",
  commandId: "cmd-1",
  sessionId: "session-1",
  deviceId: "device-1",
  capabilityId: "device.test",
  providerId: "sim",
  createdAt: "2026-10-05T21:00:00.000Z",
  expiresAt: "2026-10-05T21:01:00.000Z",
  nonce: "0123456789abcdef",
  sequence: 1,
  argumentsHash: "a".repeat(64),
  authorityTier: "OPERATE",
  creatorAuthorization: "owner-confirmed",
  formulaDecisionRef: "formula://candidate/decision-1",
  timeoutPolicyRef: "timeout://sim/device.test/v1",
  expectedStateHash: "b".repeat(64),
  failSafePolicyRef: "failsafe://sim/device.test/v1",
  replayPolicy: "COMMAND_ID_NONCE_SEQUENCE_FIRST_SEEN_REQUIRED",
  integrity: { algorithm: "HMAC-SHA256", stamp: "c".repeat(64) }
};

test("valid envelope remains pre-dispatch", async () => {
  const result = await validateCommandEnvelope({
    envelope: base,
    nowMs: Date.parse("2026-10-05T21:00:30.000Z"),
    ...policy,
    firstSeen: async () => true,
    verifyIntegrity: async () => true
  });
  assert.equal(result.state, "ENVELOPE_VALIDATED_NOT_YET_DISPATCHED");
});

test("expired envelope is rejected", async () => {
  await assert.rejects(() => validateCommandEnvelope({
    envelope: base,
    nowMs: Date.parse("2026-10-05T21:02:00.000Z"),
    ...policy,
    firstSeen: async () => true,
    verifyIntegrity: async () => true
  }), /COMMAND_ENVELOPE_EXPIRED/);
});

test("replayed envelope is rejected", async () => {
  await assert.rejects(() => validateCommandEnvelope({
    envelope: base,
    nowMs: Date.parse("2026-10-05T21:00:30.000Z"),
    ...policy,
    firstSeen: async () => false,
    verifyIntegrity: async () => true
  }), /COMMAND_ENVELOPE_REPLAY_REJECTED/);
});

test("cryptographic verification is mandatory", async () => {
  await assert.rejects(() => validateCommandEnvelope({
    envelope: base,
    nowMs: Date.parse("2026-10-05T21:00:30.000Z"),
    ...policy,
    firstSeen: async () => true
  }), /COMMAND_ENVELOPE_CRYPTO_VERIFIER_REQUIRED/);
});
