/*
REGION: LeeWay Device Bridge adapter
TAG: LEEWAY-ADAPTER-WIFI-LAN
WHO: Agent Lee / Device Bridge
WHAT: Canonical Wi-Fi/LAN discovery wrapper.
WHEN: For SSDP, DNS-SD/mDNS and related authorized local-network discovery.
WHERE: providers/wifi-lan
WHY: Normalize network discovery behind one provider contract.
HOW: Delegates to native network discovery transport; discovery is read-only unless another provider owns actuation.
LICENSE: MIT
*/
import { GovernedProvider } from "../_shared/governed-provider.mjs";

export class WifiLanAdapter extends GovernedProvider {
  constructor(options = {}) {
    super({ providerId: "wifi-lan", providerClass: "network", ...options });
  }
  status() {
    return this.state({
      capabilities: ["device.network.discover"],
      implementation: "apps/android/.../NetworkDiscoveryProvider.kt",
      protocols: ["SSDP/UPnP", "DNS-SD/mDNS"],
      evidenceState: this.configured ? "AVAILABLE" : "PHYSICAL_DISCOVERY_VERIFIED",
      actuationAvailable: false
    });
  }
  discover() { return this.invoke("discover", {}, { authorityTier: "READ" }); }
}
