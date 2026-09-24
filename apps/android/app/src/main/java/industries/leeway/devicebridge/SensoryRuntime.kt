package industries.leeway.devicebridge

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.label.ImageLabeling
import com.google.mlkit.vision.label.defaults.ImageLabelerOptions
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

object SensoryRuntime {
    private var tts: TextToSpeech? = null

    fun status(context: Context): JSONObject {
        val microphonePermission =
            ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) ==
                PackageManager.PERMISSION_GRANTED
        val recognizerAvailable = SpeechRecognizer.isRecognitionAvailable(context)
        val onDeviceRecognizerAvailable =
            Build.VERSION.SDK_INT >= 31 && SpeechRecognizer.isOnDeviceRecognitionAvailable(context)
        val model = ModelRuntime.status(context)
        val relay = RemoteRelayState.status(context)
        val agentAccess = LocalAuthority.agentAccessEnabled(context)

        return JSONObject().apply {
            put("microphone", true)
            put("microphonePermissionGranted", microphonePermission)
            put("camera", true)
            put("speechRecognizerAvailable", recognizerAvailable)
            put("onDeviceSpeechRecognizerAvailable", onDeviceRecognizerAvailable)
            put("speechOutput", "ANDROID_TEXT_TO_SPEECH")
            put("visionInference", "ML_KIT_BUNDLED_IMAGE_LABELING")
            put("reasoningModel", ModelRuntime.MODEL_ID)
            put("modelVerified", model.optBoolean("verified"))
            put("relayEnabled", relay.optBoolean("enabled"))
            put("relayConnected", relay.optBoolean("connected"))
            put("agentAccessEnabled", agentAccess)
            put(
                "voiceReady",
                microphonePermission && recognizerAvailable && model.optBoolean("verified")
            )
            put(
                "dailyReachabilityReady",
                model.optBoolean("verified") && relay.optBoolean("enabled") && agentAccess
            )
            put("authority", "PHONE_LOCAL_SENSORY_RUNTIME")
        }
    }

    fun listenOnce(
        context: Context,
        onText: (String) -> Unit,
        onError: (String) -> Unit
    ): SpeechRecognizer {
        val recognizer =
            if (Build.VERSION.SDK_INT >= 31 && SpeechRecognizer.isOnDeviceRecognitionAvailable(context)) {
                SpeechRecognizer.createOnDeviceSpeechRecognizer(context)
            } else {
                SpeechRecognizer.createSpeechRecognizer(context)
            }

        recognizer.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {}
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onPartialResults(partialResults: Bundle?) {}
            override fun onEvent(eventType: Int, params: Bundle?) {}

            override fun onError(error: Int) {
                ReceiptStore.record(context, "sensory.voice.input", "FAIL", "speechError=" + error)
                onError("SPEECH_RECOGNIZER_ERROR_" + error)
                recognizer.destroy()
            }

            override fun onResults(results: Bundle?) {
                val text = results
                    ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.firstOrNull()
                    ?.trim()
                    .orEmpty()

                if (text.isBlank()) {
                    ReceiptStore.record(context, "sensory.voice.input", "FAIL", "empty transcript")
                    onError("EMPTY_TRANSCRIPT")
                } else {
                    ReceiptStore.record(context, "sensory.voice.input", "PASS", "chars=" + text.length)
                    onText(text)
                }
                recognizer.destroy()
            }
        })

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault().toLanguageTag())
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
            putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
        }
        recognizer.startListening(intent)
        return recognizer
    }

    fun speak(
        context: Context,
        text: String,
        onDone: (() -> Unit)? = null,
        onError: ((String) -> Unit)? = null
    ) {
        if (Looper.myLooper() != Looper.getMainLooper()) {
            Handler(Looper.getMainLooper()).post {
                speak(context, text, onDone, onError)
            }
            return
        }

        if (text.isBlank()) {
            onError?.invoke("EMPTY_TTS_TEXT")
            return
        }

        val utteranceId = "leeway-live-" + System.currentTimeMillis()
        val app = context.applicationContext

        fun speakNow(engine: TextToSpeech) {
            engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(id: String?) {
                    if (id == utteranceId) {
                        ReceiptStore.record(context, "sensory.voice.output", "STARTED", "chars=" + text.length)
                    }
                }

                override fun onDone(id: String?) {
                    if (id == utteranceId) {
                        ReceiptStore.record(context, "sensory.voice.output", "PASS", "chars=" + text.length)
                        onDone?.invoke()
                    }
                }

                @Deprecated("Deprecated in Android SDK")
                override fun onError(id: String?) {
                    if (id == utteranceId) {
                        ReceiptStore.record(context, "sensory.voice.output", "FAIL", "TTS_ERROR")
                        onError?.invoke("TTS_ERROR")
                    }
                }

                override fun onError(id: String?, errorCode: Int) {
                    if (id == utteranceId) {
                        ReceiptStore.record(context, "sensory.voice.output", "FAIL", "ttsError=" + errorCode)
                        onError?.invoke("TTS_ERROR_" + errorCode)
                    }
                }
            })

            val result = engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId)
            if (result == TextToSpeech.ERROR) {
                ReceiptStore.record(context, "sensory.voice.output", "FAIL", "speakQueueError")
                onError?.invoke("TTS_QUEUE_ERROR")
            }
        }

        val existing = tts
        if (existing != null) {
            speakNow(existing)
            return
        }

        tts = TextToSpeech(app) { status ->
            val engine = tts
            if (status == TextToSpeech.SUCCESS && engine != null) {
                val languageResult = engine.setLanguage(Locale.getDefault())
                if (languageResult == TextToSpeech.LANG_MISSING_DATA ||
                    languageResult == TextToSpeech.LANG_NOT_SUPPORTED) {
                    ReceiptStore.record(context, "sensory.voice.output", "FAIL", "languageUnavailable")
                    onError?.invoke("TTS_LANGUAGE_UNAVAILABLE")
                    return@TextToSpeech
                }
                speakNow(engine)
            } else {
                ReceiptStore.record(context, "sensory.voice.output", "FAIL", "ttsInit=" + status)
                onError?.invoke("TTS_INIT_" + status)
            }
        }
    }

    fun analyzeBitmap(
        context: Context,
        bitmap: Bitmap,
        onResult: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ) {
        val image = InputImage.fromBitmap(bitmap, 0)
        val labeler = ImageLabeling.getClient(
            ImageLabelerOptions.Builder()
                .setConfidenceThreshold(0.35f)
                .build()
        )

        labeler.process(image)
            .addOnSuccessListener { labels ->
                val top = labels.sortedByDescending { label -> label.confidence }.take(8)
                val labelArray = JSONArray()
                top.forEach { label ->
                    labelArray.put(JSONObject().apply {
                        put("text", label.text)
                        put("confidence", label.confidence)
                        put("index", label.index)
                    })
                }

                val prompt = if (top.isEmpty()) {
                    "The phone camera vision model returned no confident labels. State that clearly."
                } else {
                    "You are Agent Lee on a phone. The local camera vision model identified: " +
                        top.joinToString(", ") { label ->
                            label.text + " (" + String.format(Locale.US, "%.2f", label.confidence) + ")"
                        } +
                        ". Briefly describe what the user is likely looking at. Do not claim details not supported by these labels."
                }

                Thread {
                    try {
                        val reasoning = ModelRuntime.generate(context, prompt)
                        val result = JSONObject().apply {
                            put("ok", reasoning.optBoolean("ok"))
                            put("labels", labelArray)
                            put("reasoning", reasoning)
                            put("visionAuthority", "PHONE_LOCAL_ML_KIT")
                            put("reasoningAuthority", "PHONE_LOCAL_MODEL")
                        }
                        ReceiptStore.record(
                            context,
                            "sensory.vision.inference",
                            if (reasoning.optBoolean("ok")) "PASS" else "FAIL",
                            "labels=" + top.size
                        )
                        onResult(result)
                    } catch (e: Exception) {
                        val detail = e.message ?: e.javaClass.simpleName
                        ReceiptStore.record(context, "sensory.vision.inference", "FAIL", detail)
                        onError(detail)
                    } finally {
                        labeler.close()
                    }
                }.start()
            }
            .addOnFailureListener { error ->
                val detail = error.message ?: error.javaClass.simpleName
                ReceiptStore.record(context, "sensory.vision.inference", "FAIL", detail)
                onError(detail)
                labeler.close()
            }
    }

    fun reasonFromSpeech(context: Context, transcript: String): JSONObject {
        val result = ModelRuntime.generate(
            context,
            "The user spoke this to Agent Lee: " + transcript + "\nRespond conversationally and truthfully."
        )
        ReceiptStore.record(
            context,
            "sensory.voice.reasoning",
            if (result.optBoolean("ok")) "PASS" else "FAIL",
            "chars=" + transcript.length
        )
        return result
    }
}
