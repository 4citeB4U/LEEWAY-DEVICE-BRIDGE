package industries.leeway.readaloud;

import android.annotation.SuppressLint;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

public final class VoiceOneHost {
    public static final String VOICE_ID = "agent-lee-voice-one";
    public static final String AUTHORITY = "4citeB4U/LeeWay-Voice-Fabric";
    public static final String BRIDGE_URL = "https://4citeb4u.github.io/LeeWay-Voice-Fabric/android-bridge.html?v=20260930-stream1";

    private final Context context;
    private final Handler main = new Handler(Looper.getMainLooper());
    private WebView webView;

    private volatile boolean bridgeReady = false;
    private volatile boolean voiceReady = false;
    private volatile boolean speaking = false;
    private volatile boolean streaming = false;
    private volatile String activeStreamId = "";
    private volatile String state = "STARTING";
    private volatile String lastError = "";
    private volatile int lastChars = 0;

    public VoiceOneHost(Context context) {
        this.context = context.getApplicationContext();
    }

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    public void start() {
        main.post(() -> {
            if (webView != null) return;
            try {
                WebView.setWebContentsDebuggingEnabled(false);
                webView = new WebView(context);
                WebSettings settings = webView.getSettings();
                settings.setJavaScriptEnabled(true);
                settings.setDomStorageEnabled(true);
                settings.setMediaPlaybackRequiresUserGesture(false);
                settings.setAllowFileAccess(false);
                settings.setAllowContentAccess(false);
                webView.addJavascriptInterface(new NativeBridge(), "LeeWayPocketNative");
                webView.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        state = "PAGE_LOADED";
                    }
                });
                state = "LOADING_VOICE_FABRIC";
                webView.loadUrl(BRIDGE_URL);
            } catch (Throwable t) {
                lastError = "WEBVIEW_START:" + t.getClass().getSimpleName() + ":" + String.valueOf(t.getMessage());
                state = "ERROR";
            }
        });
    }

    public void prepare() {
        start();
        evaluate("globalThis.LeeWayAndroidVoice?.prepare?.().catch(()=>{});");
    }

    public boolean speak(String text) {
        String clean = text == null ? "" : text.trim();
        if (clean.isEmpty() || !voiceReady) return false;
        lastChars = clean.length();
        speaking = true;
        streaming = false;
        activeStreamId = "";
        evaluate("globalThis.LeeWayAndroidVoice.speak(" + JSONObject.quote(clean) + ").catch(()=>{});");
        return true;
    }

    public boolean streamStart(String streamId) {
        String id = streamId == null ? "" : streamId.trim();
        if (id.isEmpty() || !voiceReady) return false;
        activeStreamId = id;
        speaking = true;
        streaming = true;
        evaluate("globalThis.LeeWayAndroidVoice.streamStart(" + JSONObject.quote(id) + ").catch(()=>{});");
        return true;
    }

    public boolean streamChunk(String streamId, String text) {
        String id = streamId == null ? "" : streamId.trim();
        String chunk = text == null ? "" : text;
        if (!voiceReady || id.isEmpty() || !id.equals(activeStreamId) || chunk.isEmpty()) return false;
        lastChars = chunk.length();
        evaluate("globalThis.LeeWayAndroidVoice.streamChunk(" + JSONObject.quote(id) + "," + JSONObject.quote(chunk) + ");");
        return true;
    }

    public boolean streamEnd(String streamId) {
        String id = streamId == null ? "" : streamId.trim();
        if (!voiceReady || id.isEmpty() || !id.equals(activeStreamId)) return false;
        evaluate("globalThis.LeeWayAndroidVoice.streamEnd(" + JSONObject.quote(id) + ").catch(()=>{});");
        return true;
    }

    public void stop() {
        speaking = false;
        streaming = false;
        activeStreamId = "";
        evaluate("globalThis.LeeWayAndroidVoice?.stop?.();");
    }

    public void destroy() {
        main.post(() -> {
            try {
                if (webView != null) {
                    webView.stopLoading();
                    webView.loadUrl("about:blank");
                    webView.removeJavascriptInterface("LeeWayPocketNative");
                    webView.destroy();
                }
            } catch (Throwable ignored) {
            }
            webView = null;
            bridgeReady = false;
            voiceReady = false;
            speaking = false;
            streaming = false;
            activeStreamId = "";
            state = "STOPPED";
        });
    }

    public JSONObject status() {
        return new JSONObject()
                .put("ok", true)
                .put("bridgeReady", bridgeReady)
                .put("ready", voiceReady)
                .put("speaking", speaking)
                .put("streaming", streaming)
                .put("activeStreamId", activeStreamId)
                .put("state", state)
                .put("lastError", lastError)
                .put("lastChars", lastChars)
                .put("voicePackageId", VOICE_ID)
                .put("engine", "LEEWAY_VOICE_FABRIC")
                .put("authority", AUTHORITY)
                .put("bridgeUrl", BRIDGE_URL);
    }

    private void evaluate(String js) {
        main.post(() -> {
            try {
                if (webView != null) webView.evaluateJavascript(js, null);
            } catch (Throwable t) {
                lastError = "JS:" + t.getClass().getSimpleName() + ":" + String.valueOf(t.getMessage());
                state = "ERROR";
            }
        });
    }

    private final class NativeBridge {
        @JavascriptInterface
        public void onBridgeReady(String payload) {
            bridgeReady = true;
            state = "ANDROID_BRIDGE_READY";
            lastError = "";
            prepare();
        }

        @JavascriptInterface
        public void onState(String payload) {
            try {
                JSONObject value = new JSONObject(payload);
                state = value.optString("message", state);
            } catch (Throwable ignored) {
                state = payload == null ? state : payload;
            }
        }

        @JavascriptInterface
        public void onReady(String payload) {
            voiceReady = true;
            state = "VOICE_ONE_READY";
            lastError = "";
        }

        @JavascriptInterface
        public void onSpeakComplete(String payload) {
            speaking = false;
            state = "VOICE_ONE_READY";
        }

        @JavascriptInterface
        public void onStreamComplete(String payload) {
            speaking = false;
            streaming = false;
            activeStreamId = "";
            state = "VOICE_ONE_READY";
        }

        @JavascriptInterface
        public void onStopped(String payload) {
            speaking = false;
            streaming = false;
            activeStreamId = "";
            state = "VOICE_STOPPED";
        }

        @JavascriptInterface
        public void onRendered(String payload) {
            state = "VOICE_ONE_STREAMING";
        }

        @JavascriptInterface
        public void onChunkAccepted(String payload) {
            state = "VOICE_ONE_STREAMING";
        }

        @JavascriptInterface
        public void onError(String payload) {
            try {
                JSONObject value = new JSONObject(payload);
                lastError = value.optString("error", payload);
            } catch (Throwable ignored) {
                lastError = payload == null ? "UNKNOWN_VOICE_ERROR" : payload;
            }
            speaking = false;
            streaming = false;
            state = "ERROR";
        }
    }
}
