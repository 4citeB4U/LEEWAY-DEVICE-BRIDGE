package industries.leeway.devicebridge

import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var output: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val passport = DevicePassport.capture(this)
        BootstrapStore.savePassport(this, passport)

        output = TextView(this).apply {
            text = passport.toString(2)
            textSize = 13f
            setPadding(0, 24, 0, 24)
            setTextIsSelectable(true)
        }

        val stop = Button(this).apply {
            text = "STOP AGENT ACCESS"
            setOnClickListener {
                getSharedPreferences("leeway_device_bridge", MODE_PRIVATE)
                    .edit().putBoolean("agent_access_enabled", false).apply()
                output.text = "Agent access stopped locally.\n\n" +
                    DevicePassport.capture(this@MainActivity).toString(2)
            }
        }

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(42, 54, 42, 54)
            addView(TextView(this@MainActivity).apply {
                text = "LeeWay Device Bridge\nNative Device Passport"
                textSize = 24f
            })
            addView(TextView(this@MainActivity).apply {
                text = "LOCAL_OFFLINE · exact hardware identity observed natively"
                textSize = 14f
                setPadding(0, 10, 0, 12)
            })
            addView(stop)
            addView(output)
        }
        setContentView(ScrollView(this).apply { addView(root) })
    }
}
