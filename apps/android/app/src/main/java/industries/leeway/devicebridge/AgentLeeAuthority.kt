package industries.leeway.devicebridge

import android.content.Context
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

object AgentLeeAuthority {
    private const val PREFS = "leeway_agent_lee_authority"
    private const val RAW_SKILLS = "https://raw.githubusercontent.com/4citeB4U/LeeWay-Agent-Skills/main/"
    private const val RAW_FORMULA = "https://raw.githubusercontent.com/4citeB4U/Leeway-formula-live/main/"
    private const val RAW_DEVICE = "https://raw.githubusercontent.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/main/"
    private const val RUNTIME_HEALTH = "https://leeway-runtime-fabric.fly.dev/runtime/health"

    private val client = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .build()

    data class SkillBinding(val id: String, val path: String)

    fun selectFocalSkill(prompt: String): SkillBinding {
        val q = prompt.lowercase()
        return when {
            listOf("voice", "speak", "talk", "microphone", "mic", "audio").any(q::contains) ->
                SkillBinding("leeway-voice-fabric", "skills/leeway-voice-fabric/SKILL.md")
            listOf("phone", "workstation", "device", "android", "fold").any(q::contains) ->
                SkillBinding("leeway-secondary-workstation", "skills/leeway-secondary-workstation/SKILL.md")
            listOf("truck", "load", "freight", "dispatch", "broker").any(q::contains) ->
                SkillBinding("logistics-dispatch", "skills/work-domains/logistics-dispatch/SKILL.md")
            listOf("code", "build", "github", "repository", "repo", "debug", "test").any(q::contains) ->
                SkillBinding("leeway-developer-workflow", "skills/enterprise/leeway-developer-workflow/SKILL.md")
            else ->
                SkillBinding("leeway-human-conversation", "skills/leeway-human-conversation/SKILL.md")
        }
    }

    fun buildContext(context: Context, prompt: String): JSONObject {
        val focal = selectFocalSkill(prompt)
        val sources = JSONArray()
        val core = fetchCached(context, RAW_SKILLS + "config/leeway-core-governance.yaml", 5000, sources)
        val skill = fetchCached(context, RAW_SKILLS + focal.path, 6000, sources)
        val formula = fetchCached(context, RAW_FORMULA + "contracts/evaluator-contract.yaml", 2600, sources)
        val device = fetchCached(context, RAW_DEVICE + "docs/llm-entrypoint.json", 2600, sources)
        val runtime = fetchPlain(RUNTIME_HEALTH, 1200)

        val authorityText = buildString {
            appendLine("IDENTITY: Agent Lee on the LeeWay Phone Secondary Workstation.")
            appendLine("AUTHORITY: Creator/Human Authority > LeeWay Standards > Root of Trust > Runtime Fabric > Agent Lee > Harness > Formula > models/skills/tools > execution > Veritas > receipt > Learning Ledger.")
            appendLine("TRUTH LAW: mounted != executed; running != healthy; configured != proven; model output != proof.")
            appendLine("FORMULA_EVALUATOR_STATE=UNEXPOSED unless a verified evaluator response is explicitly attached.")
            appendLine("FORMULA_EXECUTION_STATE=NOT_EXECUTED. Never invent Q69, C64, rankings, hashes, Formula results, receipts, or tool execution.")
            appendLine("Use the focal skill as behavioral guidance. Do not claim a capability executed unless a real adapter result is present.")
            appendLine()
            appendLine("[CORE GOVERNANCE]")
            appendLine(core)
            appendLine()
            appendLine("[FOCAL SKILL " + focal.id + "]")
            appendLine(skill)
            appendLine()
            appendLine("[FORMULA CONTRACT]")
            appendLine(formula)
            appendLine()
            appendLine("[DEVICE BRIDGE ENTRYPOINT]")
            appendLine(device)
            appendLine()
            appendLine("[RUNTIME FABRIC HEALTH OBSERVATION]")
            appendLine(runtime ?: "UNVERIFIED_OR_UNREACHABLE")
        }

        val state = if (sources.length() >= 3) "VERIFIED_SOURCE_RETRIEVAL" else "PARTIAL_SOURCE_RETRIEVAL"
        ReceiptStore.record(
            context.applicationContext,
            "agent.authority.context",
            if (sources.length() >= 3) "PASS" else "BLOCKED",
            "focalSkill=" + focal.id + " sources=" + sources.length() + " formula=NOT_EXECUTED"
        )
        return JSONObject().apply {
            put("ok", true)
            put("focalSkill", focal.id)
            put("focalSkillPath", focal.path)
            put("authorityState", state)
            put("formulaEvaluatorState", "UNEXPOSED")
            put("formulaExecutionState", "NOT_EXECUTED")
            put("sources", sources)
            put("runtimeHealth", runtime ?: JSONObject.NULL)
            put("context", authorityText)
        }
    }

    private fun fetchCached(
        context: Context,
        url: String,
        maxChars: Int,
        sources: JSONArray
    ): String {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val key = "cache_" + url.hashCode().toString()
        val fresh = fetchPlain(url, maxChars)
        if (fresh != null) {
            prefs.edit().putString(key, fresh).apply()
            sources.put(url)
            return fresh
        }
        val cached = prefs.getString(key, null)
        if (!cached.isNullOrBlank()) {
            sources.put(url + "#cached")
            return cached.take(maxChars)
        }
        return "SOURCE_UNAVAILABLE: " + url
    }

    private fun fetchPlain(url: String, maxChars: Int): String? = try {
        val request = Request.Builder().url(url).header("Cache-Control", "no-cache").build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return null
            response.body?.string()?.take(maxChars)
        }
    } catch (_: Exception) {
        null
    }
}
