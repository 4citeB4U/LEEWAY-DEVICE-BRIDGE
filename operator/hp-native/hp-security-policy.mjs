export const DEVICE_ID = "pc-hp-secondary";

export const POLICY_STATE =
  "ENROLLMENT_AND_AUTHORIZATION_REQUIRED";

export const DENIED_CAPABILITIES = Object.freeze([
  "device.files.write",
  "device.files.read",
  "device.directories.list",
  "device.apps.launch",
  "device.process.execute",
  "device.screen.capture",
  "device.ui.click",
  "device.ui.type",
  "device.health",
  "device.info"
]);

export function evaluateRemoteCommand(command) {
  if (!command || typeof command !== "object" ||
      Array.isArray(command)) {
    return Object.freeze({
      admitted: false,
      reason: "INVALID_COMMAND"
    });
  }

  if (typeof command.capability !== "string" ||
      command.capability.length === 0) {
    return Object.freeze({
      admitted: false,
      reason: "INVALID_CAPABILITY"
    });
  }

  // No remote command may execute before device-bound
  // enrollment, authenticated identity and C3 authorization
  // have been independently implemented and verified.
  return Object.freeze({
    admitted: false,
    reason: POLICY_STATE,
    deviceId: DEVICE_ID,
    capability: command.capability
  });
}