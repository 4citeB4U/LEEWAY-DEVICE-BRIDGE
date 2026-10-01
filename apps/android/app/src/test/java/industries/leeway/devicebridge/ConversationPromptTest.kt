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
    @Test fun defaultsToEnglishWithoutOverridingExplicitLanguageRequests() {
        val instruction = ConversationPrompt.systemInstruction("The Creator is Leonard.")
        assertTrue(instruction.contains("Use English unless the user explicitly asks for another language."))
        assertTrue(instruction.endsWith("The Creator is Leonard."))
        assertTrue(ConversationPrompt.systemInstruction().length < 180)
        val request = "Please answer in Spanish: what is two plus two?"
        assertEquals(request, ConversationPrompt.userRequest(request, "irrelevant authority context"))
        assertFalse(instruction.contains("English only"))
    }
}
