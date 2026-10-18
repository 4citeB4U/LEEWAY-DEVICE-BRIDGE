package industries.leeway.devicebridge

import org.json.JSONObject

/**
 * Issue #37: deterministic provisioning compatibility only.
 * Formula authority is retained; the centralized Formula has NOT executed here.
 * No discovery value or caller-supplied flag can install a package or enable a GPU.
 */
object AndroidProvisioningCompatibility {
    const val CONTRACT = "LEEWAY_ANDROID_PROVISIONING_COMPATIBILITY_V1"

    fun evaluate(passport: JSONObject?, gpuObservation: JSONObject?, packagePlan: AndroidInstallPlan.Decision?): JSONObject {
        val observed = passport?.optString("authority") == "NATIVE_ANDROID_OBSERVED"
        val sdk = if (observed) passport!!.optInt("sdkInt", -1) else -1
        val abiList = if (observed) passport!!.optJSONArray("supportedAbis") else null
        val abi = abiList?.let { (0 until it.length()).map { index -> it.optString(index) } }.orEmpty()
        val androidCompatible = observed && sdk >= 29 && abi.isNotEmpty()
        val gpuQualified = gpuObservation?.optString("qualification") == "PHYSICAL_CORRECTNESS_VERIFIED" &&
            gpuObservation.optBoolean("knownAnswerPass", false) &&
            gpuObservation.optBoolean("pipelineCreationPass", false) &&
            gpuObservation.optString("authority") == "LEEWAY_EDGE_GPU_VERIFIED"
        val gpuState = when {
            !observed -> "UNKNOWN"
            gpuObservation == null -> "UNOBSERVED"
            gpuQualified -> "QUALIFIED_FOR_REVIEW"
            else -> "GPU_NOT_QUALIFIED"
        }
        val installerState = packagePlan?.state ?: "NOT_PLANNED"
        return JSONObject().apply {
            put("contract", CONTRACT)
            put("authority", "DEVICE_BRIDGE_READ_ONLY_PLANNING")
            put("formulaAuthority", FormulaF8Gate.FORMULA_AUTHORITY)
            put("canonicalFormulaState", "NOT_EXECUTED")
            put("deviceState", if (androidCompatible) "ANDROID_COMPATIBLE" else "BLOCKED_OR_UNKNOWN")
            put("gpuState", gpuState)
            put("computeMode", "CPU_SAFE_FALLBACK")
            put("installerPlanState", installerState)
            put("provisioningState", "NOT_EXECUTED")
            put("automaticInstallAuthorized", false)
            put("gpuAutomaticallyEnabled", false)
            put("ownerApprovalRequired", true)
            put("reason", when {
                !observed -> "TRUSTED_ANDROID_PASSPORT_REQUIRED"
                !androidCompatible -> "ANDROID_PLATFORM_REQUIREMENTS_UNMET"
                !gpuQualified -> "GPU_PHYSICAL_QUALIFICATION_REQUIRED"
                else -> "QUALIFIED_GPU_REQUIRES_SEPARATE_AUTHORIZED_SELECTION"
            })
        }
    }
}
