package industries.leeway.devicebridge

import org.junit.Assert.*
import org.junit.Test

class ConversationPromptTest {
    @Test fun explicitUserQuestionExcludesLegacyAuthorityDump() {
        val question = "How do I write a JavaScript function?"
        val legacy = "LEEWAY AUTHORITY/BINDING SNAPSHOT secret long context"
        assertEquals(question, ConversationPrompt.userRequest(question, legacy))
        assertFalse(ConversationPrompt.systemInstruction().contains("SNAPSHOT"))
        assertTrue(ConversationPrompt.systemInstruction().contains("Agent Lee"))
        assertTrue(ConversationPrompt.systemInstruction().contains("directly and briefly"))
        assertFalse(ConversationPrompt.systemInstruction().contains("Formula"))
        assertFalse(ConversationPrompt.systemInstruction().contains("without"))
    }
    @Test fun explicitEmptyQuestionNeverFallsBackToAuthorityText() {
        assertEquals("", ConversationPrompt.userRequest("   ", "authority metadata"))
        assertEquals("legacy question", ConversationPrompt.userRequest(null, " legacy question "))
    }
    @Test fun creatorContextIsBoundedAndQuestionIsNotRewritten() {
        val base = ConversationPrompt.systemInstruction()
        assertEquals(base.length + 200, ConversationPrompt.systemInstruction("x".repeat(1000)).length)
        assertEquals("What is 7 times 8?", ConversationPrompt.userRequest("What is 7 times 8?", ""))
    }
}
