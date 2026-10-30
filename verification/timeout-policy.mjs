/*
REGION: LeeWay Device Bridge verification
TAG: LEEWAY-DEVICE-TIMEOUT-POLICY
WHO: Agent Lee / Device Bridge providers
WHAT: Fail-closed lookup for calibrated protocol/device timeout policy.
WHEN: Before closed-loop actuation.
WHERE: 4citeB4U/LEEWAY-DEVICE-BRIDGE/verification
WHY: Prevent uncalibrated universal timeout constants from entering physical control.
HOW: Exact provider/device/capability policy lookup; no default timeout is invented.
LICENSE: MIT
*/

export class TimeoutPolicyRegistry {
  constructor(entries = []) {
    this.entries = new Map();
    for (const entry of entries) this.register(entry);
  }

  key({ providerId, deviceClass, capability }) {
    return [providerId, deviceClass, capability].join("::");
  }

  register(entry = {}) {
    const { providerId, deviceClass, capability, timeoutMs, pollIntervalMs, evidenceRef, status } = entry;
    if (!providerId || !deviceClass || !capability) throw new Error("TIMEOUT_POLICY_IDENTITY_REQUIRED");
    if (status !== "CALIBRATED") throw new Error("TIMEOUT_POLICY_MUST_BE_CALIBRATED");
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error("TIMEOUT_MS_REQUIRED");
    if (!Number.isFinite(pollIntervalMs) || pollIntervalMs <= 0 || pollIntervalMs >= timeoutMs) {
      throw new Error("POLL_INTERVAL_INVALID");
    }
    if (!evidenceRef) throw new Error("TIMEOUT_EVIDENCE_REQUIRED");
    this.entries.set(this.key(entry), Object.freeze({ ...entry }));
    return this;
  }

  resolve(query = {}) {
    const policy = this.entries.get(this.key(query));
    if (!policy) {
      const error = new Error("CALIBRATED_TIMEOUT_POLICY_NOT_FOUND");
      error.code = "CALIBRATED_TIMEOUT_POLICY_NOT_FOUND";
      throw error;
    }
    return policy;
  }
}
