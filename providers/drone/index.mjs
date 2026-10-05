/*
REGION: LeeWay Device Bridge provider adapters
TAG: LEEWAY-PROVIDER-DRONE
WHO: Agent Lee / authorized LeeWay runtimes
WHAT: Governed drone observation and command wrapper.
WHEN: When an owner-authorized drone SDK/bridge transport is configured.
WHERE: 4citeB4U/LEEWAY-DEVICE-BRIDGE/providers/drone
WHY: Keep flight control behind explicit authority and provider qualification.
HOW: Injected transport; telemetry is READ, flight commands require human confirmation.
LICENSE: MIT
*/
import { GovernedProvider } from "../_shared/governed-provider.mjs";

export class DroneProvider extends GovernedProvider {
  constructor(options = {}) {
    super({ providerId: "drone", providerClass: "robotic-aircraft", ...options });
  }

  status() {
    return this.state({
      capabilities: ["drone.telemetry.read", "drone.camera.observe", "drone.command"],
      autonomousFlightClaimed: false
    });
  }

  telemetry(deviceId) {
    if (!deviceId) throw new Error("DEVICE_ID_REQUIRED");
    return this.invoke("telemetry", { deviceId }, { authorityTier: "READ" });
  }

  command(deviceId, command, args = {}, { humanConfirmed = false } = {}) {
    if (!deviceId || !command) throw new Error("DEVICE_AND_COMMAND_REQUIRED");
    return this.invoke("command", { deviceId, command, args }, {
      authorityTier: "OPERATE",
      humanConfirmed
    });
  }
}
