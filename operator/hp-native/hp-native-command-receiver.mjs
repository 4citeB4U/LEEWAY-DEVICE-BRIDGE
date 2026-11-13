import { dispatchRemoteCommand } from "./hp-command-dispatch.mjs";

export function attachCommandReceiver(ws, handlers = {}) {
  if (!ws || typeof ws.send !== "function" ||
      typeof ws.addEventListener !== "function") {
    throw Error("WEBSOCKET_INTERFACE_INVALID");
  }

  ws.addEventListener("message", async event => {
    let msg;

    try {
      msg = JSON.parse(String(event.data));
    } catch {
      return;
    }

    if (!msg || typeof msg !== "object" ||
        Array.isArray(msg) || msg.type !== "command") {
      return;
    }

    // No execution occurs before dispatcher admission.
    let result;

    try {
      result = await dispatchRemoteCommand({
        capability: msg.capability,
        arguments: msg.arguments,
        authorized: msg.authorized,
        identityVerified: msg.identityVerified,
        issuerTrusted: msg.issuerTrusted
      }, handlers);
    } catch {
      result = {
        ok: false,
        admitted: false,
        reason: "COMMAND_PROCESSING_FAILED"
      };
    }

    if (typeof msg.id !== "string" ||
        msg.id.length === 0 || msg.id.length > 160) {
      return;
    }

    // Preserve the existing relay response shape.
    const reply = {
      type: "result",
      id: msg.id,
      capability: typeof msg.capability === "string"
        ? msg.capability : null,
      ok: false,
      result: {
        ok: false,
        admitted: false,
        reason: result.reason
      }
    };

    try {
      ws.send(JSON.stringify(reply));
    } catch {
      // A disconnected transport cannot change admission.
    }
  });

  return { attached: true, executionEnabled: false };
}