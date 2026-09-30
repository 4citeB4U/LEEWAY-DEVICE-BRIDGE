package industries.leeway.devicebridge

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.Gravity
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONObject

class VoiceOneActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private var requestId: String = ""
    private var speechText: String = ""
    private var speakStarted = false
    private var completed = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestId = intent?.getStringExtra(EXTRA_REQUEST_ID).orEmpty()
        speechText = intent?.getStringExtra(EXTRA_TEXT).orEmpty()
        if (requestId.isBlank() || speechText.isBlank()) {
            finishWith(false, "VOICE_REQUEST_INVALID")
            return
        }

        window.setGravity(Gravity.TOP or Gravity.END)
        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            addJavascriptInterface(AndroidVoiceBridge(), "LeeWayPocketNative")
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                    return url?.startsWith("https://4citeb4u.github.io/LeeWay-Voice-Fabric/") != true
                }
            }
        }
        setContentView(webView)
        window.setLayout(1, 1)
        webView.loadUrl(VoiceRuntime.MOBILE_RUNTIME_URL)
    }

    private fun startSpeak() {
        if (speakStarted || completed) return
        speakStarted = true
        val quoted = JSONObject.quote(speechText)
        webView.evaluateJavascript(
            "window.LeeWayAndroidVoice.speak(" + quoted + ").catch(function(){})",
            null
        )
    }

    private fun finishWith(success: Boolean, detail: String) {
        if (completed) return
        completed = true
        VoiceRuntime.complete(requestId, success, detail)
        runCatching { webView.stopLoading() }
        runCatching { webView.destroy() }
        finish()
    }

    override fun onDestroy() {
        if (!completed && requestId.isNotBlank()) {
            VoiceRuntime.complete(requestId, false, "VOICE_ACTIVITY_DESTROYED")
        }
        if (::webView.isInitialized) runCatching { webView.destroy() }
        super.onDestroy()
    }

    inner class AndroidVoiceBridge {
        @JavascriptInterface
        fun onBridgeReady(payload: String) {
            runOnUiThread { startSpeak() }
        }

        @JavascriptInterface
        fun onReady(payload: String) {
            runOnUiThread { startSpeak() }
        }

        @JavascriptInterface
        fun onState(payload: String) {
            // State remains inside the canonical Voice Fabric. No transcript is logged here.
        }

        @JavascriptInterface
        fun onSpeakComplete(payload: String) {
            runOnUiThread { finishWith(true, "VOICE_ONE_PLAYBACK_COMPLETE") }
        }

        @JavascriptInterface
        fun onError(payload: String) {
            val detail = runCatching {
                JSONObject(payload).optString("error", "VOICE_FABRIC_ERROR")
            }.getOrDefault("VOICE_FABRIC_ERROR")
            runOnUiThread { finishWith(false, detail) }
        }
    }

    companion object {
        const val EXTRA_REQUEST_ID = "leeway_voice_request_id"
        const val EXTRA_TEXT = "leeway_voice_text"
    }
}
