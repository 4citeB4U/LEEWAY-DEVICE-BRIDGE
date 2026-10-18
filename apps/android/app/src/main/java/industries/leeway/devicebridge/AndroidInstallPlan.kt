package industries.leeway.devicebridge

/**
 * Deterministic, side-effect-free Android installation preflight for Issue #37.
 * Does not install, request privileges, download, or claim installation success.
 */
object AndroidInstallPlan {
    data class Input(
        val platform: String?,
        val url: String?,
        val sha256: String?,
        val installerAvailable: Boolean,
        val ownerApproval: Boolean,
    )

    data class Decision(
        val state: String,
        val code: String,
        val mechanism: String = "ANDROID_PACKAGE_INSTALLER",
        val mayHandoff: Boolean = false,
    )

    fun evaluate(input: Input): Decision {
        if (input.platform?.lowercase() != "android") {
            return Decision("BLOCKED", "UNSUPPORTED_PLATFORM")
        }
        val source = input.url?.trim().orEmpty()
        if (!source.startsWith("https://", ignoreCase = true)) {
            return Decision("BLOCKED", "HTTPS_REQUIRED")
        }
        val digest = input.sha256?.trim().orEmpty()
        if (!Regex("^[a-fA-F0-9]{64}$").matches(digest)) {
            return Decision("BLOCKED", "PACKAGE_HASH_REQUIRED")
        }
        if (!input.installerAvailable) {
            return Decision("BLOCKED", "ANDROID_INSTALLER_UNAVAILABLE")
        }
        if (!input.ownerApproval) {
            return Decision("AWAITING_AUTHORIZATION", "OWNER_APPROVAL_REQUIRED")
        }
        return Decision("READY_FOR_BROKER_PREFLIGHT", "READY", mayHandoff = true)
    }
}
