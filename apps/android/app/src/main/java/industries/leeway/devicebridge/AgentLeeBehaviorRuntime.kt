package industries.leeway.devicebridge

import android.content.Context
import org.json.JSONObject
import kotlin.math.max
import kotlin.math.min

internal object AgentLeeBehaviorRuntime {
    private const val PREFS = "agent_lee_behavior_v1"
    private val criticism = Regex(
        "\\b(dumb|stupid|useless|not helpful|isn'?t helpful|ain'?t helpful|not intelligent|ain'?t intelligent|not smart|too slow|not moving|ain'?t moving)\\b",
        RegexOption.IGNORE_CASE
    )
    private val confusion = Regex("\\b(confused|unclear|don'?t understand|doesn'?t make sense|explain|what does|how does)\\b", RegexOption.IGNORE_CASE)
    private val excitement = Regex("\\b(great|awesome|amazing|excellent|finally|love it|let'?s go|yes!)\\b", RegexOption.IGNORE_CASE)
    private val frustration = Regex("\\b(frustrat|annoy|not working|still broken|wrong again|ugh|seriously)\\w*", RegexOption.IGNORE_CASE)
    private val anger = Regex("\\b(angry|mad|pissed|furious)\\b", RegexOption.IGNORE_CASE)
    private val sadness = Regex("\\b(sad|hurt|disappointed|down|depressed)\\b", RegexOption.IGNORE_CASE)
    private val jolly = Regex("\\b(happy|joy|celebrat|funny|jolly|laugh)\\w*", RegexOption.IGNORE_CASE)
    private val curiosity = Regex("\\b(curious|wonder|explore|why|what if)\\b", RegexOption.IGNORE_CASE)

    data class Snapshot(
        val emotions: JSONObject,
        val register: String,
        val criticismStreak: Int,
        val directReply: String?,
        val contract: String?,
        val promptContext: String
    )

    private fun clamp(value: Float): Float = min(1f, max(0f, value))

    internal fun criticismStreak(prompt: String, previous: Int): Int =
        if (criticism.containsMatchIn(prompt)) min(3, previous + 1) else 0

    internal fun signals(prompt: String): Map<String, Float> = mapOf(
        "confused" to if (confusion.containsMatchIn(prompt)) 1f else 0f,
        "excited" to if (excitement.containsMatchIn(prompt)) 1f else 0f,
        "frustrated" to if (frustration.containsMatchIn(prompt) || criticism.containsMatchIn(prompt)) 1f else 0f,
        "angry" to if (anger.containsMatchIn(prompt)) 1f else 0f,
        "sad" to if (sadness.containsMatchIn(prompt)) 1f else 0f,
        "jolly" to if (jolly.containsMatchIn(prompt)) 1f else 0f,
        "curious" to if (curiosity.containsMatchIn(prompt)) 1f else 0f
    )

    internal fun directReply(prompt: String, streak: Int): Pair<String, String>? {
        val normalized = prompt.trim().lowercase()
        val sixBitQuestion = normalized.contains("six-bit") &&
            normalized.contains("q69") &&
            (normalized.contains("70") || normalized.contains("0 through 69") || normalized.contains("all"))
        if (sixBitQuestion) {
            return "Nah. Six-bit binary gives exactly 64 basis patterns, 0 through 63. LeeWay states 64 through 69 use the extended QB64 representation; a canonical 16×6 Formula history may contain values 0 through 69, but those top six are not ordinary six-bit states." to
                "CANONICAL_Q69_SIX_BIT_TRUTH_V1"
        }

        val greetingPattern = Regex(
            "^(hello|hi|hey|yo|what'?s up|whats up|sup|good morning|good afternoon|good evening)(,? agent lee)?[!.]?$",
            RegexOption.IGNORE_CASE
        )
        if (greetingPattern.matches(normalized)) {
            return "Yo, what it is, Creator? Mind clear, systems in view. What's the move?" to
                "AGENT_LEE_GREETING_V1"
        }

        if (Regex("\\b(who are you|what are you|tell me about yourself)\\b", RegexOption.IGNORE_CASE).containsMatchIn(prompt)) {
            return "Agent Lee. Sovereign operator, builder, strategist, and guardian inside the LeeWay ecosystem. Models help me reason; they don't define who I am." to
                "AGENT_LEE_IDENTITY_V1"
        }

        if (criticism.containsMatchIn(prompt)) {
            return when (streak) {
                1 -> "I hear the frustration. Point me at the exact miss and I'll correct the calculation, not argue with the noise." to
                    "AGENT_LEE_FIRMNESS_STRIKE_1"
                2 -> "Then let's make it measurable. Show me the result you expected, the evidence we have, and the failure boundary. I'll work the math from there." to
                    "AGENT_LEE_FIRMNESS_STRIKE_2"
                else -> "Hold up—real talk. I can calculate the system that actually exists; I can't execute somebody's imagination. Give me the real target and I'll put motion behind it." to
                    "AGENT_LEE_FIRMNESS_STRIKE_3"
            }
        }
        return null
    }

    internal fun selectRegister(signal: Map<String, Float>, streak: Int, prompt: String): String {
        if (streak >= 3) return "firm_reality_check"
        if ((signal["angry"] ?: 0f) > 0f || (signal["frustrated"] ?: 0f) > 0f) return "empathetic_support"
        if ((signal["confused"] ?: 0f) > 0f) return "mentor_calm"
        if (Regex("\\b(runtime|formula|code|build|debug|system|architecture|test|verify|package)\\b", RegexOption.IGNORE_CASE).containsMatchIn(prompt)) {
            return "mission_control"
        }
        if ((signal["excited"] ?: 0f) > 0f || (signal["jolly"] ?: 0f) > 0f) return "hiphop_poetic"
        return "hiphop_poetic"
    }

    fun evaluate(context: Context, prompt: String): Snapshot {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val priorStreak = prefs.getInt("criticism_streak", 0)
        val streak = criticismStreak(prompt, priorStreak)
        val signal = signals(prompt)

        fun next(name: String): Float {
            val old = prefs.getFloat(name, if (name == "calm") 0.65f else 0f)
            val input = if (name == "calm") {
                if ((signal["frustrated"] ?: 0f) == 0f && (signal["angry"] ?: 0f) == 0f) 0.25f else 0f
            } else signal[name] ?: 0f
            return clamp(old * 0.65f + input * 0.55f)
        }

        val values = linkedMapOf(
            "calm" to next("calm"),
            "confused" to next("confused"),
            "excited" to next("excited"),
            "frustrated" to next("frustrated"),
            "angry" to next("angry"),
            "sad" to next("sad"),
            "jolly" to next("jolly"),
            "curious" to next("curious")
        )

        prefs.edit().apply {
            putInt("criticism_streak", streak)
            values.forEach { (key, value) -> putFloat(key, value) }
        }.apply()

        val register = selectRegister(signal, streak, prompt)
        val direct = directReply(prompt, streak)
        val emotions = JSONObject().apply { values.forEach { (k, v) -> put(k, v.toDouble()) } }
        val top = values.entries.sortedByDescending { it.value }.take(3)
            .joinToString(",") { it.key + "=" + "%.2f".format(java.util.Locale.US, it.value) }
        val runtimeContext =
            "Affect mixture[$top]; register=$register; criticismStreak=$streak; Formula numeric state=NOT_EXECUTED unless an authorized calibrated 16x6 mapping is evaluated."

        return Snapshot(
            emotions = emotions,
            register = register,
            criticismStreak = streak,
            directReply = direct?.first,
            contract = direct?.second,
            promptContext = runtimeContext
        )
    }
}
