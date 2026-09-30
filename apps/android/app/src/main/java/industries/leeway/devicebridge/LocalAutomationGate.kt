package industries.leeway.devicebridge

import org.json.JSONArray
import org.json.JSONObject

/**
 * Local authorization gate only.
 *
 * This is intentionally NOT the canonical LeeWay Formula evaluator. It may
 * reference the F8 automation family as policy lineage, but it never emits Q69
 * or claims Formula execution.
 */
object LocalAutomationGate {
    fun evaluate(
        trigger: Boolean,
        governance: Boolean,
        conditions: List<Boolean>
    ): JSONObject {
        val conditionsPresent = conditions.isNotEmpty()
        val conditionsPass = conditionsPresent && conditions.all { it }
        val allow = trigger && governance && conditionsPass

        return JSONObject().apply {
            put("gate", "LEEWAY_LOCAL_AUTOMATION_GATE_V1")
            put("formulaFamilyReference", "LW-F8")
            put("formulaExecution", "NOT_EXECUTED")
            put("trigger", trigger)
            put("governance", governance)
            put("conditionsPresent", conditionsPresent)
            put("conditions", JSONArray(conditions))
            put("conditionsPass", conditionsPass)
            put("allow", allow)
            put("disposition", if (allow) "ALLOW" else "HOLD")
            put(
                "deviceBridgePolicy",
                if (conditionsPresent) "CONDITIONS_EVALUATED" else "EMPTY_CONDITIONS_BLOCKED"
            )
            put("canonicalFormulaRequiredForFormulaClaim", true)
            put("evidenceState", "LOCAL_POLICY_EVALUATED")
        }
    }
}
