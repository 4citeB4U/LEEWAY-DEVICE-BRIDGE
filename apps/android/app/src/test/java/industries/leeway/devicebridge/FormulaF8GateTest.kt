package industries.leeway.devicebridge

import org.junit.Assert.*
import org.junit.Test

class FormulaF8GateTest {
    @Test fun everyMissingAdmissionConditionHolds() {
        for (mask in 0 until 16) {
            val result = FormulaF8Gate.evaluate(
                mask and 1 != 0, mask and 2 != 0,
                listOf(mask and 4 != 0, mask and 8 != 0)
            )
            assertEquals("mask=$mask", mask == 15, result.getBoolean("fire"))
            assertEquals(if (mask == 15) "EXECUTE" else "HOLD", result.getString("disposition"))
            assertFalse(result.getBoolean("canonicalFormulaExecuted"))
            assertEquals("NOT_EXECUTED", result.getString("canonicalFormulaState"))
            assertTrue(result.isNull("canonicalQ69"))
            assertFalse(result.has("qA"))
        }
    }

    @Test fun emptyConditionsCannotAuthorizeExecution() {
        val result = FormulaF8Gate.evaluate(true, true, emptyList())
        assertFalse(result.getBoolean("fire"))
        assertEquals("EMPTY_CONDITIONS_BLOCKED", result.getString("deviceBridgePolicy"))
    }
}
