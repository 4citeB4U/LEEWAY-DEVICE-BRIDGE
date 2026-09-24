package industries.leeway.devicebridge

import android.content.Context
import android.speech.tts.TextToSpeech
import org.json.JSONObject
import java.util.Locale
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

object VoiceRuntime {
    private var tts: TextToSpeech? = null
    @Volatile private var ready = false

    @Synchronized
    fun initialize(context: Context): JSONObject {
        if (ready && tts != null) return status(context)
        val latch = CountDownLatch(1)
        val app = context.applicationContext
        var initCode = TextToSpeech.ERROR
        val engine = TextToSpeech(app) { code ->
            initCode = code
            if (code == TextToSpeech.SUCCESS) {
                tts?.language = Locale.getDefault()
                ready = true
            }
            latch.countDown()
        }
        tts = engine
        latch.await(5, TimeUnit.SECONDS)
        if (initCode != TextToSpeech.SUCCESS) {
            ready = false
            ReceiptStore.record(app, "voice.tts.init", "FAIL", "TextToSpeech init=$initCode")
        } else {
            ReceiptStore.record(app, "voice.tts.init", "PASS", "Android TextToSpeech ready")
        }
        return status(app)
    }

    fun status(context: Context): JSONObject = JSONObject().apply {
        put("available", tts != null)
        put("ready", ready)
        put("engine", "ANDROID_TEXT_TO_SPEECH")
        put("language", Locale.getDefault().toLanguageTag())
        put("authority", "PHONE_LOCAL_VOICE_RENDERER")
        put("note", "Renderer only; Agent Lee identity remains governed above TTS")
    }

    fun speak(context: Context, text: String): JSONObject {
        val clean = text.trim()
        if (clean.isEmpty()) return JSONObject().put("ok", false).put("error", "TEXT_REQUIRED")
        if (clean.length > 4000) return JSONObject().put("ok", false).put("error", "TEXT_TOO_LONG")
        if (!ready || tts == null) initialize(context)
        val result = tts?.speak(clean, TextToSpeech.QUEUE_FLUSH, null, "leeway-" + System.currentTimeMillis())
            ?: TextToSpeech.ERROR
        val ok = result == TextToSpeech.SUCCESS
        ReceiptStore.record(context, "voice.tts.speak", if (ok) "PASS" else "FAIL", "chars=" + clean.length)
        return JSONObject().apply {
            put("ok", ok)
            put("spoken", ok)
            put("chars", clean.length)
            put("engine", "ANDROID_TEXT_TO_SPEECH")
        }
    }

    fun stop() {
        tts?.stop()
    }

    @Synchronized
    fun shutdown() {
        tts?.stop()
        tts?.shutdown()
        tts = null
        ready = false
    }
}
