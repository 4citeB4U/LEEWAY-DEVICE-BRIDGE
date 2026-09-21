package industries.leeway.devicebridge

import android.app.Activity
import android.content.Intent
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
        val passport=DevicePassport.capture(this)
        BootstrapStore.savePassport(this,passport)
        ReceiptStore.record(this,"device.info","PASS","Native passport captured")

        output=TextView(this).apply {
            text=passport.toString(2)
            textSize=13f
            setPadding(0,24,0,24)
            setTextIsSelectable(true)
        }

        val discover=Button(this).apply {
            text="REFRESH DEVICE PASSPORT"
            setOnClickListener {
                val fresh=DevicePassport.capture(this@MainActivity)
                BootstrapStore.savePassport(this@MainActivity,fresh)
                ReceiptStore.record(this@MainActivity,"device.info","PASS","Passport refreshed")
                output.text=fresh.toString(2)
            }
        }

        val diagnostics=Button(this).apply {
            text="RUN LOCAL DIAGNOSTICS"
            setOnClickListener {
                val snapshot=Diagnostics.snapshot(this@MainActivity)
                ReceiptStore.record(this@MainActivity,"device.diagnostics","PASS","Local diagnostic snapshot")
                output.text=snapshot.toString(2)
            }
        }

        val files=Button(this).apply {
            text="AUTHORIZE A FILE FOLDER"
            setOnClickListener { FileAccess.requestDirectory(this@MainActivity) }
        }

        val receipts=Button(this).apply {
            text="VIEW LOCAL RECEIPTS"
            setOnClickListener { output.text=ReceiptStore.list(this@MainActivity).toString(2) }
        }

        val enable=Button(this).apply {
            text="ENABLE LOCAL AGENT SESSION"
            setOnClickListener {
                LocalAuthority.setAgentAccess(this@MainActivity,true)
                ReceiptStore.record(this@MainActivity,"device.session.start","PASS","Local agent session enabled")
                output.text="Local Agent Lee session authority: ENABLED\nRemote pairing: NOT ESTABLISHED"
            }
        }

        val stop=Button(this).apply {
            text="STOP AGENT ACCESS"
            setOnClickListener {
                LocalAuthority.setAgentAccess(this@MainActivity,false)
                ReceiptStore.record(this@MainActivity,"device.session.stop","PASS","Owner emergency stop")
                output.text="Agent access stopped locally.\nScreen/control authority: OFF\nRemote commands: NOT AUTHORIZED"
            }
        }

        val root=LinearLayout(this).apply {
            orientation=LinearLayout.VERTICAL
            gravity=Gravity.CENTER_HORIZONTAL
            setPadding(42,54,42,54)
            addView(TextView(this@MainActivity).apply {
                text="LeeWay Device Bridge\nDevice Control Center"
                textSize=24f
            })
            addView(TextView(this@MainActivity).apply {
                text="LOCAL_OFFLINE · native authority · owner controlled"
                textSize=14f
                setPadding(0,10,0,18)
            })
            listOf(discover,diagnostics,files,receipts,enable,stop).forEach { addView(it) }
            addView(output)
        }
        setContentView(ScrollView(this).apply { addView(root) })
    }

    @Deprecated("Legacy activity result retained for minimum-compatible SAF handoff")
    override fun onActivityResult(requestCode:Int,resultCode:Int,data:Intent?) {
        super.onActivityResult(requestCode,resultCode,data)
        if(requestCode==FileAccess.REQUEST_OPEN_TREE && resultCode==Activity.RESULT_OK) {
            val uri=FileAccess.persistDirectory(this,data)
            output.text="Authorized file tree:\n${uri ?: "NONE"}\n\nLeeWay file access remains limited to platform-granted scope."
        }
    }
}
