package industries.leeway.devicebridge

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

class RemoteBridgeBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if(intent?.action == Intent.ACTION_BOOT_COMPLETED && RemoteBridgePrefs.enabled(context)) {
            ContextCompat.startForegroundService(
                context,
                Intent(context,RemoteBridgeService::class.java)
            )
        }
    }
}
