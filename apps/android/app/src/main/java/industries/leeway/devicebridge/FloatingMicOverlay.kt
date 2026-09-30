package industries.leeway.devicebridge

import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.provider.Settings
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.TextView

object FloatingMicOverlay {
    private const val PREFS = "leeway_floating_mic"
    private const val ENABLED = "enabled"

    @Volatile private var overlayView: View? = null
    @Volatile private var windowManager: WindowManager? = null

    fun enabled(context: Context): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(ENABLED, false)

    fun setEnabled(context: Context, enabled: Boolean) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean(ENABLED, enabled).apply()
        if (!enabled) detach()
    }

    fun canDraw(context: Context): Boolean = Settings.canDrawOverlays(context)

    @Synchronized
    fun attach(context: Context) {
        if (overlayView != null || !enabled(context) || !canDraw(context)) return
        val appContext = context.applicationContext
        val wm = appContext.getSystemService(WindowManager::class.java)
        val size = dp(appContext, 54)
        val params = WindowManager.LayoutParams(
            size,
            size,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.END or Gravity.CENTER_VERTICAL
            x = 0
            y = 0
        }

        val button = TextView(appContext).apply {
            text = "🎙"
            textSize = 24f
            gravity = Gravity.CENTER
            contentDescription = "Talk to Agent Lee"
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(appContext, 18).toFloat()
                setColor(0xE6122A46.toInt())
                setStroke(dp(appContext, 1), 0xFF5BCBFF.toInt())
            }
            setOnClickListener {
                val intent = Intent(appContext, AgentLeeTalkActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                }
                appContext.startActivity(intent)
            }
        }

        var downY = 0f
        var startY = 0
        var moved = false
        button.setOnTouchListener { _, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    downY = event.rawY
                    startY = params.y
                    moved = false
                    false
                }
                MotionEvent.ACTION_MOVE -> {
                    val delta = (event.rawY - downY).toInt()
                    if (kotlin.math.abs(delta) > dp(appContext, 4)) moved = true
                    params.y = startY + delta
                    runCatching { wm.updateViewLayout(button, params) }
                    true
                }
                MotionEvent.ACTION_UP -> moved
                else -> false
            }
        }

        runCatching {
            wm.addView(button, params)
            overlayView = button
            windowManager = wm
            ReceiptStore.record(appContext, "agent.overlay.mic", "PASS", "Floating Agent Lee mic attached")
        }.onFailure {
            ReceiptStore.record(appContext, "agent.overlay.mic", "FAIL", it.javaClass.simpleName)
        }
    }

    @Synchronized
    fun detach() {
        val view = overlayView ?: return
        runCatching { windowManager?.removeView(view) }
        overlayView = null
        windowManager = null
    }

    private fun dp(context: Context, value: Int): Int =
        (value * context.resources.displayMetrics.density).toInt().coerceAtLeast(1)
}
