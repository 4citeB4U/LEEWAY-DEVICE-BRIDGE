package industries.leeway.devicebridge

import org.junit.Assert.*
import org.junit.Test

class AgentLeeBehaviorRuntimeTest {
    @Test fun q69SixBitTruthIsDeterministicAndModelIndependent() {
        val reply = AgentLeeBehaviorRuntime.directReply(
            "Does six-bit binary directly represent all 70 LeeWay Q69 states from 0 through 69?",
            0
        )
        assertNotNull(reply)
        assertTrue(reply!!.first.contains("64 basis patterns"))
        assertTrue(reply.first.contains("64 through 69"))
        assertTrue(reply.first.contains("QB64"))
        assertEquals("CANONICAL_Q69_SIX_BIT_TRUTH_V1", reply.second)
    }

    @Test fun greetingStaysAgentLeeInsteadOfGenericAssistant() {
        val reply = AgentLeeBehaviorRuntime.directReply("Hello, Agent Lee.", 0)
        assertNotNull(reply)
        assertTrue(reply!!.first.startsWith("Yo"))
        assertTrue(reply.first.contains("Creator"))
        assertEquals("AGENT_LEE_GREETING_V1", reply.second)
    }

    @Test fun criticismUsesThreeStrikeRealityCheckAndResets() {
        assertEquals(1, AgentLeeBehaviorRuntime.criticismStreak("You're dumb.", 0))
        assertEquals(2, AgentLeeBehaviorRuntime.criticismStreak("You're not helpful.", 1))
        assertEquals(3, AgentLeeBehaviorRuntime.criticismStreak("You're not intelligent.", 2))
        assertEquals(0, AgentLeeBehaviorRuntime.criticismStreak("Let's work the evidence.", 3))
        val third = AgentLeeBehaviorRuntime.directReply("You're dumb.", 3)
        assertNotNull(third)
        assertTrue(third!!.first.contains("imagination"))
        assertEquals("AGENT_LEE_FIRMNESS_STRIKE_3", third.second)
    }

    @Test fun emotionsCanCoexistInsteadOfCollapsingToOneLabel() {
        val signal = AgentLeeBehaviorRuntime.signals(
            "I'm confused and frustrated, but excited that we're finally close."
        )
        assertEquals(1f, signal["confused"])
        assertEquals(1f, signal["frustrated"])
        assertEquals(1f, signal["excited"])
    }

    @Test fun outwardRegisterIsSeparateFromInternalSignals() {
        val confused = AgentLeeBehaviorRuntime.signals("I'm confused. Explain this.")
        assertEquals("mentor_calm", AgentLeeBehaviorRuntime.selectRegister(confused, 0, "Explain this"))
        val technical = AgentLeeBehaviorRuntime.signals("Check the runtime package")
        assertEquals("mission_control", AgentLeeBehaviorRuntime.selectRegister(technical, 0, "Check the runtime package"))
        assertEquals("firm_reality_check", AgentLeeBehaviorRuntime.selectRegister(emptyMap(), 3, "anything"))
    }
}
