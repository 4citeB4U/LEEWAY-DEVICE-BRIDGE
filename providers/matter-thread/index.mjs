/*
REGION: LeeWay Device Bridge provider adapters
TAG: LEEWAY-PROVIDER-MATTER-THREAD
WHO: Agent Lee / authorized LeeWay runtimes
WHAT: Governed Matter/Thread capability wrapper.
WHEN: When a qualified Matter controller or Home Assistant binding is configured.
WHERE: 4citeB4U/LEEWAY-DEVICE-BRIDGE/providers/matter-thread
WHY: Expose normalized Matter/Thread capabilities without hardcoding controller vendors.
HOW: Delegates to an injected authorized controller transport and fails closed otherwise.
LICENSE: MIT
*/
import { GovernedProvider } from "../_shared/governed-provider.mjs";

export class MatterThreadProvider extends GovernedProvider {
  constructor(options = {}) {
    super({ providerId: "matter-thread", providerClass: "iot", ...options });
  }

  status() {
    return this.state({
      capabilities: ["device.discover", "device.read-state", "device.command"],
      directRadioClaimed: false,
      controllerRequired: true
    });
  }

  discover() {
    return this.invoke("discover", {}, { authorityTier: "READ" });
  }

  readState(deviceId) {
    if (!deviceId) throw new Error("DEVICE_ID_REQUIRED");
    return this.invoke("readState", { deviceId }, { authorityTier: "READ" });
  }

  command(deviceId, capability, arguments_ = {}, { humanConfirmed = false } = {}) {
    if (!deviceId || !capability) throw new Error("DEVICE_AND_CAPABILITY_REQUIRED");
    return this.invoke("command", { deviceId, capability, arguments: arguments_ }, {
      authorityTier: "OPERATE",
      humanConfirmed
    });
  }
}
