/*
REGION: LeeWay Device Bridge platform adapter
TAG: LEEWAY-ADAPTER-LINUX
WHO: Agent Lee / Device Bridge
WHAT: Linux platform adapter boundary.
WHEN: For Linux host/device capabilities.
WHERE: providers/linux
WHY: Promote the registered Linux contract into a concrete provider wrapper without claiming unqualified native control.
HOW: Delegates to Desktop Commander, AT-SPI, D-Bus, XDG portals or another authorized Linux transport.
LICENSE: MIT
*/
import { GovernedProvider } from "../_shared/governed-provider.mjs";

export class LinuxAdapter extends GovernedProvider {
  constructor(options = {}) {
    super({ providerId: "linux", providerClass: "platform", ...options });
  }
  status() {
    return this.state({
      capabilities: ["device.files.read","device.files.write","device.screen.observe","device.ui.control","device.apps.launch"],
      implementationStatus: "WRAPPER_IMPLEMENTED_NATIVE_QUALIFICATION_PENDING",
      authorityBoundary: "Current Unix user plus desktop-session authorization; no root inference."
    });
  }
}
