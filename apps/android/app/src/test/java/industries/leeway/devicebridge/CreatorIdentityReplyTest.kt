package industries.leeway.devicebridge

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class CreatorIdentityReplyTest {
    private fun profile() = JSONObject().put("creator", JSONObject()
        .put("name", "Leonard J. Lee")
        .put("relationship", "Creator of the LeeWay ecosystem")
        .put("classification", "USER_AUTHORIZED_PROFILE_CONTEXT_NOT_AUTHENTICATION"))
    @Test fun exactIdentityQuestionsUseProfileWithoutBiography() {
        listOf("Who created Agent Lee?", "who created you", " Who is your creator? ", "Who's your creator?").forEach {
            assertTrue(it, CreatorIdentityReply.matches(it))
        }
        assertEquals("Agent Lee was created by Leonard J. Lee, the creator of LeeWay.", CreatorIdentityReply.fromProfile(profile()))
    }
    @Test fun unrelatedAndLanguageQualifiedQuestionsRemainUnchanged() {
        listOf("Who created Linux?", "Who created you? Answer in Spanish.", "In French, who created Agent Lee?",
            "Who created Agent Lee and what did he study?", "Who is your creator's father?", "Say 'who created you'",
            "Who is Leonard Lee?", "Who created you??").forEach {
            assertFalse(it, CreatorIdentityReply.matches(it))
            assertEquals(it, ConversationPrompt.userRequest(it, ""))
        }
    }
    @Test fun missingAndUntrustedProfileNeverSupplyAnInventedName() {
        assertEquals("The verified creator profile is unavailable.", CreatorIdentityReply.fromProfile(null))
        val bad=profile(); bad.getJSONObject("creator").put("classification", "UNVERIFIED")
        assertEquals("The verified creator profile is unavailable.", CreatorIdentityReply.fromProfile(bad))
    }
}
