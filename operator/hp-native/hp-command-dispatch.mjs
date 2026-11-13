import { evaluateRemoteCommand } from "./hp-security-policy.mjs";

export async function dispatchRemoteCommand(command, handlers = {}) {
  // Authorization must precede every handler invocation.
  const decision = evaluateRemoteCommand(command);

  if (decision.admitted !== true) {
    return Object.freeze({
      ok: false,
      admitted: false,
      reason: decision.reason,
      capability: decision.capability ?? null
    });
  }

  // No authority provider has been integrated.
  // An accidental policy change cannot enable execution.
  return Object.freeze({
    ok: false,
    admitted: false,
    reason: "EXECUTION_ADAPTER_NOT_QUALIFIED"
  });
}