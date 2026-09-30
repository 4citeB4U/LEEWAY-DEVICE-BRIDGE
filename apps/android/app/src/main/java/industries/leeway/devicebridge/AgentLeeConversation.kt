package industries.leeway.devicebridge

import android.content.Context
import org.json.JSONObject

object AgentLeeConversation {
    fun respond(context: Context, userPrompt: String, speak: Boolean = true): JSONObject {
        val clean = userPrompt.trim()
        if (clean.isEmpty()) return JSONObject().put("ok", false).put("error", "PROMPT_REQUIRED")

        val authority = AgentLeeAuthority.buildContext(context, clean)
        val governedPrompt = buildString {
            append(authority.optString("context"))
            appendLine()
            appendLine("[USER REQUEST]")
            appendLine(clean)
            appendLine()
            appendLine("[RESPONSE CONTRACT]")
            appendLine("Answer as Agent Lee. Preserve Creator authority and the LeeWay execution law.")
            appendLine("If no real tool/runtime result is attached, discuss or plan only; do not claim execution.")
            appendLine("State Formula as NOT_EXECUTED when the evaluator is unexposed.")
        }

        val generated = ModelRuntime.generate(context, governedPrompt)
        if (!generated.optBoolean("ok")) {
            ReceiptStore.record(context, "agent.chat", "FAIL", "phone-local governed model failed")
            return JSONObject().apply {
                put("ok", false)
                put("error", generated.optString("error", "MODEL_FAILED"))
                put("model", generated)
                put("authority", authority)
            }
        }

        val response = generated.optString("response").trim()
        val voice = if (speak && response.isNotBlank()) VoiceRuntime.speak(context, response)
            else JSONObject().put("ok", true).put("spoken", false).put("verified", false)

        ReceiptStore.record(
            context,
            "agent.chat",
            "PASS",
            "model=" + generated.optString("modelId") +
                " focalSkill=" + authority.optString("focalSkill") +
                " voiceVerified=" + voice.optBoolean("verified", false) +
                " formula=NOT_EXECUTED"
        )
        return JSONObject().apply {
            put("ok", true)
            put("prompt", clean)
            put("response", response)
            put("modelId", generated.optString("modelId"))
            put("elapsedMs", generated.optLong("elapsedMs"))
            put("focalSkill", authority.optString("focalSkill"))
            put("skillAuthorityState", authority.optString("authorityState"))
            put("formulaEvaluatorState", authority.optString("formulaEvaluatorState"))
            put("formulaExecutionState", authority.optString("formulaExecutionState"))
            put("runtimeHealth", authority.opt("runtimeHealth"))
            put("voice", voice)
            put("authority", "PHONE_LOCAL_AGENT_LEE_GOVERNED_CONTEXT")
        }
    }
}
