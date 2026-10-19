package industries.leeway.devicebridge

import org.junit.Assert.*
import org.junit.Test

/** Contract checks only. HTTP authorization integration needs instrumentation. */
class AndroidProvisioningHttpContractTest {
    @Test fun eligibleLocalGateDoesNotConferCanonicalFormulaAuthority() {
        val gate = FormulaF8Gate.evaluate(true, true, listOf(true, true))
        assertTrue(gate.getBoolean("fire"))
        assertFalse(gate.getBoolean("canonicalFormulaExecuted"))
    }

    @Test fun missingGovernanceBlocksTheLocalGate() {
        val gate = FormulaF8Gate.evaluate(true, false, listOf(true, true))
        assertFalse(gate.getBoolean("fire"))
    }

    @Test fun noGpuEvidenceKeepsFallback() {
        val passport = org.json.JSONObject().put("authority", "NATIVE_ANDROID_OBSERVED")
            .put("sdkInt", 35).put("supportedAbis", org.json.JSONArray().put("arm64-v8a"))
        val plan = AndroidProvisioningCompatibility.evaluate(passport, null, null)
        assertEquals("UNOBSERVED", plan.getString("gpuState"))
        assertEquals("CPU_SAFE_FALLBACK", plan.getString("computeMode"))
        assertFalse(plan.getBoolean("automaticInstallAuthorized"))
    }
}
