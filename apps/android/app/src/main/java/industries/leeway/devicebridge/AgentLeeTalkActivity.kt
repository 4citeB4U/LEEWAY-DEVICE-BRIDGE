package industries.leeway.devicebridge

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class AgentLeeTalkActivity : AppCompatActivity(), RecognitionListener {
    private var recognizer: SpeechRecognizer? = null
    private lateinit var state: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        state = TextView(this).apply {
            text = "Agent Lee · listening…"
            textSize = 16f
            setPadding(24, 18, 24, 18)
        }
        setContentView(state)

        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            state.text = "Microphone permission required."
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), 4203)
            return
        }
        startListening()
    }

    private fun startListening() {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            state.text = "Speech recognition unavailable."
            ReceiptStore.record(this, "agent.voice.listen", "BLOCKED", "SpeechRecognizer unavailable")
            return
        }
        recognizer?.destroy()
        recognizer = SpeechRecognizer.createSpeechRecognizer(this).also {
            it.setRecognitionListener(this)
            it.startListening(Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
            })
        }
    }

    override fun onReadyForSpeech(params: Bundle?) { state.text = "Agent Lee · listening…" }
    override fun onBeginningOfSpeech() {}
    override fun onRmsChanged(rmsdB: Float) {}
    override fun onBufferReceived(buffer: ByteArray?) {}
    override fun onEndOfSpeech() { state.text = "Agent Lee · thinking…" }
    override fun onPartialResults(partialResults: Bundle?) {}
    override fun onEvent(eventType: Int, params: Bundle?) {}

    override fun onError(error: Int) {
        state.text = "Listening stopped."
        ReceiptStore.record(this, "agent.voice.listen", "FAIL", "SpeechRecognizer error=$error")
    }

    override fun onResults(results: Bundle?) {
        val heard = results
            ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            ?.firstOrNull()
            .orEmpty()
            .trim()
        if (heard.isEmpty()) {
            state.text = "No complete request heard."
            ReceiptStore.record(this, "agent.voice.listen", "BLOCKED", "Empty speech result")
            return
        }

        state.text = "Agent Lee · thinking…"
        ReceiptStore.record(this, "agent.voice.listen", "PASS", "Speech input captured")
        Thread {
            val result = AgentLeeConversationEngine.chat(this, heard, speak = true)
            val response = result.optString("response")
            runOnUiThread {
                state.text = if (result.optBoolean("ok")) {
                    if (response.isBlank()) "Agent Lee response queued." else "Agent Lee · response queued to Voice One."
                } else {
                    "Agent Lee blocked: " + result.optString("error", "unknown")
                }
                window.decorView.postDelayed({ finish() }, 1400L)
            }
        }.start()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 4203 && grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) {
            startListening()
        } else {
            state.text = "Microphone permission was not granted."
        }
    }

    override fun onDestroy() {
        recognizer?.destroy()
        recognizer = null
        super.onDestroy()
    }
}
