package industries.leeway.devicebridge

import org.json.JSONArray
import org.json.JSONObject

object FormulaF8Gate {
    fun evaluate(
        trigger: Boolean,
        governance: Boolean,
        conditions: List<Boolean>
    ): JSONObject {
        val conditionsPresent = conditions.isNotEmpty()
        val conditionsPass = conditionsPresent && conditions.all { it }
        val localAuthorizationPassed = trigger && governance && conditionsPass

        return JSONObject().apply {
            put("family", "LW-F8")
            put("role", "LOCAL_PRE_GATE_ONLY")
            put("equation", "Fire_a(t)=T_a(t)G_a(t)product_j(C_a,j(t))")
            put("trigger", trigger)
            put("governance", governance)
            put("conditionsPresent", conditionsPresent)
            put("conditions", JSONArray(conditions))
            put("conditionsPass", conditionsPass)
            put("localAuthorizationPassed", localAuthorizationPassed)
            put("disposition", if (localAuthorizationPassed) "LOCAL_EXECUTE_ALLOWED" else "HOLD")
            put(
                "deviceBridgePolicy",
                if (conditionsPresent) "CONDITIONS_EVALUATED" else "EMPTY_CONDITIONS_BLOCKED"
            )
            put("formulaAuthority", "4citeB4U/Leeway-formula-live")
            put("formulaEvaluatorState", "UNEXPOSED")
            put("formulaExecutionState", "NOT_EXECUTED")
            put("q69ResultClaimed", false)
            put("canonicalPolicyGapClosed", false)
        }
    }
}
