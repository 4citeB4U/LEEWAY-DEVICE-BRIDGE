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
    @Volatile private var lastInitCode = TextToSpeech.ERROR
    @Volatile private var initAttempts = 0

    @Synchronized
    fun initialize(context: Context): JSONObject {
        if (ready && tts != null) return status(context)
        val app = context.applicationContext
        shutdown()

        var finalCode = TextToSpeech.ERROR
        var finalLanguage = TextToSpeech.LANG_NOT_SUPPORTED

        for (attempt in 1..3) {
            initAttempts = attempt
            val latch = CountDownLatch(1)
            var callbackCode = TextToSpeech.ERROR
            val engine = TextToSpeech(app) { code ->
                callbackCode = code
                latch.countDown()
            }
            tts = engine

            val callbackArrived = latch.await(8, TimeUnit.SECONDS)
            if (callbackArrived && callbackCode == TextToSpeech.SUCCESS) {
                val languageResult = engine.setLanguage(Locale.getDefault())
                finalCode = callbackCode
                finalLanguage = languageResult
                if (languageResult != TextToSpeech.LANG_MISSING_DATA &&
                    languageResult != TextToSpeech.LANG_NOT_SUPPORTED
                ) {
                    ready = true
                    lastInitCode = callbackCode
                    ReceiptStore.record(
                        app,
                        "voice.tts.init",
                        "PASS",
                        "attempt=${attempt} language=${Locale.getDefault().toLanguageTag()} result=${languageResult}"
                    )
                    return status(app)
                }
            }

            finalCode = callbackCode
            lastInitCode = callbackCode
            ready = false
            try { engine.stop() } catch (_: Exception) {}
            try { engine.shutdown() } catch (_: Exception) {}
            tts = null

            if (attempt < 3) {
                try { Thread.sleep(1200L * attempt) } catch (_: InterruptedException) {
                    Thread.currentThread().interrupt()
                    break
                }
            }
        }

        ReceiptStore.record(
            app,
            "voice.tts.init",
            "FAIL",
            "attempts=${initAttempts} init=${finalCode} languageResult=${finalLanguage} language=${Locale.getDefault().toLanguageTag()}"
        )
        return status(app)
    }

    fun status(context: Context): JSONObject = JSONObject().apply {
        put("available", tts != null)
        put("ready", ready)
        put("engine", "ANDROID_TEXT_TO_SPEECH")
        put("language", Locale.getDefault().toLanguageTag())
        put("authority", "PHONE_LOCAL_VOICE_RENDERER")
        put("initAttempts", initAttempts)
        put("lastInitCode", lastInitCode)
        put("note", "Renderer only; Agent Lee identity remains governed above TTS")
    }

    fun speak(context: Context, text: String): JSONObject {
        val clean = text.trim()
        if (clean.isEmpty()) return JSONObject().put("ok", false).put("error", "TEXT_REQUIRED")
        if (clean.length > 4000) return JSONObject().put("ok", false).put("error", "TEXT_TOO_LONG")

        val initialized = if (!ready || tts == null) initialize(context) else status(context)
        if (!initialized.optBoolean("ready")) {
            ReceiptStore.record(context, "voice.tts.speak", "FAIL", "renderer_not_ready chars=${clean.length}")
            return JSONObject().apply {
                put("ok", false)
                put("spoken", false)
                put("chars", clean.length)
                put("engine", "ANDROID_TEXT_TO_SPEECH")
                put("error", "TTS_NOT_READY")
                put("status", initialized)
            }
        }

        val result = tts?.speak(
            clean,
            TextToSpeech.QUEUE_FLUSH,
            null,
            "leeway-" + System.currentTimeMillis()
        ) ?: TextToSpeech.ERROR
        val ok = result == TextToSpeech.SUCCESS
        ReceiptStore.record(
            context,
            "voice.tts.speak",
            if (ok) "PASS" else "FAIL",
            "chars=${clean.length} queueResult=${result}"
        )
        return JSONObject().apply {
            put("ok", ok)
            put("spoken", ok)
            put("chars", clean.length)
            put("engine", "ANDROID_TEXT_TO_SPEECH")
            put("queueResult", result)
        }
    }

    fun stop() {
        try { tts?.stop() } catch (_: Exception) {}
    }

    @Synchronized
    fun shutdown() {
        try { tts?.stop() } catch (_: Exception) {}
        try { tts?.shutdown() } catch (_: Exception) {}
        tts = null
        ready = false
    }
}
