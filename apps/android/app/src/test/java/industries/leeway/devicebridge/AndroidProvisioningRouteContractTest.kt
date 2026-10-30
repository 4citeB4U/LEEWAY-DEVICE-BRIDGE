package industries.leeway.devicebridge

import org.junit.Assert.*
import org.junit.Test

/**
 * Focused source-level contract assertions; not an Android instrumentation test.
 * Runtime authority and device-observed dispatch require separate verification.
 */
class AndroidProvisioningRouteContractTest {
    @Test fun routeIsRegistered() {
        assertTrue(RemoteCommandRouter.qualifiedCapabilities().toString().contains("device.apps.install.plan"))
    }

    @Test fun eligibilityGateDeniesWhenGovernanceAbsent() {
        val gate = FormulaF8Gate.evaluate(true, false, listOf(true, true, true))
        assertFalse(gate.getBoolean("fire"))
        assertEquals("NOT_EXECUTED", gate.getString("canonicalFormulaState"))
    }

    @Test fun eligibilityGateDeniesReplay() {
        val gate = FormulaF8Gate.evaluate(true, true, listOf(true, true, false))
        assertFalse(gate.getBoolean("fire"))
    }

    @Test fun planningRejectsSpoofedGpuWithoutTrustedProof() {
        val passport = org.json.JSONObject().put("authority", "NATIVE_ANDROID_OBSERVED")
            .put("sdkInt", 35)
            .put("supportedAbis", org.json.JSONArray().put("arm64-v8a"))
        val spoofedGpu = org.json.JSONObject().put("authority", "CALLER_CLAIM")
            .put("qualification", "PHYSICAL_CORRECTNESS_VERIFIED")
            .put("knownAnswerPass", true)
            .put("pipelineCreationPass", true)
        val result = AndroidProvisioningCompatibility.evaluate(passport, spoofedGpu, null)
        assertEquals("GPU_NOT_QUALIFIED", result.getString("gpuState"))
        assertFalse(result.getBoolean("gpuAutomaticallyEnabled"))
        assertFalse(result.getBoolean("automaticInstallAuthorized"))
    }
}
