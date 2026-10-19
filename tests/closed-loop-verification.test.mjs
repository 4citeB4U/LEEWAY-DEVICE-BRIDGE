import test from "node:test";
import assert from "node:assert/strict";
import { executeVerifiedCommand, DeviceVerificationError } from "../verification/closed-loop.mjs";
import { TimeoutPolicyRegistry } from "../verification/timeout-policy.mjs";

test("closed loop admits only after read-back converges", async () => {
  let now = 0;
  let reads = 0;
  const result = await executeVerifiedCommand({
    providerId: "sim",
    deviceId: "device-1",
    capability: "device.test",
    targetState: true,
    timeoutMs: 100,
    pollIntervalMs: 10,
    dispatch: async () => true,
    readBack: async () => (++reads >= 3),
    clock: () => now,
    sleepFn: async (ms) => { now += ms; }
  });
  assert.equal(result.veritasState, "ADMITTED");
  assert.equal(result.observedState, true);
});

test("timeout rejects and invokes fail-safe", async () => {
  let now = 0;
  let safe = false;
  await assert.rejects(
    () => executeVerifiedCommand({
      providerId: "sim",
      deviceId: "device-2",
      capability: "device.test",
      targetState: true,
      timeoutMs: 30,
      pollIntervalMs: 10,
      dispatch: async () => true,
      readBack: async () => false,
      failSafe: async () => { safe = true; return { ok: true }; },
      clock: () => now,
      sleepFn: async (ms) => { now += ms; }
    }),
    (error) => {
      assert.ok(error instanceof DeviceVerificationError);
      assert.equal(error.message, "READBACK_TIMEOUT");
      assert.equal(error.detail.veritasState, "REJECTED");
      return true;
    }
  );
  assert.equal(safe, true);
});

test("timeout registry refuses uncalibrated policies", () => {
  const registry = new TimeoutPolicyRegistry();
  assert.throws(
    () => registry.register({
      providerId: "matter-thread",
      deviceClass: "switch",
      capability: "device.command",
      timeoutMs: 150,
      pollIntervalMs: 10,
      evidenceRef: "gemini-candidate",
      status: "PROPOSED"
    }),
    /TIMEOUT_POLICY_MUST_BE_CALIBRATED/
  );
});
