/*
REGION: LeeWay Device Bridge provider adapters
TAG: LEEWAY-PROVIDER-ROBOT
WHO: Agent Lee / authorized LeeWay runtimes
WHAT: Governed robot capability wrapper.
WHEN: When an owner-authorized robot transport is configured.
WHERE: 4citeB4U/LEEWAY-DEVICE-BRIDGE/providers/robot
WHY: Normalize heterogeneous robot APIs behind LeeWay authority.
HOW: Injected transport; sensing is READ, movement/actuation requires human confirmation.
LICENSE: MIT
*/
import { GovernedProvider } from "../_shared/governed-provider.mjs";

export class RobotProvider extends GovernedProvider {
  constructor(options = {}) {
    super({ providerId: "robot", providerClass: "robotics", ...options });
  }

  status() {
    return this.state({
      capabilities: ["robot.observe", "robot.telemetry.read", "robot.command"],
      autonomousControlClaimed: false
    });
  }

  observe(deviceId) {
    if (!deviceId) throw new Error("DEVICE_ID_REQUIRED");
    return this.invoke("observe", { deviceId }, { authorityTier: "READ" });
  }

  command(deviceId, command, args = {}, { humanConfirmed = false } = {}) {
    if (!deviceId || !command) throw new Error("DEVICE_AND_COMMAND_REQUIRED");
    return this.invoke("command", { deviceId, command, args }, {
      authorityTier: "OPERATE",
      humanConfirmed
    });
  }
}
