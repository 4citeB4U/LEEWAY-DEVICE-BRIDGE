/*
REGION: LeeWay Device Bridge provider adapters
TAG: LEEWAY-PROVIDER-TESLA
WHO: Agent Lee / authorized LeeWay runtimes
WHAT: Governed Tesla vehicle-provider wrapper.
WHEN: Only after owner-authorized Tesla transport/OAuth configuration is supplied.
WHERE: 4citeB4U/LEEWAY-DEVICE-BRIDGE/providers/tesla
WHY: Separate normalized LeeWay vehicle intent from Tesla-specific API mechanics.
HOW: Injected transport; observation is READ, vehicle commands require explicit human confirmation.
LICENSE: MIT
*/
import { GovernedProvider } from "../_shared/governed-provider.mjs";

export class TeslaProvider extends GovernedProvider {
  constructor(options = {}) {
    super({ providerId: "tesla", providerClass: "vehicle", ...options });
  }

  status() {
    return this.state({
      capabilities: ["vehicle.list", "vehicle.read-state", "vehicle.command"],
      credentialStorage: "BEHIND_AUTHORIZED_TRANSPORT",
      liveVehicleVerified: false
    });
  }

  listVehicles() {
    return this.invoke("listVehicles", {}, { authorityTier: "READ" });
  }

  readState(vehicleId) {
    if (!vehicleId) throw new Error("VEHICLE_ID_REQUIRED");
    return this.invoke("readState", { vehicleId }, { authorityTier: "READ" });
  }

  command(vehicleId, command, args = {}, { humanConfirmed = false } = {}) {
    if (!vehicleId || !command) throw new Error("VEHICLE_AND_COMMAND_REQUIRED");
    return this.invoke("command", { vehicleId, command, args }, {
      authorityTier: "OPERATE",
      humanConfirmed
    });
  }
}
