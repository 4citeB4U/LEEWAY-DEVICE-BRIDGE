package industries.leeway.devicebridge

import org.junit.Assert.*
import org.junit.Test

class AndroidInstallPlanTest {
    private fun input(
        platform: String? = "android",
        url: String? = "https://example.org/agent.apk",
        sha: String? = "a".repeat(64),
        installer: Boolean = true,
        approved: Boolean = true,
    ) = AndroidInstallPlan.Input(platform, url, sha, installer, approved)

    @Test fun readyDoesNotClaimInstalled() {
        val d = AndroidInstallPlan.evaluate(input())
        assertEquals("READY_FOR_BROKER_PREFLIGHT", d.state)
        assertEquals("ANDROID_PACKAGE_INSTALLER", d.mechanism)
        assertTrue(d.mayHandoff)
    }

    @Test fun platformMismatchFailsClosed() {
        val d = AndroidInstallPlan.evaluate(input(platform = "ios"))
        assertEquals("UNSUPPORTED_PLATFORM", d.code)
        assertFalse(d.mayHandoff)
    }

    @Test fun unknownPlatformFailsClosed() {
        assertEquals("UNSUPPORTED_PLATFORM", AndroidInstallPlan.evaluate(input(platform = null)).code)
    }

    @Test fun httpFailsClosed() {
        assertEquals("HTTPS_REQUIRED", AndroidInstallPlan.evaluate(input(url = "http://example.org/x.apk")).code)
    }

    @Test fun missingHashFailsClosed() {
        assertEquals("PACKAGE_HASH_REQUIRED", AndroidInstallPlan.evaluate(input(sha = null)).code)
    }

    @Test fun unavailableInstallerFailsClosed() {
        assertEquals("ANDROID_INSTALLER_UNAVAILABLE", AndroidInstallPlan.evaluate(input(installer = false)).code)
    }

    @Test fun ownerApprovalIsMandatory() {
        val d = AndroidInstallPlan.evaluate(input(approved = false))
        assertEquals("AWAITING_AUTHORIZATION", d.state)
        assertEquals("OWNER_APPROVAL_REQUIRED", d.code)
        assertFalse(d.mayHandoff)
    }
}
