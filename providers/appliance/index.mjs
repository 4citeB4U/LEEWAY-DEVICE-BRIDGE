/*
REGION: LeeWay Device Bridge provider adapters
TAG: LEEWAY-PROVIDER-APPLIANCE
WHO: Agent Lee / authorized LeeWay runtimes
WHAT: Generic governed appliance wrapper for washer/dryer/refrigerator/lawn equipment and similar devices.
WHEN: When a specific appliance binding is supplied by Home Assistant, Matter, MQTT, LAN, Bluetooth, or vendor transport.
WHERE: 4citeB4U/LEEWAY-DEVICE-BRIDGE/providers/appliance
WHY: Give Agent Lee one appliance capability contract without embedding brands.
HOW: Resolve through an injected provider binding; state reads are READ, actuation requires confirmation.
LICENSE: MIT
*/
import { GovernedProvider } from "../_shared/governed-provider.mjs";

export class ApplianceProvider extends GovernedProvider {
  constructor(options = {}) {
    super({ providerId: "appliance", providerClass: "appliance", ...options });
  }

  status() {
    return this.state({
      capabilities: ["appliance.list", "appliance.read-state", "appliance.command"],
      supportedTransports: ["home-assistant", "matter-thread", "mqtt", "lan", "bluetooth", "vendor"]
    });
  }

  list() {
    return this.invoke("list", {}, { authorityTier: "READ" });
  }

  readState(deviceId) {
    if (!deviceId) throw new Error("DEVICE_ID_REQUIRED");
    return this.invoke("readState", { deviceId }, { authorityTier: "READ" });
  }

  command(deviceId, capability, args = {}, { humanConfirmed = false } = {}) {
    if (!deviceId || !capability) throw new Error("DEVICE_AND_CAPABILITY_REQUIRED");
    return this.invoke("command", { deviceId, capability, args }, {
      authorityTier: "OPERATE",
      humanConfirmed
    });
  }
}
