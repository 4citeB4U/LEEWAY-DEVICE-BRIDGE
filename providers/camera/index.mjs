/*
REGION: LeeWay Device Bridge adapter
TAG: LEEWAY-ADAPTER-CAMERA
WHO: Agent Lee / Device Bridge
WHAT: Governed camera observation wrapper.
WHEN: For owner-authorized device camera capture/stream/inspection.
WHERE: providers/camera
WHY: Keep camera access under Device Bridge authority instead of product-specific code.
HOW: Injected native/provider transport; observation only unless a separate motorized-control capability is qualified.
LICENSE: MIT
*/
import { GovernedProvider } from "../_shared/governed-provider.mjs";

export class CameraAdapter extends GovernedProvider {
  constructor(options = {}) {
    super({ providerId: "camera", providerClass: "sensor", ...options });
  }
  status() {
    return this.state({
      capabilities: ["camera.observe", "camera.capture", "camera.stream"],
      sourceLineage: ["Leeway-live sensory harness", "Android device runtime"],
      physicalQualification: "PENDING_FOR_CANONICAL_CAMERA_PROVIDER"
    });
  }
  observe(target) { return this.invoke("observe", { target }, { authorityTier: "READ" }); }
  capture(target) { return this.invoke("capture", { target }, { authorityTier: "READ" }); }
  stream(target) { return this.invoke("stream", { target }, { authorityTier: "READ" }); }
}
