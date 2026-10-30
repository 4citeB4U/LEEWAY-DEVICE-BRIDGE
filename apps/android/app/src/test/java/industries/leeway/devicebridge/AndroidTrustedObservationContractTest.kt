package industries.leeway.devicebridge

import org.junit.Assert.*
import org.junit.Test

class AndroidTrustedObservationContractTest {
    @Test fun readOnlyRouteStillRegistered() {
        assertTrue(RemoteCommandRouter.qualifiedCapabilities().toString().contains("device.apps.install.plan"))
    }

    @Test fun unverifiedGpuCannotGainAuthorityFromJsonString() {
        val observed = org.json.JSONObject()
            .put("authority", "NATIVE_ANDROID_OBSERVED")
            .put("sdkInt", 35)
            .put("supportedAbis", org.json.JSONArray().put("arm64-v8a"))
        val claim = org.json.JSONObject()
            .put("authority", "CALLER_CLAIM")
            .put("qualification", "PHYSICAL_CORRECTNESS_VERIFIED")
            .put("knownAnswerPass", true)
            .put("pipelineCreationPass", true)
        val result = AndroidProvisioningCompatibility.evaluate(observed, claim, null)
        assertEquals("GPU_NOT_QUALIFIED", result.getString("gpuState"))
        assertFalse(result.getBoolean("gpuAutomaticallyEnabled"))
    }

    @Test fun localEligibilityCannotPromoteCanonicalFormula() {
        val gate = FormulaF8Gate.evaluate(true, true, listOf(true, true))
        assertTrue(gate.getBoolean("fire"))
        assertFalse(gate.getBoolean("canonicalFormulaExecuted"))
        assertEquals("NOT_EXECUTED", gate.getString("canonicalFormulaState"))
    }
}
