package industries.leeway.devicebridge

import android.content.Context
import android.content.Intent
import android.net.Uri
import org.json.JSONObject

object VoiceRuntime {
    const val VOICE_FABRIC_URL = "https://4citeb4u.github.io/LeeWay-Voice-Fabric/"
    private const val VOICE_UNAVAILABLE = "VOICE_UNAVAILABLE"

    fun initialize(context: Context): JSONObject = status(context)

    fun status(context: Context): JSONObject = JSONObject().apply {
        put("available", false)
        put("ready", false)
        put("engine", "LEEWAY_VOICE_FABRIC")
        put("authority", "4citeB4U/LeeWay-Voice-Fabric")
        put("fallbackAllowed", false)
        put("state", VOICE_UNAVAILABLE)
        put("error", VOICE_UNAVAILABLE)
        put("note", "No authenticated Voice Fabric speech adapter is bound to this Device Bridge runtime.")
    }

    fun openVoiceFabric(context: Context): JSONObject {
        return try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(VOICE_FABRIC_URL)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            ReceiptStore.record(
                context,
                "voice.fabric.open",
                "PASS",
                "Opened the canonical LeeWay Voice Fabric interface."
            )
            JSONObject().apply {
                put("ok", true)
                put("opened", true)
                put("voiceFabricUrl", VOICE_FABRIC_URL)
                put("authority", "4citeB4U/LeeWay-Voice-Fabric")
            }
        } catch (e: Exception) {
            ReceiptStore.record(
                context,
                "voice.fabric.open",
                "FAIL",
                e.message ?: e.javaClass.simpleName
            )
            JSONObject().apply {
                put("ok", false)
                put("opened", false)
                put("error", e.message ?: e.javaClass.simpleName)
            }
        }
    }

    fun speak(context: Context, text: String): JSONObject {
        val clean = text.trim()
        if (clean.isEmpty()) return JSONObject().put("ok", false).put("error", "TEXT_REQUIRED")
        ReceiptStore.record(
            context,
            "voice.fabric.speak",
            "BLOCKED",
            VOICE_UNAVAILABLE
        )
        return JSONObject().apply {
            put("ok", false)
            put("spoken", false)
            put("chars", clean.length)
            put("engine", "LEEWAY_VOICE_FABRIC")
            put("fallbackAllowed", false)
            put("error", VOICE_UNAVAILABLE)
            put("authority", "4citeB4U/LeeWay-Voice-Fabric")
        }
    }

    fun stop() {}

    fun shutdown() {}
}
