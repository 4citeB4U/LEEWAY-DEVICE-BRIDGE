/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.ANDROID.ORIGINAL_VOICE
TAG: LEEWAY.ANDROID.VOICE_FABRIC_EXISTING_VOICE_ONE_BINDING.V1
5WH:
WHAT = Route authorized phone Device Bridge voice.status and voice.speak to the already-existing Agent Lee Voice One Android loopback service.
WHY = The original Voice Fabric already runs in its Android host, while this Device Bridge caller previously returned VOICE_UNAVAILABLE without attempting that existing route.
WHO = LeeWay Industries under Creator authorization; outside support contributes to the existing review branch, not Agent Lee.
WHERE = apps/android/app/src/main/java/industries/leeway/devicebridge/VoiceRuntime.kt
WHEN = 2026-11-21
HOW = Verify bounded loopback status/voice identity; submit only owner-admitted text to the original service; fail closed and distinguish queued synthesis from heard playback.
AUTHORITY = Original 4citeB4U/LeeWay-Voice-Fabric + existing RemoteCommandRouter Formula/owner gate. No new TTS, selected package, issuer, relay, microphone or OS permission.
LICENSE = MIT
*/
package industries.leeway.devicebridge

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Looper
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets

object VoiceRuntime {
    const val VOICE_FABRIC_URL = "https://4citeb4u.github.io/LeeWay-Voice-Fabric/"
    private const val VOICE_AUTHORITY = "4citeB4U/LeeWay-Voice-Fabric"
    private const val VOICE_LOOPBACK = "http://127.0.0.1:54321"
    private const val VOICE_UNAVAILABLE = "VOICE_UNAVAILABLE"
    private const val MAX_RESPONSE_BYTES = 32 * 1024
    @Volatile private var lastStatus = unavailable(VOICE_UNAVAILABLE).toString()

    // UI health remains nonblocking. It is a cached observation, not a fresh
    // probe or acoustic attestation. The existing relay command uses initialize.
    fun status(context: Context): JSONObject =
        JSONObject(lastStatus).put("readback", "CACHED_NOT_LIVE_PROBED")

    fun initialize(context: Context): JSONObject {
        if (Looper.myLooper() == Looper.getMainLooper()) {
            return status(context).put("readback", "BACKGROUND_PROBE_REQUIRED")
        }
        return try {
            val (httpStatus, data) = request("GET", "/health")
            if (httpStatus != 200 || data.optBoolean("ok") != true ||
                data.optString("authority") != VOICE_AUTHORITY ||
                data.optString("engine") != "LEEWAY_VOICE_FABRIC") {
                unavailable("VOICE_FABRIC_AUTHORITY_OR_STATUS_INVALID")
            } else {
                val packageId = data.optString("voicePackageId")
                if (packageId.isBlank() || packageId.length > 128) {
                    unavailable("VOICE_FABRIC_PACKAGE_INVALID")
                } else {
                    JSONObject().apply {
                        put("ok", true)
                        put("available", true)
                        put("ready", data.optBoolean("ready") && data.optBoolean("bridgeReady") && !data.optBoolean("muted"))
                        put("bridgeReady", data.optBoolean("bridgeReady"))
                        put("muted", data.optBoolean("muted"))
                        put("state", data.optString("state", "UNKNOWN"))
                        put("engine", "LEEWAY_VOICE_FABRIC")
                        put("authority", VOICE_AUTHORITY)
                        put("voicePackageId", packageId)
                        put("fallbackAllowed", false)
                        put("playbackVerified", false)
                        put("readback", "ORIGINAL_PHONE_LOOPBACK_OBSERVED_NOT_INDEPENDENTLY_VERIFIED")
                    }
                }
            }
        } catch (_: Exception) {
            unavailable(VOICE_UNAVAILABLE)
        }.also { lastStatus = it.toString() }
    }

    fun openVoiceFabric(context: Context): JSONObject {
        return try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(VOICE_FABRIC_URL)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            ReceiptStore.record(
                context, "voice.fabric.open", "PASS", "Opened the canonical LeeWay Voice Fabric interface."
            )
            JSONObject().apply {
                put("ok", true); put("opened", true)
                put("voiceFabricUrl", VOICE_FABRIC_URL)
                put("authority", VOICE_AUTHORITY)
            }
        } catch (e: Exception) {
            ReceiptStore.record(context, "voice.fabric.open", "FAIL", e.message ?: e.javaClass.simpleName)
            JSONObject().apply {
                put("ok", false); put("opened", false)
                put("error", e.message ?: e.javaClass.simpleName)
            }
        }
    }

    fun speak(context: Context, text: String): JSONObject {
        val clean = text.trim()
        if (clean.isEmpty() || clean.length > 4096) return blocked("VOICE_TEXT_INVALID")
        if (Looper.myLooper() == Looper.getMainLooper()) return blocked("VOICE_BACKGROUND_EXECUTION_REQUIRED")

        val observed = initialize(context)
        if (!observed.optBoolean("ok") || !observed.optBoolean("ready")) {
            return blocked(observed.optString("error", "VOICE_FABRIC_NOT_READY"))
        }
        val observedPackage = observed.optString("voicePackageId")
        return try {
            val (status, value) = request("POST", "/speak", JSONObject().put("text", clean))
            if (status != 202 || !value.optBoolean("ok") || !value.optBoolean("accepted") ||
                value.optString("authority") != VOICE_AUTHORITY ||
                value.optString("engine") != "LEEWAY_VOICE_FABRIC" ||
                value.optString("voicePackageId") != observedPackage) {
                blocked("VOICE_FABRIC_SPEAK_NOT_ADMITTED")
            } else {
                ReceiptStore.record(
                    context, "voice.fabric.speak", "ACCEPTED",
                    "Original Voice One service accepted a queued utterance; acoustic playback not independently verified"
                )
                JSONObject().apply {
                    put("ok", true); put("accepted", true); put("spoken", false)
                    put("playbackVerified", false)
                    put("chars", clean.length)
                    put("engine", "LEEWAY_VOICE_FABRIC")
                    put("authority", VOICE_AUTHORITY)
                    put("voicePackageId", observedPackage)
                    put("fallbackAllowed", false)
                    put("state", "ORIGINAL_VOICE_FABRIC_QUEUED_NOT_AUDIBLY_VERIFIED")
                }
            }
        } catch (_: Exception) {
            blocked(VOICE_UNAVAILABLE)
        }
    }

    private fun request(method: String, path: String, payload: JSONObject? = null): Pair<Int, JSONObject> {
        // Fixed, bounded localhost origin only. No caller-provided destination,
        // credentials, redirect, provider identity or voice-package mutation.
        if (!((method == "GET" && path == "/health" && payload == null) ||
              (method == "POST" && path == "/speak" && payload != null))) {
            throw IllegalArgumentException("VOICE_FABRIC_ROUTE_DENIED")
        }
        val connection = URL(VOICE_LOOPBACK + path).openConnection() as HttpURLConnection
        try {
            connection.connectTimeout = 2000
            connection.readTimeout = 4000
            connection.instanceFollowRedirects = false
            connection.useCaches = false
            connection.requestMethod = method
            connection.setRequestProperty("Accept", "application/json")
            if (method == "POST") {
                val body = payload!!.toString().toByteArray(StandardCharsets.UTF_8)
                if (body.size > 16 * 1024) throw IllegalArgumentException("VOICE_REQUEST_TOO_LARGE")
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                connection.setFixedLengthStreamingMode(body.size)
                connection.outputStream.use { it.write(body) }
            }
            val status = connection.responseCode
            if (status != 200 && status != 202) throw IllegalStateException("VOICE_FABRIC_HTTP_DENIED")
            if (!connection.contentType.orEmpty().lowercase().startsWith("application/json")) {
                throw IllegalStateException("VOICE_FABRIC_JSON_REQUIRED")
            }
            if (connection.contentLengthLong > MAX_RESPONSE_BYTES) {
                throw IllegalStateException("VOICE_FABRIC_RESPONSE_TOO_LARGE")
            }
            val output = ByteArrayOutputStream()
            connection.inputStream.use { input ->
                val buffer = ByteArray(4096)
                while (true) {
                    val n = input.read(buffer)
                    if (n == -1) break
                    output.write(buffer, 0, n)
                    if (output.size() > MAX_RESPONSE_BYTES) {
                        throw IllegalStateException("VOICE_FABRIC_RESPONSE_TOO_LARGE")
                    }
                }
            }
            return status to JSONObject(String(output.toByteArray(), StandardCharsets.UTF_8))
        } finally {
            connection.disconnect()
        }
    }

    private fun unavailable(reason: String): JSONObject = JSONObject().apply {
        put("ok", false); put("available", false); put("ready", false)
        put("engine", "LEEWAY_VOICE_FABRIC")
        put("authority", VOICE_AUTHORITY)
        put("fallbackAllowed", false)
        put("playbackVerified", false)
        put("state", VOICE_UNAVAILABLE); put("error", reason)
    }

    private fun blocked(reason: String): JSONObject = JSONObject().apply {
        put("ok", false); put("accepted", false); put("spoken", false)
        put("playbackVerified", false)
        put("engine", "LEEWAY_VOICE_FABRIC")
        put("authority", VOICE_AUTHORITY)
        put("fallbackAllowed", false)
        put("error", reason)
    }

    fun stop() {}

    fun shutdown() {}
}
