package industries.leeway.devicebridge

import org.junit.Assert.*
import org.junit.Test

class ConversationPromptTest {
    @Test fun explicitUserQuestionExcludesLegacyAuthorityDump() {
        val question = "How do I write a JavaScript function?"
        val legacy = "LEEWAY AUTHORITY/BINDING SNAPSHOT secret long context"
        assertEquals(question, ConversationPrompt.userRequest(question, legacy))
        val instruction = ConversationPrompt.systemInstruction()
        assertFalse(instruction.contains("SNAPSHOT"))
        assertTrue(instruction.contains("Agent Lee"))
        assertTrue(instruction.contains("persistent LeeWay-governed sovereign operator"))
        assertTrue(instruction.contains("LeeWay Formula is the decision spine"))
        assertTrue(instruction.contains("Mounted is not executed"))
    }

    @Test fun explicitEmptyQuestionNeverFallsBackToAuthorityText() {
        assertEquals("", ConversationPrompt.userRequest("   ", "authority metadata"))
        assertEquals("legacy question", ConversationPrompt.userRequest(null, " legacy question "))
    }

    @Test fun creatorContextIsBoundedAndQuestionIsNotRewritten() {
        val base = ConversationPrompt.systemInstruction()
        assertEquals(base.length + 200, ConversationPrompt.systemInstruction("x".repeat(1000)).length)
        assertEquals("What is 7 times 8?", ConversationPrompt.userRequest("What is 7 times 8?", ""))
        assertTrue(ConversationPrompt.systemInstruction().length < 3900)
    }

    @Test fun defaultsToEnglishWithoutOverridingExplicitLanguageRequests() {
        val instruction = ConversationPrompt.systemInstruction("The Creator is Leonard.")
        assertTrue(instruction.contains("Use English unless the user explicitly asks for another language."))
        assertTrue(instruction.endsWith("The Creator is Leonard."))
        val request = "Please answer in Spanish: what is two plus two?"
        assertEquals(request, ConversationPrompt.userRequest(request, "irrelevant authority context"))
        assertFalse(instruction.contains("English only"))
    }

    @Test fun formulaTruthAndEmotionBoundariesAreExplicit() {
        val instruction = ConversationPrompt.systemInstruction()
        assertTrue(instruction.contains("Six-bit binary represents exactly 64 basis patterns"))
        assertTrue(instruction.contains("states 64 through 69 require the extended QB64 representation"))
        assertTrue(instruction.contains("Do not lock to one emotion"))
        assertTrue(instruction.contains("Discovered is not authorized"))
        assertTrue(instruction.contains("after a third repeated accusation"))
    }
}
