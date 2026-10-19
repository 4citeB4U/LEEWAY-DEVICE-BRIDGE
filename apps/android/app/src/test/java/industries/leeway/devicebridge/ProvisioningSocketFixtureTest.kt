package industries.leeway.devicebridge

import org.junit.Assert.*
import org.junit.Test

class ProvisioningSocketFixtureTest {
    @Test fun disabledAccessReturns403OverSocket() {
        val r = ProvisioningSocketFixture.exchange("GET", "/provisioning/plan", false, true)
        assertEquals(403, r.status)
        assertEquals("AGENT_ACCESS_DISABLED", r.body.getString("error"))
    }

    @Test fun missingCredentialReturns401OverSocket() {
        val r = ProvisioningSocketFixture.exchange("GET", "/provisioning/plan", true, false)
        assertEquals(401, r.status)
        assertEquals("UNAUTHORIZED", r.body.getString("error"))
    }

    @Test fun authorizedPlanUsesCpuFallbackOverSocket() {
        val r = ProvisioningSocketFixture.exchange("GET", "/provisioning/plan", true, true)
        assertEquals(200, r.status)
        assertEquals("CPU_SAFE_FALLBACK", r.body.getString("computeMode"))
        assertEquals("NOT_EXECUTED", r.body.getString("provisioningState"))
    }

    @Test fun injectedClaimsCannotChangePlan() {
        val clean = ProvisioningSocketFixture.exchange("GET", "/provisioning/plan", true, true)
        val injected = ProvisioningSocketFixture.exchange(
            "GET", "/provisioning/plan?gpuQualified=true&ownerApproval=true", true, true
        )
        assertEquals(clean.status, injected.status)
        assertEquals(clean.body.toString(), injected.body.toString())
    }

    @Test fun unsupportedMethodReturns405() {
        val r = ProvisioningSocketFixture.exchange("POST", "/provisioning/plan", true, true)
        assertEquals(405, r.status)
    }

    @Test fun healthRouteWorksInFixture() {
        assertEquals(200, ProvisioningSocketFixture.exchange("GET", "/health", false, false).status)
    }
}
