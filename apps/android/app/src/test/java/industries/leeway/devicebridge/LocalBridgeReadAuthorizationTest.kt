package industries.leeway.devicebridge

import org.junit.Assert.*
import org.junit.Test

/** Pure authorization tests. Full HTTP transport requires separate instrumentation. */
class LocalBridgeReadAuthorizationTest {
    @Test fun disabledAgentAccessIsForbiddenEvenIfTokenWouldMatch() {
        val d = LocalBridgeReadAuthorization.evaluate(false, true)
        assertEquals(403, d.status)
        assertEquals("AGENT_ACCESS_DISABLED", d.error)
    }

    @Test fun enabledAgentAccessMissingOrBadTokenIsUnauthorized() {
        val d = LocalBridgeReadAuthorization.evaluate(true, false)
        assertEquals(401, d.status)
        assertEquals("UNAUTHORIZED", d.error)
    }

    @Test fun bothChecksRequiredForSuccess() {
        val d = LocalBridgeReadAuthorization.evaluate(true, true)
        assertEquals(200, d.status)
        assertNull(d.error)
    }

    @Test fun noCredentialNeverSucceedsWithoutGovernance() {
        assertEquals(403, LocalBridgeReadAuthorization.evaluate(false, false).status)
    }
}
