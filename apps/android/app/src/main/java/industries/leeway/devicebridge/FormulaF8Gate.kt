package industries.leeway.devicebridge

import org.json.JSONObject

/**
 * Legacy compatibility marker.
 *
 * Device Bridge no longer synthesizes Q69 or Formula results locally. Formula
 * claims require execution evidence from the canonical Leeway-formula-live
 * evaluator. Local command authorization uses LocalAutomationGate instead.
 */
@Deprecated("Not a Formula evaluator. Use LocalAutomationGate for local authorization.")
object FormulaF8Gate {
    fun unavailable(): JSONObject = JSONObject().apply {
        put("ok", false)
        put("error", "CANONICAL_FORMULA_EVALUATOR_REQUIRED")
        put("formulaAuthority", "4citeB4U/Leeway-formula-live")
        put("formulaExecution", "NOT_EXECUTED")
        put("evidenceState", "BLOCKED")
    }
}
