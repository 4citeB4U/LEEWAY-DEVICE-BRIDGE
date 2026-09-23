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
        val fire = trigger && governance && conditionsPass
        val qA = if (fire) 69 else 0

        return JSONObject().apply {
            put("family", "LW-F8")
            put("equation", "Fire_a(t)=T_a(t)G_a(t)product_j(C_a,j(t))")
            put("trigger", trigger)
            put("governance", governance)
            put("conditionsPresent", conditionsPresent)
            put("conditions", JSONArray(conditions))
            put("conditionsPass", conditionsPass)
            put("fire", fire)
            put("qA", qA)
            put("disposition", if (qA == 69) "EXECUTE" else "HOLD")
            put(
                "deviceBridgePolicy",
                if (conditionsPresent) "CONDITIONS_EVALUATED" else "EMPTY_CONDITIONS_BLOCKED"
            )
            put("canonicalPolicyGapClosed", false)
        }
    }
}
