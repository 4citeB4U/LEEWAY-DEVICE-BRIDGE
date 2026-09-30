package industries.leeway.devicebridge

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.PixelFormat
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import org.json.JSONObject
import java.util.ArrayDeque

@SuppressLint("SetJavaScriptEnabled", "AddJavascriptInterface")
object VoiceFabricWebViewHost {
    private const val PAGE_URL = "https://4citeb4u.github.io/LeeWay-Voice-Fabric/mobile.html"
    private const val ORIGIN = "https://4citeb4u.github.io/LeeWay-Voice-Fabric/"
    private const val PREFS = "leeway_voice_fabric_mobile"
    private val handler = Handler(Looper.getMainLooper())
    private val pending = ArrayDeque<String>()

    @Volatile private var webView: WebView? = null
    @Volatile private var windowManager: WindowManager? = null
    @Volatile private var ready = false
    @Volatile private var pageReady = false
    private var appContext: Context? = null

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun status(context: Context): JSONObject {
        val p = prefs(context)
        return JSONObject().apply {
            put("available", webView != null)
            put("ready", ready)
            put("pageReady", pageReady)
            put("engine", "LEEWAY_VOICE_FABRIC_BROWSER_CHATTERBOX")
            put("voicePackageId", VoiceRuntime.VOICE_PACKAGE_ID)
            put("authority", "4citeB4U/LeeWay-Voice-Fabric")
            put("fallbackAllowed", false)
            put("state", p.getString("state", if (webView == null) "VOICE_ADAPTER_DETACHED" else "VOICE_BRIDGE_LOADING"))
            put("lastEvent", p.getString("last_event", "NONE"))
            put("lastError", p.getString("last_error", ""))
            put("pageUrl", PAGE_URL)
            put("evidenceState", if (p.getBoolean("ever_completed", false)) "OBSERVED_PHONE_PLAYBACK_COMPLETION" else "ADAPTER_PRESENT_LIVE_PLAYBACK_UNVERIFIED")
        }
    }

    fun initialize(context: Context): JSONObject {
        if (!Settings.canDrawOverlays(context)) {
            return status(context).apply {
                put("ok", false)
                put("error", "OVERLAY_PERMISSION_REQUIRED")
            }
        }
        ensureHost(context)
        return status(context).put("ok", true)
    }

    fun prepare(context: Context): JSONObject {
        val init = initialize(context)
        if (!init.optBoolean("ok")) return init
        prefs(context).edit().putString("state", "VOICE_PREPARING").apply()
        handler.post {
            webView?.evaluateJavascript(
                "globalThis.LeeWayMobileVoice?.prepare().catch(()=>{});",
                null
            )
        }
        return status(context).apply {
            put("ok", true)
            put("accepted", true)
            put("state", "VOICE_PREPARING")
        }
    }

    fun speak(context: Context, text: String): JSONObject {
        val clean = text.trim()
        if (clean.isEmpty()) return JSONObject().put("ok", false).put("error", "TEXT_REQUIRED")
        val init = initialize(context)
        if (!init.optBoolean("ok")) return init

        synchronized(pending) { pending.addLast(clean) }
        if (ready) {
            handler.post { drainPending() }
        } else {
            prepare(context)
        }

        ReceiptStore.record(
            context,
            "voice.fabric.speak",
            "QUEUED",
            "Voice One queued; chars=" + clean.length
        )
        return status(context).apply {
            put("ok", true)
            put("accepted", true)
            put("spoken", false)
            put("chars", clean.length)
            put("state", if (ready) "VOICE_QUEUED" else "VOICE_PREPARING")
        }
    }

    fun stop(): JSONObject {
        synchronized(pending) { pending.clear() }
        handler.post {
            webView?.evaluateJavascript(
                "globalThis.LeeWayMobileVoice?.stop().catch(()=>{});",
                null
            )
        }
        return JSONObject().put("ok", true).put("stopped", true)
    }

    fun shutdown() {
        val view = webView ?: return
        handler.post {
            runCatching { windowManager?.removeView(view) }
            runCatching { view.removeJavascriptInterface("LeeWayAndroidVoice") }
            runCatching { view.destroy() }
            webView = null
            windowManager = null
            ready = false
            pageReady = false
            synchronized(pending) { pending.clear() }
        }
    }

    private fun ensureHost(context: Context) {
        if (webView != null) return
        val app = context.applicationContext
        appContext = app
        handler.post {
            if (webView != null) return@post
            val wm = app.getSystemService(Context.WINDOW_SERVICE) as WindowManager
            val view = WebView(app)
            view.settings.javaScriptEnabled = true
            view.settings.domStorageEnabled = true
            view.settings.mediaPlaybackRequiresUserGesture = false
            view.settings.allowFileAccess = false
            view.settings.allowContentAccess = false
            view.settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
            view.addJavascriptInterface(NativeBridge(app), "LeeWayAndroidVoice")
            view.webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(v: WebView?, request: WebResourceRequest?): Boolean {
                    val url = request?.url?.toString().orEmpty()
                    return !url.startsWith(ORIGIN)
                }

                override fun onPageFinished(v: WebView?, url: String?) {
                    pageReady = true
                    prefs(app).edit()
                        .putString("state", "VOICE_BRIDGE_READY_ENGINE_NOT_PREPARED")
                        .putString("last_event", "WEBVIEW_PAGE_FINISHED")
                        .apply()
                }
            }

            val params = WindowManager.LayoutParams(
                1,
                1,
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.START or Gravity.TOP
                alpha = 0.01f
            }

            wm.addView(view, params)
            windowManager = wm
            webView = view
            view.loadUrl(PAGE_URL)
        }
    }

    private fun drainPending() {
        if (!ready) return
        val next = synchronized(pending) {
            if (pending.isEmpty()) null else pending.removeFirst()
        } ?: return
        val quoted = JSONObject.quote(next)
        webView?.evaluateJavascript(
            "globalThis.LeeWayMobileVoice.speak($quoted).catch(()=>{});"
        ) {
            handler.post { if (ready) drainPending() }
        }
    }

    private class NativeBridge(private val context: Context) {
        @JavascriptInterface
        fun event(type: String, payload: String) {
            val data = runCatching { JSONObject(payload) }.getOrElse { JSONObject() }
            val p = prefs(context)
            val edit = p.edit().putString("last_event", type)

            when (type) {
                "voice.page.ready" -> {
                    pageReady = true
                    edit.putString("state", "VOICE_BRIDGE_READY_ENGINE_NOT_PREPARED")
                }
                "voice.engine.ready" -> {
                    ready = true
                    edit.putString("state", "VOICE_READY")
                        .remove("last_error")
                    ReceiptStore.record(
                        context,
                        "voice.fabric.prepare",
                        "PASS",
                        "Voice One engine ready on phone; device=" + data.optString("device", "unknown")
                    )
                    handler.post { drainPending() }
                }
                "voice.speak.start" -> {
                    edit.putString("state", "VOICE_SPEAKING")
                }
                "voice.speak.complete" -> {
                    edit.putString("state", "VOICE_READY")
                        .putBoolean("ever_completed", true)
                    ReceiptStore.record(
                        context,
                        "voice.fabric.speak",
                        "PASS",
                        "Voice One playback completed; chars=" + data.optInt("chars")
                    )
                }
                "voice.stop" -> {
                    edit.putString("state", "VOICE_READY")
                }
                "voice.error" -> {
                    if (data.optString("phase") == "prepare") ready = false
                    edit.putString("state", "VOICE_ERROR")
                        .putString("last_error", data.optString("message", "Voice Fabric error"))
                    ReceiptStore.record(
                        context,
                        "voice.fabric.speak",
                        "FAIL",
                        data.optString("message", "Voice Fabric error")
                    )
                }
            }
            edit.apply()
        }
    }
}
