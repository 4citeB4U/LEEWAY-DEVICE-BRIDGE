package industries.leeway.devicebridge

import android.content.Context
import org.json.JSONObject

object RemoteBridgePrefs {
    private const val PREFS="leeway_device_bridge"
    private const val ENABLED="remote_bridge_enabled"
    private const val STATE="remote_bridge_state"
    private const val RELAY_URL="remote_bridge_relay_url"
    private const val AUTHENTICATED="remote_bridge_authenticated"
    private const val LAST_CONNECTED="remote_bridge_last_connected"

    fun enabled(context: Context): Boolean =
        context.getSharedPreferences(PREFS,Context.MODE_PRIVATE).getBoolean(ENABLED,false)

    fun setEnabled(context: Context, value: Boolean) {
        context.getSharedPreferences(PREFS,Context.MODE_PRIVATE)
            .edit().putBoolean(ENABLED,value).apply()
    }

    fun setState(
        context: Context,
        state: String,
        relayUrl: String? = null,
        authenticated: Boolean = false
    ) {
        val editor=context.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit()
            .putString(STATE,state)
            .putBoolean(AUTHENTICATED,authenticated)
        if(relayUrl != null) editor.putString(RELAY_URL,relayUrl)
        if(authenticated) editor.putLong(LAST_CONNECTED,System.currentTimeMillis())
        editor.apply()
    }

    fun status(context: Context): JSONObject {
        val p=context.getSharedPreferences(PREFS,Context.MODE_PRIVATE)
        return JSONObject().apply {
            put("enabled",p.getBoolean(ENABLED,false))
            put("state",p.getString(STATE,"STOPPED"))
            put("relayUrl",p.getString(RELAY_URL,null))
            put("authenticated",p.getBoolean(AUTHENTICATED,false))
            put("lastConnectedEpochMs",p.getLong(LAST_CONNECTED,0L))
            put("transport","OUTBOUND_WSS")
            put("authority","PHONE_LOCAL_RUNTIME")
        }
    }
}
