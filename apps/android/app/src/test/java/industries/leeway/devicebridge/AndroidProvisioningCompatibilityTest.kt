package industries.leeway.devicebridge

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class AndroidProvisioningCompatibilityTest {
    private fun passport() = JSONObject()
        .put("authority", "NATIVE_ANDROID_OBSERVED")
        .put("sdkInt", 35)
        .put("supportedAbis", JSONArray().put("arm64-v8a"))

    private fun gpu(pass: Boolean) = JSONObject()
        .put("authority", "LEEWAY_EDGE_GPU_VERIFIED")
        .put("qualification", "PHYSICAL_CORRECTNESS_VERIFIED")
        .put("knownAnswerPass", pass)
        .put("pipelineCreationPass", pass)

    @Test fun noPassportBlocks() {
        val result = AndroidProvisioningCompatibility.evaluate(null, null, null)
        assertEquals("BLOCKED_OR_UNKNOWN", result.getString("deviceState"))
        assertEquals("CPU_SAFE_FALLBACK", result.getString("computeMode"))
    }

    @Test fun unobservedGpuCannotBeEnabled() {
        val result = AndroidProvisioningCompatibility.evaluate(passport(), null, null)
        assertEquals("UNOBSERVED", result.getString("gpuState"))
        assertFalse(result.getBoolean("gpuAutomaticallyEnabled"))
    }

    @Test fun failedPhysicalGpuQualificationKeepsCpu() {
        val result = AndroidProvisioningCompatibility.evaluate(passport(), gpu(false), null)
        assertEquals("GPU_NOT_QUALIFIED", result.getString("gpuState"))
        assertEquals("CPU_SAFE_FALLBACK", result.getString("computeMode"))
    }

    @Test fun verifiedGpuDoesNotSelfAuthorizeProvisioning() {
        val result = AndroidProvisioningCompatibility.evaluate(passport(), gpu(true), null)
        assertEquals("QUALIFIED_FOR_REVIEW", result.getString("gpuState"))
        assertEquals("NOT_EXECUTED", result.getString("provisioningState"))
        assertFalse(result.getBoolean("gpuAutomaticallyEnabled"))
        assertEquals("NOT_EXECUTED", result.getString("canonicalFormulaState"))
    }

    @Test fun installPlanCannotSelfAuthorizeInstall() {
        val plan = AndroidInstallPlan.Decision("READY_FOR_BROKER_PREFLIGHT", "READY", mayHandoff = true)
        val result = AndroidProvisioningCompatibility.evaluate(passport(), gpu(true), plan)
        assertEquals("READY_FOR_BROKER_PREFLIGHT", result.getString("installerPlanState"))
        assertFalse(result.getBoolean("automaticInstallAuthorized"))
    }

    @Test fun spoofedPassportAuthorityFailsClosed() {
        val bad = passport().put("authority", "CALLER_SUPPLIED")
        val result = AndroidProvisioningCompatibility.evaluate(bad, gpu(true), null)
        assertEquals("BLOCKED_OR_UNKNOWN", result.getString("deviceState"))
    }
}
