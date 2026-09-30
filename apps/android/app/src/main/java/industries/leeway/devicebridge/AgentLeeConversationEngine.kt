package industries.leeway.devicebridge

import android.content.Context
import org.json.JSONObject

object AgentLeeConversationEngine {
    fun chat(context: Context, prompt: String, speak: Boolean = true): JSONObject {
        val clean = prompt.trim()
        if (clean.isEmpty()) return JSONObject().apply {
            put("ok", false)
            put("error", "PROMPT_REQUIRED")
        }

        val governedPrompt = EcosystemAuthorityContext.promptPrefix() +
            "\n\nUSER REQUEST:\n" + clean
        val generated = ModelRuntime.generate(context, governedPrompt)
        if (!generated.optBoolean("ok")) return generated

        val response = generated.optString("response").trim()
        val voice = if (speak && response.isNotEmpty()) {
            VoiceRuntime.speak(context, response)
        } else {
            JSONObject().put("ok", true).put("accepted", false).put("spoken", false)
        }

        ReceiptStore.record(
            context,
            "agent.chat",
            "PASS",
            "model=" + generated.optString("modelId") +
                " voiceState=" + voice.optString("state", "NOT_REQUESTED") +
                " formulaExecution=NOT_EXECUTED skillExecution=NOT_EXECUTED"
        )

        return JSONObject().apply {
            put("ok", true)
            put("prompt", clean)
            put("response", response)
            put("modelId", generated.optString("modelId"))
            put("elapsedMs", generated.optLong("elapsedMs"))
            put("voice", voice)
            put("ecosystem", EcosystemAuthorityContext.status())
            put("authority", "PHONE_LOCAL_AGENT_FALLBACK")
            put("formulaExecution", "NOT_EXECUTED")
            put("skillExecution", "NOT_EXECUTED")
        }
    }
}
