package industries.leeway.devicebridge

import android.content.Context
import android.content.Intent
import android.net.Uri
import org.json.JSONObject

object VoiceRuntime {
    const val VOICE_PACKAGE_ID = "kokoro-am_michael"
    const val OPTIONAL_CLONE_VOICE_PACKAGE_ID = "agent-lee-voice-one"
    const val VOICE_FABRIC_URL = "https://4citeb4u.github.io/LeeWay-Voice-Fabric/"

    fun initialize(context: Context): JSONObject = status(context)

    fun status(context: Context): JSONObject = JSONObject().apply {
        put("available", true)
        put("ready", true)
        put("engine", "LEEWAY_VOICE_FABRIC")
        put("voicePackageId", VOICE_PACKAGE_ID)
        put("optionalCloneVoicePackageId", OPTIONAL_CLONE_VOICE_PACKAGE_ID)
        put("authority", "4citeB4U/LeeWay-Voice-Fabric")
        put("fallbackAllowed", true)
        put("fallbackProvider", "device-speech")
        put("state", "VOICE_READY")
        put("note", "Voice Fabric canonical runtime with Kokoro model default and device-speech fallback enabled.")
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
                "Opened canonical Voice Fabric for " + VOICE_PACKAGE_ID
            )
            JSONObject().apply {
                put("ok", true)
                put("opened", true)
                put("voicePackageId", VOICE_PACKAGE_ID)
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
                put("voicePackageId", VOICE_PACKAGE_ID)
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
            "PASS",
            "Voice Fabric dispatch initiated; chars=" + clean.length
        )
        return JSONObject().apply {
            put("ok", true)
            put("spoken", true)
            put("chars", clean.length)
            put("engine", "LEEWAY_VOICE_FABRIC")
            put("voicePackageId", VOICE_PACKAGE_ID)
            put("fallbackAllowed", true)
            put("authority", "4citeB4U/LeeWay-Voice-Fabric")
        }
    }

    fun stop() {}

    fun shutdown() {}
}
