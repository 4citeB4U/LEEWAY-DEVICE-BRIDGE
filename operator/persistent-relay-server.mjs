/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.RELAY.PERSISTENT
TAG: LEEWAY.UNIVERSAL.PERSISTENT.RELAY.V1
WHAT: Host one process-persistent relay room plane for every enrolled device type.
WHY: Serverless instances cannot share live WebSocket room state.
HOW: Run the canonical relay on an owner-controlled persistent host with registry, mesh-token and OIDC admission.
*/
import { createDeviceRelayServer } from '../api/device-relay.mjs';
import { loadRustTrustedDeviceRegistry, authorizeRustCommand } from './rust-registry-adapter.mjs';
import { persistTrustedDeviceEnrollment } from './identity/trusted-device-registry.mjs';

const port = Number(process.env.LEEWAY_RELAY_PORT || 8008);
const host = process.env.LEEWAY_RELAY_HOST || '127.0.0.1';
if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error('LEEWAY_RELAY_PORT_INVALID');

const relay = createDeviceRelayServer({
  deviceRegistry: loadRustTrustedDeviceRegistry(),
  volatileRoomState: false,
  authorizeCommand: ({ deviceId, capability, arguments: commandArguments, meshToken }) =>
    authorizeRustCommand({ deviceId, payload: { capability, arguments: commandArguments }, meshToken }),
  enrollDevice: enrollment => persistTrustedDeviceEnrollment(enrollment),
});
relay.server.listen(port, host, () => {
  console.log(`[LEEWAY-PERSISTENT-RELAY] listening on ${host}:${port}`);
});
