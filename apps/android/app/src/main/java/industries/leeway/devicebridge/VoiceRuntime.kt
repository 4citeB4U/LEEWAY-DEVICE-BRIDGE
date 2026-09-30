package industries.leeway.devicebridge

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Looper
import org.json.JSONObject
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

object VoiceRuntime {
    const val VOICE_PACKAGE_ID = "agent-lee-voice-one"
    const val VOICE_FABRIC_URL = "https://4citeb4u.github.io/LeeWay-Voice-Fabric/"
    const val MOBILE_RUNTIME_URL = "https://4citeb4u.github.io/LeeWay-Voice-Fabric/android-bridge.html"

    private const val PREFS = "leeway_voice_runtime"
    private const val VERIFIED = "voice_one_verified"
    private const val LAST = "voice_one_last_state"

    private data class PendingVoice(
        val latch: CountDownLatch = CountDownLatch(1),
        @Volatile var success: Boolean = false,
        @Volatile var detail: String = "PENDING"
    )

    private val pending = ConcurrentHashMap<String, PendingVoice>()

    fun initialize(context: Context): JSONObject = status(context)

    fun status(context: Context): JSONObject {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val verified = prefs.getBoolean(VERIFIED, false)
        return JSONObject().apply {
            put("available", verified)
            put("ready", verified)
            put("verified", verified)
            put("engine", "LEEWAY_VOICE_FABRIC")
            put("voicePackageId", VOICE_PACKAGE_ID)
            put("authority", "4citeB4U/LeeWay-Voice-Fabric")
            put("mobileRuntimeUrl", MOBILE_RUNTIME_URL)
            put("fallbackAllowed", false)
            put("state", prefs.getString(LAST, if (verified) "VOICE_ONE_VERIFIED" else "VOICE_UNVERIFIED"))
            put("note", "Only completed Voice Fabric playback promotes Voice One to verified on this device.")
        }
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
            ReceiptStore.record(context, "voice.fabric.open", "FAIL", e.message ?: e.javaClass.simpleName)
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
        if (Looper.myLooper() == Looper.getMainLooper()) {
            return JSONObject().apply {
                put("ok", false)
                put("verified", false)
                put("error", "VOICE_CALL_REQUIRES_BACKGROUND_THREAD")
            }
        }

        val requestId = UUID.randomUUID().toString()
        val state = PendingVoice()
        pending[requestId] = state
        return try {
            val intent = Intent(context, VoiceOneActivity::class.java).apply {
                putExtra(VoiceOneActivity.EXTRA_REQUEST_ID, requestId)
                putExtra(VoiceOneActivity.EXTRA_TEXT, clean)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            ReceiptStore.record(context, "voice.fabric.speak", "EXECUTING", "Voice One request started chars=" + clean.length)

            val completed = state.latch.await(12, TimeUnit.MINUTES)
            pending.remove(requestId)
            if (!completed) {
                setVerified(context, false, "VOICE_TIMEOUT")
                ReceiptStore.record(context, "voice.fabric.speak", "FAIL", "Voice One timed out")
                JSONObject().apply {
                    put("ok", false)
                    put("verified", false)
                    put("spoken", false)
                    put("voicePackageId", VOICE_PACKAGE_ID)
                    put("error", "VOICE_TIMEOUT")
                }
            } else {
                setVerified(context, state.success, state.detail)
                ReceiptStore.record(
                    context,
                    "voice.fabric.speak",
                    if (state.success) "PASS" else "FAIL",
                    state.detail
                )
                JSONObject().apply {
                    put("ok", state.success)
                    put("verified", state.success)
                    put("spoken", state.success)
                    put("voicePackageId", VOICE_PACKAGE_ID)
                    put("engine", "LEEWAY_VOICE_FABRIC")
                    put("detail", state.detail)
                    if (!state.success) put("error", "VOICE_UNAVAILABLE")
                }
            }
        } catch (e: Exception) {
            pending.remove(requestId)
            setVerified(context, false, e.message ?: e.javaClass.simpleName)
            ReceiptStore.record(context, "voice.fabric.speak", "FAIL", e.message ?: e.javaClass.simpleName)
            JSONObject().apply {
                put("ok", false)
                put("verified", false)
                put("spoken", false)
                put("voicePackageId", VOICE_PACKAGE_ID)
                put("error", e.message ?: e.javaClass.simpleName)
            }
        }
    }

    fun complete(requestId: String, success: Boolean, detail: String) {
        val request = pending[requestId] ?: return
        request.success = success
        request.detail = detail
        request.latch.countDown()
    }

    private fun setVerified(context: Context, verified: Boolean, detail: String) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(VERIFIED, verified)
            .putString(LAST, detail)
            .apply()
    }

    fun stop() {}
    fun shutdown() {}
}
