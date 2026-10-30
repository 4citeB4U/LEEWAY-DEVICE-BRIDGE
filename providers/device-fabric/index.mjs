/*
REGION: LeeWay Device Bridge provider adapters
TAG: LEEWAY-DEVICE-FABRIC-DISPATCH
WHO: Agent Lee / authorized LeeWay runtimes
WHAT: Unified provider wrapper/dispatch surface for device discovery, observation and actuation.
WHEN: After Formula/authority admission and before provider-specific execution.
WHERE: 4citeB4U/LEEWAY-DEVICE-BRIDGE/providers/device-fabric
WHY: Present one capability fabric while keeping Bluetooth/LAN/Home Assistant/Matter/MQTT/vendor providers replaceable.
HOW: Registered provider instances + normalized route selection; no provider is treated as authority.
LICENSE: MIT
*/

export class DeviceFabric {
  constructor(providers = {}) {
    this.providers = new Map(Object.entries(providers));
  }

  register(id, provider) {
    if (!id || !provider) throw new Error("PROVIDER_REGISTRATION_REQUIRED");
    this.providers.set(id, provider);
    return this;
  }

  get(id) {
    const provider = this.providers.get(id);
    if (!provider) throw new Error("PROVIDER_NOT_REGISTERED:" + id);
    return provider;
  }

  inventory() {
    return [...this.providers.entries()].map(([id, provider]) => ({
      id,
      status: typeof provider.status === "function" ? provider.status() : { evidenceState: "UNKNOWN" }
    }));
  }

  async route({ providerId, operation, payload = {}, gate = {} } = {}) {
    if (!providerId || !operation) throw new Error("PROVIDER_AND_OPERATION_REQUIRED");
    const provider = this.get(providerId);
    if (typeof provider.invoke !== "function") throw new Error("PROVIDER_INVOKE_REQUIRED:" + providerId);
    return provider.invoke(operation, payload, gate);
  }
}
