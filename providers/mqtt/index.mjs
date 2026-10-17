/*
REGION: LeeWay Device Bridge provider adapters
TAG: LEEWAY-PROVIDER-MQTT
WHO: Agent Lee / authorized LeeWay runtimes
WHAT: Governed MQTT publish/subscribe wrapper.
WHEN: When an authorized MQTT client transport is configured.
WHERE: 4citeB4U/LEEWAY-DEVICE-BRIDGE/providers/mqtt
WHY: Normalize MQTT telemetry and actuation under Device Bridge authority.
HOW: Injected client transport; reads are non-consequential, publishes require explicit operate confirmation.
LICENSE: MIT
*/
import { GovernedProvider } from "../_shared/governed-provider.mjs";

export class MqttProvider extends GovernedProvider {
  constructor(options = {}) {
    super({ providerId: "mqtt", providerClass: "iot", ...options });
  }

  status() {
    return this.state({ capabilities: ["device.telemetry.subscribe", "device.command.publish"] });
  }

  subscribe(topic) {
    if (!topic) throw new Error("MQTT_TOPIC_REQUIRED");
    return this.invoke("subscribe", { topic }, { authorityTier: "READ" });
  }

  publish(topic, message, { humanConfirmed = false } = {}) {
    if (!topic) throw new Error("MQTT_TOPIC_REQUIRED");
    return this.invoke("publish", { topic, message }, {
      authorityTier: "OPERATE",
      humanConfirmed
    });
  }
}
