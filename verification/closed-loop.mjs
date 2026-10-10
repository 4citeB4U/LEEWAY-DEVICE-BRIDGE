/*
REGION: LeeWay Device Bridge verification
TAG: LEEWAY-DEVICE-CLOSED-LOOP-VERIFICATION
WHO: Agent Lee / authorized LeeWay device runtimes
WHAT: Provider-neutral command/read-back/fail-safe verification controller.
WHEN: After authority admission and before any state transition is promoted as successful.
WHERE: 4citeB4U/LEEWAY-DEVICE-BRIDGE/verification
WHY: API acceptance, ACK, or transport success is not physical-state proof.
HOW: Dispatch -> bounded read-back polling -> fail-safe on divergence -> structured Veritas result.
LICENSE: MIT
*/

export class DeviceVerificationError extends Error {
  constructor(message, detail = {}) {
    super(message);
    this.name = "DeviceVerificationError";
    this.detail = detail;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function executeVerifiedCommand({
  providerId,
  deviceId,
  capability,
  targetState,
  dispatch,
  readBack,
  compare = (observed, target) => Object.is(observed, target),
  timeoutMs,
  pollIntervalMs,
  failSafe = null,
  clock = () => performance.now(),
  sleepFn = sleep
} = {}) {
  if (!providerId || !deviceId || !capability) throw new Error("VERIFICATION_IDENTITY_REQUIRED");
  if (typeof dispatch !== "function" || typeof readBack !== "function") {
    throw new Error("DISPATCH_AND_READBACK_REQUIRED");
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("CALIBRATED_TIMEOUT_REQUIRED");
  }
  if (!Number.isFinite(pollIntervalMs) || pollIntervalMs <= 0 || pollIntervalMs >= timeoutMs) {
    throw new Error("VALID_POLL_INTERVAL_REQUIRED");
  }

  const startedAt = clock();
  let dispatchResult;
  try {
    dispatchResult = await dispatch();
  } catch (error) {
    await invokeFailSafe(failSafe);
    throw new DeviceVerificationError("DISPATCH_FAILED", {
      providerId, deviceId, capability, targetState,
      elapsedMs: clock() - startedAt,
      cause: error?.message || String(error),
      veritasState: "REJECTED"
    });
  }

  if (dispatchResult === false) {
    await invokeFailSafe(failSafe);
    throw new DeviceVerificationError("DISPATCH_REJECTED", {
      providerId, deviceId, capability, targetState,
      elapsedMs: clock() - startedAt,
      veritasState: "REJECTED"
    });
  }

  let lastObserved;
  let readBackErrors = 0;

  while ((clock() - startedAt) < timeoutMs) {
    try {
      lastObserved = await readBack();
      if (compare(lastObserved, targetState)) {
        return {
          ok: true,
          providerId,
          deviceId,
          capability,
          targetState,
          observedState: lastObserved,
          elapsedMs: clock() - startedAt,
          veritasState: "ADMITTED",
          reason: "READBACK_CONVERGED"
        };
      }
    } catch {
      readBackErrors += 1;
    }
    await sleepFn(pollIntervalMs);
  }

  const failSafeResult = await invokeFailSafe(failSafe);
  throw new DeviceVerificationError("READBACK_TIMEOUT", {
    providerId,
    deviceId,
    capability,
    targetState,
    observedState: lastObserved,
    readBackErrors,
    elapsedMs: clock() - startedAt,
    failSafeInvoked: Boolean(failSafe),
    failSafeResult,
    veritasState: "REJECTED"
  });
}

async function invokeFailSafe(failSafe) {
  if (typeof failSafe !== "function") return null;
  try {
    return await failSafe();
  } catch (error) {
    return { ok: false, error: error?.message || String(error) };
  }
}
