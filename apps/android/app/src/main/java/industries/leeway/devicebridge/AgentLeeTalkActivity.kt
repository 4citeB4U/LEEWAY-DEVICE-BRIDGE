package industries.leeway.devicebridge

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.content.Intent
import android.view.Gravity
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class AgentLeeTalkActivity : AppCompatActivity() {
    private var recognizer: SpeechRecognizer? = null
    private lateinit var status: TextView
    private lateinit var transcript: TextView
    private lateinit var talkAgain: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        buildCompactUi()
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            startListening()
        } else {
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), REQUEST_MIC)
            status.text = "Microphone permission required."
        }
    }

    private fun buildCompactUi() {
        status = TextView(this).apply {
            text = "Agent Lee"
            textSize = 16f
        }
        transcript = TextView(this).apply {
            text = "Tap the mic and speak."
            textSize = 14f
            setPadding(0, dp(10), 0, dp(10))
        }
        talkAgain = Button(this).apply {
            text = "🎙 TALK"
            setOnClickListener { startListening() }
        }
        val close = Button(this).apply {
            text = "CLOSE"
            setOnClickListener { finish() }
        }
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(16), dp(18), dp(16))
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(20).toFloat()
                setColor(0xF20A1627.toInt())
                setStroke(dp(1), 0xFF2D79A8.toInt())
            }
            addView(status)
            addView(transcript)
            addView(talkAgain)
            addView(close)
        }
        setContentView(root)
        window.setGravity(Gravity.END or Gravity.CENTER_VERTICAL)
        window.setDimAmount(0f)
        window.addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND)
        window.setLayout(dp(340), ViewGroup.LayoutParams.WRAP_CONTENT)
    }

    private fun startListening() {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            status.text = "Speech recognition unavailable."
            return
        }
        talkAgain.isEnabled = false
        recognizer?.destroy()
        recognizer = SpeechRecognizer.createSpeechRecognizer(this)
        recognizer?.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {
                status.text = "Listening…"
                transcript.text = ""
            }
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() { status.text = "Agent Lee is thinking…" }
            override fun onError(error: Int) {
                status.text = "Speech recognition error " + error
                talkAgain.isEnabled = true
            }
            override fun onPartialResults(partialResults: Bundle?) {}
            override fun onEvent(eventType: Int, params: Bundle?) {}
            override fun onResults(results: Bundle?) {
                val heard = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.firstOrNull().orEmpty().trim()
                if (heard.isBlank()) {
                    status.text = "I did not hear a complete request."
                    talkAgain.isEnabled = true
                    return
                }
                transcript.text = "You: " + heard
                status.text = "Agent Lee is working…"
                Thread {
                    val result = AgentLeeConversation.respond(this@AgentLeeTalkActivity, heard, true)
                    runOnUiThread {
                        if (result.optBoolean("ok")) {
                            val response = result.optString("response")
                            val skill = result.optString("focalSkill")
                            val formula = result.optString("formulaExecutionState")
                            transcript.text = "You: " + heard + "\n\nAgent Lee: " + response +
                                "\n\nSkill: " + skill + " • Formula: " + formula
                            status.text = if (result.optJSONObject("voice")?.optBoolean("verified") == true) {
                                "Voice One verified."
                            } else {
                                "Response ready • Voice not verified."
                            }
                        } else {
                            transcript.text = "Agent Lee blocked: " + result.optString("error", "UNKNOWN")
                            status.text = "Blocked"
                        }
                        talkAgain.isEnabled = true
                    }
                }.start()
            }
        })
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
        }
        recognizer?.startListening(intent)
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_MIC && grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) {
            startListening()
        } else if (requestCode == REQUEST_MIC) {
            status.text = "Microphone permission denied."
            talkAgain.isEnabled = true
        }
    }

    override fun onDestroy() {
        recognizer?.destroy()
        super.onDestroy()
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt().coerceAtLeast(1)

    companion object {
        private const val REQUEST_MIC = 4210
    }
}
