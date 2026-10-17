/*
REGION: LeeWay Device Bridge adapter
TAG: LEEWAY-ADAPTER-BLUETOOTH
WHO: Agent Lee / Device Bridge
WHAT: Canonical Bluetooth adapter wrapper.
WHEN: For bonded-device inventory and nearby BLE discovery on authorized hosts.
WHERE: providers/bluetooth
WHY: Expose one provider contract while native Android implementation remains under apps/android.
HOW: Delegates to an injected native Bluetooth transport and preserves discovery-only truth where applicable.
LICENSE: MIT
*/
import { GovernedProvider } from "../_shared/governed-provider.mjs";

export class BluetoothAdapter extends GovernedProvider {
  constructor(options = {}) {
    super({ providerId: "bluetooth", providerClass: "local-radio", ...options });
  }
  status() {
    return this.state({
      capabilities: [
        "device.bluetooth.list-bonded",
        "device.bluetooth.scan.start",
        "device.bluetooth.scan.results",
        "device.bluetooth.scan.stop"
      ],
      implementation: "apps/android/.../BluetoothProvider.kt",
      bondedDiscoveryEvidence: "PHYSICAL_VERIFIED",
      activeScanEvidence: "SOURCE_IMPLEMENTED_PHYSICAL_PENDING"
    });
  }
  listBonded() { return this.invoke("listBonded", {}, { authorityTier: "READ" }); }
  startScan(durationMs) { return this.invoke("startScan", { durationMs }, { authorityTier: "READ" }); }
  results() { return this.invoke("results", {}, { authorityTier: "READ" }); }
  stopScan() { return this.invoke("stopScan", {}, { authorityTier: "READ" }); }
}
