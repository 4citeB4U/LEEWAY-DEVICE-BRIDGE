package industries.leeway.devicebridge

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import org.json.JSONObject

object AgentLeeOverlayController {
    @Volatile private var view: View? = null
    @Volatile private var windowManager: WindowManager? = null

    fun canShow(context: Context): Boolean = Settings.canDrawOverlays(context)

    @Synchronized
    fun show(context: Context): JSONObject {
        if (!canShow(context)) return status(context).apply {
            put("ok", false)
            put("error", "OVERLAY_PERMISSION_REQUIRED")
        }
        if (view != null) return status(context).put("ok", true)

        val app = context.applicationContext
        val wm = app.getSystemService(Context.WINDOW_SERVICE) as WindowManager
        val density = app.resources.displayMetrics.density
        val tab = TextView(app).apply {
            text = "🎙"
            textSize = 25f
            gravity = Gravity.CENTER
            contentDescription = "Talk to Agent Lee"
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadii = floatArrayOf(
                    24f*density,24f*density,0f,0f,0f,0f,24f*density,24f*density
                )
                setColor(Color.rgb(5, 28, 58))
                setStroke((1f*density).toInt().coerceAtLeast(1), Color.rgb(70, 207, 255))
            }
            setOnClickListener {
                app.startActivity(Intent(app, AgentLeeTalkActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                })
            }
        }

        val params = WindowManager.LayoutParams(
            (58f*density).toInt(),
            (78f*density).toInt(),
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.END or Gravity.CENTER_VERTICAL
            x = 0
            y = 0
        }

        wm.addView(tab, params)
        windowManager = wm
        view = tab
        ReceiptStore.record(app, "agent.overlay.start", "PASS", "Owner-authorized side mic attached")
        return status(app).put("ok", true)
    }

    @Synchronized
    fun hide(context: Context) {
        val current = view ?: return
        runCatching { windowManager?.removeView(current) }
        view = null
        windowManager = null
        ReceiptStore.record(context, "agent.overlay.stop", "PASS", "Side mic removed")
    }

    fun status(context: Context): JSONObject = JSONObject().apply {
        put("permission", canShow(context))
        put("visible", view != null)
        put("surface", "SIDE_MIC_TAB")
        put("authority", "OWNER_AUTHORIZED_ANDROID_OVERLAY")
    }
}
