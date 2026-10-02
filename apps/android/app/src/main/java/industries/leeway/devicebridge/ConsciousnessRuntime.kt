package industries.leeway.devicebridge

import android.content.Context
import org.json.JSONObject
import kotlin.math.sqrt

object ConsciousnessRuntime {
    enum class Mode { OFF, SHADOW, ADVISORY }
    private const val PREFS = "leeway_consciousness_v0"
    private const val MODE = "mode"
    private const val CYCLES = "cycles"

    fun mode(context: Context): Mode {
        val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(MODE, Mode.OFF.name) ?: Mode.OFF.name
        return runCatching { Mode.valueOf(raw) }.getOrDefault(Mode.OFF)
    }

    fun setMode(context: Context, mode: Mode): JSONObject {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(MODE, mode.name).apply()
        ReceiptStore.record(context, "consciousness.mode", "PASS", "mode=" + mode.name)
        return status(context)
    }

    fun nextMode(context: Context): JSONObject {
        val next = when (mode(context)) {
            Mode.OFF -> Mode.SHADOW
            Mode.SHADOW -> Mode.ADVISORY
            Mode.ADVISORY -> Mode.OFF
        }
        return setMode(context, next)
    }

    fun status(context: Context): JSONObject {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return JSONObject().apply {
            put("ok", true)
            put("mode", mode(context).name)
            put("cycles", prefs.getLong(CYCLES, 0L))
            put("llmDependencyForRuntime", 0)
            put("formulaAuthority", "NOT_BOUND_LIVE")
            put("geometry", "SIX_POINT_OPERATIONAL_CANDIDATE_V0")
            put("liveActionAuthority", false)
        }
    }

    fun observe(context: Context, prompt: String): JSONObject {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val cycle = prefs.getLong(CYCLES, 0L) + 1L
        prefs.edit().putLong(CYCLES, cycle).apply()

        val model = ModelRuntime.status(context)
        val deterministic = deterministicAnswer(context, prompt)
        val world = if (LocalBridgeServer.isRunning()) 1.0 else 0.0
        val self = if (model.optBoolean("verified")) 1.0 else 0.0
        val memory = cycle.coerceAtMost(16L).toDouble() / 16.0
        val prediction = if (deterministic != null) 1.0 else 0.5
        val goal = 1.0
        val constraint = if (model.optBoolean("busy")) 1.0 else 0.0
        val axis = doubleArrayOf(world - self, prediction - memory, goal - constraint)
        val balance = sqrt(axis.sumOf { it * it })

        val state = JSONObject().apply {
            put("cycle", cycle)
            put("mode", mode(context).name)
            put("world", world); put("self", self); put("memory", memory)
            put("prediction", prediction); put("goal", goal); put("constraint", constraint)
            put("axisWorldSelf", axis[0])
            put("axisPredictionMemory", axis[1])
            put("axisGoalConstraint", axis[2])
            put("balanceMagnitude", balance)
            put("deterministicRouteAvailable", deterministic != null)
            put("provenance", "PHONE_LIVE_OPERATIONAL_CANDIDATE")
            put("formulaState", "NOT_BOUND_LIVE")
        }
        ReceiptStore.record(
            context, "consciousness.observe", "OBSERVED",
            "cycle=" + cycle + " mode=" + mode(context).name +
                " balance=" + balance + " deterministic=" + (deterministic != null)
        )
        return state
    }

    fun advisoryAnswer(context: Context, prompt: String): JSONObject? {
        if (mode(context) != Mode.ADVISORY) return null
        return deterministicAnswer(context, prompt)
    }

    private fun deterministicAnswer(context: Context, prompt: String): JSONObject? {
        val q = prompt.trim()
        arithmetic(q)?.let { value ->
            return JSONObject().apply {
                put("ok", true); put("response", value)
                put("authority", "DETERMINISTIC_ARITHMETIC_V0")
                put("modelExecuted", false)
            }
        }

        val lower = q.lowercase()
        if (lower.contains("what model") && (lower.contains("installed") || lower.contains("using"))) {
            val st = ModelRuntime.status(context)
            val answer = if (st.optBoolean("verified"))
                st.optString("modelId") + " is installed and hash-verified on this phone."
            else "The phone-local model is not currently verified."
            return JSONObject().apply {
                put("ok", true); put("response", answer)
                put("authority", "VERIFIED_PHONE_MODEL_STATUS")
                put("modelExecuted", false); put("evidence", st)
            }
        }
        return null
    }

    private fun arithmetic(input: String): String? {
        val cleaned = input.lowercase()
            .replace("what is", "").replace("calculate", "")
            .replace("?", "").trim()
        val m = Regex("""^(-?\d+(?:\.\d+)?)\s*([+\-*/])\s*(-?\d+(?:\.\d+)?)$""")
            .matchEntire(cleaned) ?: return null
        val a = m.groupValues[1].toDouble()
        val op = m.groupValues[2]
        val b = m.groupValues[3].toDouble()
        if (op == "/" && b == 0.0) return null
        val v = when (op) {
            "+" -> a + b; "-" -> a - b; "*" -> a * b; "/" -> a / b
            else -> return null
        }
        return if (v % 1.0 == 0.0) v.toLong().toString() else v.toString()
    }
}