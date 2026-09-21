package industries.leeway.devicebridge

import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val view = TextView(this).apply {
            text = """
                LeeWay Device Bridge

                DEVICE        LOCAL
                AGENT LEE     NOT PAIRED
                HEALTH        BASELINE PENDING

                Capabilities
                • Files — discovery pending
                • Diagnostics — discovery pending
                • Screen — not authorized
                • Pointer — not authorized
                • Control — not authorized

                Native runtime: LOCAL_OFFLINE
                Network is not required for this screen.

                STOP AGENT ACCESS
            """.trimIndent()
            textSize = 18f
            setPadding(48, 64, 48, 64)
        }
        setContentView(view)
    }
}
