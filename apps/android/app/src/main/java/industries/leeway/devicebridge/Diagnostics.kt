package industries.leeway.devicebridge

import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.BatteryManager
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject

object Diagnostics {
    fun snapshot(context: Context): JSONObject {
        val battery = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

        val audioJson = JSONObject().apply {
            if (audioManager != null) {
                val currentVol = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC)
                val maxVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
                val isMuted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    audioManager.isStreamMute(AudioManager.STREAM_MUSIC)
                } else {
                    currentVol == 0
                }

                val outputsArray = JSONArray()
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    val devices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
                    for (dev in devices) {
                        outputsArray.put(JSONObject().apply {
                            put("type", deviceTypeName(dev.type))
                            put("productName", dev.productName?.toString() ?: "Unknown")
                        })
                    }
                }

                put("outputs", outputsArray)
                put("streamVolume", JSONObject().apply {
                    put("music", JSONObject().apply {
                        put("current", currentVol)
                        put("max", maxVol)
                    })
                })
                put("muted", isMuted)
                put("mode", audioManager.mode)
                put("speechBusy", audioManager.isMusicActive)
                put("ttsEngines", JSONArray().apply {
                    put("com.google.android.tts")
                    put("com.samsung.SMT")
                })
            }
        }

        return JSONObject().apply {
            put("authority", "LOCAL_DEVICE_RUNTIME")
            put("batteryPercent", battery.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY))
            put("chargeCounter", battery.getIntProperty(BatteryManager.BATTERY_PROPERTY_CHARGE_COUNTER))
            put("currentNow", battery.getIntProperty(BatteryManager.BATTERY_PROPERTY_CURRENT_NOW))
            put("energyCounter", battery.getLongProperty(BatteryManager.BATTERY_PROPERTY_ENERGY_COUNTER))
            put("audio", audioJson)
            put("passport", DevicePassport.capture(context))
        }
    }

    private fun deviceTypeName(type: Int): String {
        return when (type) {
            AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> "BUILTIN_SPEAKER"
            AudioDeviceInfo.TYPE_BUILTIN_EARPIECE -> "BUILTIN_EARPIECE"
            AudioDeviceInfo.TYPE_WIRED_HEADSET -> "WIRED_HEADSET"
            AudioDeviceInfo.TYPE_WIRED_HEADPHONES -> "WIRED_HEADPHONES"
            AudioDeviceInfo.TYPE_BLUETOOTH_A2DP -> "BLUETOOTH_A2DP"
            AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> "BLUETOOTH_SCO"
            AudioDeviceInfo.TYPE_USB_DEVICE -> "USB_DEVICE"
            AudioDeviceInfo.TYPE_USB_HEADSET -> "USB_HEADSET"
            else -> "OUTPUT_$type"
        }
    }
}
