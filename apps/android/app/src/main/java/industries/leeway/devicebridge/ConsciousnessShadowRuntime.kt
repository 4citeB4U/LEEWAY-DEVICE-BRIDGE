/*
LEEWAY HEADER — DO NOT REMOVE

REGION: LEEWAY.DEVICE.MACHINE_CONSCIOUSNESS
TAG: LEEWAY.DEVICE.MACHINE_CONSCIOUSNESS.L1_SHADOW

5WH:
WHAT = Observe-only live cognition shadow for Agent Lee phone chat
WHY = Measure real request/response state before granting cognition any response or action authority
WHO = Leeway Industries / Creator-authorized Agent Lee
WHERE = Android Device Bridge agent.chat path
WHEN = MC live integration L1
HOW = Request facts -> deterministic prediction -> unchanged response path -> actual result comparison -> receipt

AGENTS:
ASSESS
AUDIT
VERIFY

LICENSE:
MIT
*/
package industries.leeway.devicebridge

import android.content.Context
import org.json.JSONObject
import java.security.MessageDigest

internal object ConsciousnessShadowRuntime {
    private const val PREFS = "agent_lee_consciousness_shadow_v0"
    private const val KEY_ENABLED = "enabled"
    const val VERSION = "L1_SHADOW_V0"
    const val AUTHORITY = "OBSERVE_ONLY"

    data class Ticket(
        val requestHash: String,
        val stateHash: String,
        val predictedResponder: String,
        val predictedOk: Boolean,
        val startedAtMs: Long,
        val observation: JSONObject
    )

    fun enabled(context: Context): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean(KEY_ENABLED, false)

    fun status(context: Context): JSONObject = JSONObject().apply {
        put("ok", true)
        put("enabled", enabled(context))
        put("version", VERSION)
        put("authority", AUTHORITY)
        put("responseInfluence", false)
        put("memoryAuthority", false)
        put("actionAuthority", false)
        put("canonicalFormulaState", "NOT_EXECUTED")
        put("prismMappingState", "NOT_MAPPED_LIVE_EVIDENCE")
    }

    fun setEnabled(context: Context, value: Boolean): JSONObject {
        val before = enabled(context)
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean(KEY_ENABLED, value).commit()
        ReceiptStore.record(
            context,
            "consciousness.shadow.set",
            "PASS",
            "before=" + before + " after=" + value + " authority=" + AUTHORITY
        )
        return status(context).put("previousEnabled", before)
    }

    internal fun predictResponder(
        prompt: String,
        modelPresentAndSized: Boolean
    ): String = when {
        CreatorIdentityReply.matches(prompt) ->
            "USER_AUTHORIZED_CREATOR_PROFILE"
        AgentLeeBehaviorRuntime.directReply(prompt, 0) != null ->
            "AGENT_LEE_DETERMINISTIC_BEHAVIOR"
        modelPresentAndSized ->
            "PHONE_LOCAL_AGENT_CHAT"
        else ->
            "MODEL_UNAVAILABLE"
    }

    internal fun predictionError(
        predictedResponder: String,
        actualResponder: String,
        predictedOk: Boolean,
        actualOk: Boolean
    ): Int =
        (if (predictedResponder == actualResponder) 0 else 1) +
            (if (predictedOk == actualOk) 0 else 1)

    fun begin(context: Context, prompt: String): Ticket? {
        if (!enabled(context)) return null

        val startedAt = System.currentTimeMillis()
        val file = ModelRuntime.modelFile(context)
        val modelPresent = file.isFile
        val modelSizeMatches = modelPresent && file.length() == ModelRuntime.MODEL_SIZE_BYTES
        val agentAccess = LocalAuthority.agentAccessEnabled(context)
        val voice = VoiceRuntime.status(context)
        val responder = predictResponder(prompt, modelSizeMatches)
        val predictedOk = responder != "MODEL_UNAVAILABLE"

        val observation = JSONObject().apply {
            put("sourceClass", "LIVE_PHONE_SHADOW")
            put("promptChars", prompt.length)
            put("agentAccessEnabled", agentAccess)
            put("modelPresent", modelPresent)
            put("modelSizeMatches", modelSizeMatches)
            put("voiceReady", voice.optBoolean("ready"))
            put("formulaState", "NOT_EXECUTED")
            put("prismMappingState", "NOT_MAPPED_LIVE_EVIDENCE")
        }

        val requestHash = sha256(prompt.trim())
        val canonicalState = listOf(
            VERSION,
            requestHash,
            agentAccess.toString(),
            modelPresent.toString(),
            modelSizeMatches.toString(),
            voice.optBoolean("ready").toString(),
            responder,
            predictedOk.toString()
        ).joinToString("|")

        return Ticket(
            requestHash = requestHash,
            stateHash = sha256(canonicalState),
            predictedResponder = responder,
            predictedOk = predictedOk,
            startedAtMs = startedAt,
            observation = observation
        )
    }

    fun finish(context: Context, ticket: Ticket?, result: JSONObject): JSONObject {
        if (ticket == null) return result
        return try {
            val actualOk = result.optBoolean("ok")
            val actualAuthority = result.optString("authority")
            val modelExecuted = result.optBoolean("modelExecuted")
            val actualResponder = when {
                modelExecuted -> "PHONE_LOCAL_AGENT_CHAT"
                actualAuthority == "USER_AUTHORIZED_CREATOR_PROFILE" ->
                    "USER_AUTHORIZED_CREATOR_PROFILE"
                actualAuthority == "AGENT_LEE_DETERMINISTIC_BEHAVIOR" ->
                    "AGENT_LEE_DETERMINISTIC_BEHAVIOR"
                !actualOk && ticket.predictedResponder == "PHONE_LOCAL_AGENT_CHAT" ->
                    "PHONE_LOCAL_AGENT_CHAT"
                else -> actualAuthority.ifBlank { "UNKNOWN" }
            }
            val error = predictionError(
                ticket.predictedResponder,
                actualResponder,
                ticket.predictedOk,
                actualOk
            )
            val response = result.optString("response")
            val shadow = JSONObject().apply {
                put("status", "OBSERVED")
                put("version", VERSION)
                put("authority", AUTHORITY)
                put("stateHash", ticket.stateHash)
                put("requestHash", ticket.requestHash)
                put("predictedResponder", ticket.predictedResponder)
                put("actualResponder", actualResponder)
                put("predictedOk", ticket.predictedOk)
                put("actualOk", actualOk)
                put("predictionError", error)
                put("responseHash", if (response.isBlank()) JSONObject.NULL else sha256(response))
                put("elapsedMs", System.currentTimeMillis() - ticket.startedAtMs)
                put("observation", ticket.observation)
                put("responseInfluence", false)
                put("memoryAuthority", false)
                put("actionAuthority", false)
                put("canonicalFormulaState", "NOT_EXECUTED")
                put("prismMappingState", "NOT_MAPPED_LIVE_EVIDENCE")
            }
            ReceiptStore.record(
                context,
                "consciousness.shadow.observe",
                "OBSERVED",
                "stateHash=" + ticket.stateHash +
                    " predicted=" + ticket.predictedResponder +
                    " actual=" + actualResponder +
                    " predictionError=" + error
            )
            result.put("shadowCognition", shadow)
        } catch (error: Exception) {
            result.put(
                "shadowCognition",
                JSONObject()
                    .put("status", "FAILED_NON_BLOCKING")
                    .put("authority", AUTHORITY)
                    .put("responseInfluence", false)
                    .put("error", error.javaClass.simpleName)
            )
        }
    }

    private fun sha256(value: String): String =
        MessageDigest.getInstance("SHA-256")
            .digest(value.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
}
