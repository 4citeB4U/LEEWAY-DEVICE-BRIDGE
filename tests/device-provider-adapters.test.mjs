import test from "node:test";
import assert from "node:assert/strict";
import { MatterThreadProvider } from "../providers/matter-thread/index.mjs";
import { MqttProvider } from "../providers/mqtt/index.mjs";
import { TeslaProvider } from "../providers/tesla/index.mjs";
import { DroneProvider } from "../providers/drone/index.mjs";
import { RobotProvider } from "../providers/robot/index.mjs";
import { ApplianceProvider } from "../providers/appliance/index.mjs";
import { DeviceFabric } from "../providers/device-fabric/index.mjs";

const fakeTransport = {
  async invoke(operation, payload) { return { ok: true, operation, payload }; }
};

test("providers fail closed when not configured", async () => {
  const provider = new TeslaProvider();
  await assert.rejects(() => provider.listVehicles(), /PROVIDER_NOT_CONFIGURED/);
});

test("consequential commands require human confirmation", async () => {
  const providers = [
    new MatterThreadProvider({ transport: fakeTransport }),
    new MqttProvider({ transport: fakeTransport }),
    new TeslaProvider({ transport: fakeTransport }),
    new DroneProvider({ transport: fakeTransport }),
    new RobotProvider({ transport: fakeTransport }),
    new ApplianceProvider({ transport: fakeTransport })
  ];
  for (const provider of providers) {
    await assert.rejects(
      () => provider.invoke("command", {}, { authorityTier: "OPERATE", humanConfirmed: false }),
      /HUMAN_CONFIRMATION_REQUIRED/
    );
  }
});

test("device fabric inventories registered providers", () => {
  const fabric = new DeviceFabric({
    mqtt: new MqttProvider({ transport: fakeTransport }),
    appliance: new ApplianceProvider({ transport: fakeTransport })
  });
  const inventory = fabric.inventory();
  assert.equal(inventory.length, 2);
  assert.equal(inventory[0].status.authority, "LEEWAY_DEVICE_BRIDGE_PROVIDER_DONOR_ONLY");
});
