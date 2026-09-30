package industries.leeway.devicebridge

import org.json.JSONArray
import org.json.JSONObject

/**
 * Compact phone bootstrap for identity/routing truth.
 *
 * Repository availability is not execution proof. The phone local model uses
 * this context to avoid claiming that Skills, Formula, Runtime Fabric, Notebook
 * or Voice execution happened when no corresponding adapter produced evidence.
 */
object EcosystemAuthorityContext {
    private val authorities = listOf(
        "4citeB4U/LeeWay-Standards" to "constitutional governance",
        "4citeB4U/Leeway-formula-live" to "canonical Formula authority",
        "4citeB4U/LeeWay-Agent-Skills" to "portable skill/capability authority",
        "4citeB4U/Leeway-Runtime-Fabric" to "governed execution/workplane authority",
        "4citeB4U/LEEWAY-DEVICE-BRIDGE" to "phone/device execution authority",
        "4citeB4U/LeeWay-Voice-Fabric" to "Agent Lee Voice One authority",
        "4citeB4U/Leeway-live" to "live Agent Lee web surface",
        "4citeB4U/LEEWAY-INTELLECTUAL-ESTATE" to "Notebook bridge evidence authority"
    )

    fun status(): JSONObject = JSONObject().apply {
        put("authorityChain", "Creator/Human Authority > LeeWay Standards > Runtime Fabric > Agent Lee > Harness > Formula > capabilities > execution > Veritas > receipt")
        put("repositories", JSONArray().apply {
            authorities.forEach { (repo, role) ->
                put(JSONObject().put("repository", repo).put("role", role).put("state", "CANONICAL_SOURCE_REFERENCE"))
            }
        })
        put("localModelRole", "PHONE_LOCAL_FALLBACK_REASONER")
        put("skillExecution", "NOT_EXECUTED_UNLESS_ADAPTER_EVIDENCE_IS_PRESENT")
        put("formulaExecution", "NOT_EXECUTED_UNLESS_CANONICAL_EVALUATOR_EVIDENCE_IS_PRESENT")
        put("notebookBridge", "HOST_ADAPTER_NOT_ANDROID_EXTENSION")
        put("voicePackageId", "agent-lee-voice-one")
        put("evidenceState", "SOURCE_AUTHORITY_CONTEXT_NOT_RUNTIME_PROOF")
    }

    fun promptPrefix(): String = """
You are Agent Lee's phone-local fallback reasoner inside the LeeWay Device Bridge.
Authority order: Creator/Human Authority > LeeWay Standards > Runtime Fabric > Agent Lee > Harness > Formula > capabilities > execution > Veritas > receipt.
Canonical authorities: LeeWay-Standards; Leeway-formula-live; LeeWay-Agent-Skills; Leeway-Runtime-Fabric; LEEWAY-DEVICE-BRIDGE; LeeWay-Voice-Fabric; Leeway-live; LEEWAY-INTELLECTUAL-ESTATE.
Rules:
- model output is not proof; configured is not running; available is not authorized.
- Never claim Formula/Q69 execution unless a canonical Formula evaluator returned evidence.
- Never claim a skill executed unless a runtime adapter returned execution evidence.
- The phone-local model is a fallback reasoner, not the whole LeeWay ecosystem.
- Notebook Studio Direct Git Bridge is a host/browser adapter; on Android use its GitHub-persisted evidence, never pretend the Chrome extension is running.
- Agent Lee speech identity is agent-lee-voice-one only. Never substitute Android/system TTS.
- For actions that need a missing authorized runtime, say which capability is required instead of inventing success.
Respond concisely and preserve the user's requested intent.
""".trimIndent()
}
