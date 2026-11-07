package industries.leeway.devicebridge

import android.content.Context
import org.json.JSONObject
import java.net.URI

object RemoteRelayState {
    private const val PREFS = "leeway_device_bridge"
    private const val ENABLED = "remote_relay_enabled"
    private const val CONNECTED = "remote_relay_connected"
    private const val URL = "remote_relay_url"
    private const val LAST = "remote_relay_last_event"
    const val CONFIG_URL =
        "https://4citeb4u.github.io/LEEWAY-DEVICE-BRIDGE/docs/remote-relay.json"

    fun enabled(context: Context): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean(ENABLED, false)

    fun setEnabled(context: Context, enabled: Boolean) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean(ENABLED, enabled).apply()
    }
    fun relayUrl(context: Context): String? =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(URL, null)
            ?.takeIf(::isApprovedTransportUrl)

    fun setRelayUrl(context: Context, url: String?) {
        val preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val normalized = url?.trim()?.takeIf(String::isNotEmpty)
        if (normalized == null) {
            preferences.edit().remove(URL).apply()
            return
        }
        require(isApprovedTransportUrl(normalized)) { "RELAY_URL_MUST_USE_WSS" }
        preferences.edit().putString(URL, normalized).apply()
    }

    private fun isApprovedTransportUrl(url: String): Boolean = runCatching {
        val parsed = URI(url)
        parsed.scheme.equals("wss", ignoreCase = true) &&
            !parsed.host.isNullOrBlank() &&
            parsed.userInfo == null &&
            parsed.rawQuery == null &&
            parsed.fragment == null
    }.getOrDefault(false)

    fun clearRelayUrl(context: Context) {
        setRelayUrl(context, null)
    }

    fun setConnection(context: Context, connected: Boolean, detail: String) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(CONNECTED, connected)
            .putString(LAST, detail)
            .apply()
    }

    fun status(context: Context): JSONObject {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val identity = DeviceIdentity.ensure(context)
        return JSONObject().apply {
            put("enabled", prefs.getBoolean(ENABLED, false))
            put("connected", prefs.getBoolean(CONNECTED, false))
            put("relayUrl", prefs.getString(URL, null)?.takeIf(::isApprovedTransportUrl))
            put("lastEvent", prefs.getString(LAST, "NOT_STARTED"))
            put("deviceId", identity.optString("deviceId"))
            put("pairingTokenProvisioned", BridgeSecret.ensure(context).isNotBlank())
            put("authority", "PHONE_LOCAL_REMOTE_TRANSPORT")
        }
    }
}
