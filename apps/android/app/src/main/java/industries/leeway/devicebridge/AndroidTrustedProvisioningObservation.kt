package industries.leeway.devicebridge

import android.content.Context
import org.json.JSONObject

/**
 * Trusted observation entrypoint: native capture, not caller JSON.
 * External GPU evidence is deliberately unavailable until receipt verification is wired.
 */
object AndroidTrustedProvisioningObservation {
    fun capturePlan(context: Context): JSONObject {
        val passport = DevicePassport.capture(context)
        val plan = AndroidProvisioningCompatibility.evaluate(passport, null, null)
        return plan.put("installerCapability", PackageInstallBroker.status(context))
            .put("passportOrigin", "DEVICE_BRIDGE_CAPTURED_AT_REQUEST")
            .put("gpuEvidenceOrigin", "NO_VERIFIED_GPU_RECEIPT")
    }
}
