/*
REGION: LeeWay Device Bridge platform adapter
TAG: LEEWAY-ADAPTER-ANDROID
WHO: Agent Lee / Device Bridge
WHAT: Canonical Android platform adapter wrapper.
WHEN: For Android device runtime capability projection.
WHERE: providers/android
WHY: Provide the same provider-facing shape as other platform adapters while native code remains under apps/android.
HOW: Delegates to the installed Android Device Bridge runtime.
LICENSE: MIT
*/
import { GovernedProvider } from "../_shared/governed-provider.mjs";

export class AndroidAdapter extends GovernedProvider {
  constructor(options = {}) {
    super({ providerId: "android", providerClass: "platform", ...options });
  }
  status() {
    return this.state({
      capabilities: [
        "device.info","device.files.read","device.files.write","device.screen.observe",
        "device.ui.control","device.apps.list","device.apps.launch","device.apps.install",
        "device.media.scan","device.bluetooth.list-bonded","device.bluetooth.scan.start",
        "device.bluetooth.scan.results","device.bluetooth.scan.stop","device.network.discover"
      ],
      implementationStatus: "PARTIAL_NATIVE_IMPLEMENTATION",
      implementationPath: "apps/android"
    });
  }
}
