package industries.leeway.devicebridge

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioManager
import android.telecom.TelecomManager
import android.telephony.TelephonyManager
import org.json.JSONObject

object TelephonyRuntime {
    const val STATUS = "phone.call.status"
    const val ANSWER = "phone.call.answer"
    const val SPEAKER = "phone.call.speaker"

    fun requiredPermissions(): Array<String> = arrayOf(
        Manifest.permission.READ_PHONE_STATE,
        Manifest.permission.ANSWER_PHONE_CALLS
    )

    fun hasPermissions(context: Context): Boolean =
        requiredPermissions().all { context.checkSelfPermission(it) == PackageManager.PERMISSION_GRANTED }

    fun status(context: Context): JSONObject {
        val telephony = context.getSystemService(TelephonyManager::class.java)
        val state = if (context.checkSelfPermission(Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED) {
            try { telephony?.callState ?: TelephonyManager.CALL_STATE_IDLE }
            catch (_: SecurityException) { -1 }
        } else -1
        val label = when (state) {
            TelephonyManager.CALL_STATE_IDLE -> "IDLE"
            TelephonyManager.CALL_STATE_RINGING -> "RINGING"
            TelephonyManager.CALL_STATE_OFFHOOK -> "OFFHOOK"
            else -> "UNKNOWN"
        }
        val audio = context.getSystemService(AudioManager::class.java)
        return JSONObject().apply {
            put("ok", state >= 0)
            put("callState", label)
            put("callStateCode", state)
            put("readPhoneStateGranted", context.checkSelfPermission(Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED)
            put("answerPhoneCallsGranted", context.checkSelfPermission(Manifest.permission.ANSWER_PHONE_CALLS) == PackageManager.PERMISSION_GRANTED)
            put("speakerphoneOn", audio?.isSpeakerphoneOn == true)
            put("authority", "PHONE_LOCAL_TELEPHONY")
        }
    }

    fun setSpeaker(context: Context, enabled: Boolean): JSONObject {
        val audio = context.getSystemService(AudioManager::class.java)
            ?: return JSONObject().put("ok", false).put("error", "AUDIO_MANAGER_UNAVAILABLE")
        audio.mode = AudioManager.MODE_IN_COMMUNICATION
        @Suppress("DEPRECATION")
        run { audio.isSpeakerphoneOn = enabled }
        ReceiptStore.record(context, SPEAKER, "PASS", "speakerphone=$enabled")
        return status(context).put("requestedSpeakerphone", enabled)
    }

    fun answer(context: Context, useSpeaker: Boolean = true): JSONObject {
        if (context.checkSelfPermission(Manifest.permission.ANSWER_PHONE_CALLS) != PackageManager.PERMISSION_GRANTED) {
            return JSONObject().put("ok", false).put("error", "ANSWER_PHONE_CALLS_NOT_GRANTED").put("status", status(context))
        }
        val before = status(context)
        if (before.optString("callState") != "RINGING") {
            return JSONObject().put("ok", false).put("error", "NO_RINGING_CALL").put("status", before)
        }
        val telecom = context.getSystemService(TelecomManager::class.java)
            ?: return JSONObject().put("ok", false).put("error", "TELECOM_MANAGER_UNAVAILABLE")
        return try {
            @Suppress("DEPRECATION")
            telecom.acceptRingingCall()
            if (useSpeaker) setSpeaker(context, true)
            val after = status(context)
            ReceiptStore.record(context, ANSWER, "PASS", "ringing call answered; speaker=$useSpeaker")
            JSONObject().apply {
                put("ok", true)
                put("before", before)
                put("after", after)
                put("authority", "OWNER_AUTHORIZED_PHONE_CALL_CONTROL")
            }
        } catch (e: SecurityException) {
            ReceiptStore.record(context, ANSWER, "BLOCKED", e.message ?: "SecurityException")
            JSONObject().put("ok", false).put("error", e.message ?: "SecurityException").put("status", status(context))
        } catch (e: Exception) {
            ReceiptStore.record(context, ANSWER, "FAIL", e.message ?: e.javaClass.simpleName)
            JSONObject().put("ok", false).put("error", e.message ?: e.javaClass.simpleName).put("status", status(context))
        }
    }
}
