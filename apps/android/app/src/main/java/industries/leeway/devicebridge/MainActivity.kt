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
        val passport = DevicePassport.capture(this)
        BootstrapStore.savePassport(this, passport)
        ReceiptStore.record(this, "device.info", "PASS", "Native passport captured")

        output = TextView(this).apply {
            text = passport.toString(2)
            textSize = 13f
            setPadding(0, 24, 0, 24)
            setTextIsSelectable(true)
        }

        val discover = Button(this).apply {
            text = "REFRESH DEVICE PASSPORT"
            setOnClickListener {
                val fresh = DevicePassport.capture(this@MainActivity)
                BootstrapStore.savePassport(this@MainActivity, fresh)
                ReceiptStore.record(this@MainActivity, "device.info", "PASS", "Passport refreshed")
                output.text = fresh.toString(2)
            }
        }

        val diagnostics = Button(this).apply {
            text = "RUN LOCAL DIAGNOSTICS"
            setOnClickListener {
                val snapshot = Diagnostics.snapshot(this@MainActivity)
                ReceiptStore.record(this@MainActivity, "device.diagnostics", "PASS", "Local diagnostic snapshot")
                output.text = snapshot.toString(2)
            }
        }

        val files = Button(this).apply {
            text = "AUTHORIZE A FILE FOLDER"
            setOnClickListener { FileAccess.requestDirectory(this@MainActivity) }
        }

        val receipts = Button(this).apply {
            text = "VIEW LOCAL RECEIPTS"
            setOnClickListener { output.text = ReceiptStore.list(this@MainActivity).toString(2) }
        }

        val authorizeBluetooth = Button(this).apply {
            text = "AUTHORIZE BLUETOOTH PROVIDER"
            setOnClickListener {
                val required = BluetoothProvider.requiredPermissions()
                if (required.isEmpty() || BluetoothProvider.hasRequiredPermissions(this@MainActivity)) {
                    output.text = BluetoothProvider.snapshot(this@MainActivity).toString(2)
                } else {
                    requestPermissions(required, 4202)
                    output.text = "Bluetooth permission request opened. Approve it, then run Bluetooth provider discovery."
                }
            }
        }

        val bluetooth = Button(this).apply {
            text = "DISCOVER BLUETOOTH PROVIDER"
            setOnClickListener {
                val snapshot = BluetoothProvider.snapshot(this@MainActivity)
                ReceiptStore.record(
                    this@MainActivity,
                    BluetoothProvider.CAPABILITY,
                    if (snapshot.optBoolean("verified")) "PASS" else "BLOCKED",
                    "bondedDeviceCount=${snapshot.optInt("bondedDeviceCount")}"
                )
                output.text = snapshot.toString(2)
            }
        }

        val networkDiscovery = Button(this).apply {
            text = "DISCOVER LAN PROVIDERS"
            setOnClickListener {
                output.text = "Network discovery running..."
                Thread {
                    val snapshot = NetworkDiscoveryProvider.discover(this@MainActivity)
                    ReceiptStore.record(
                        this@MainActivity,
                        NetworkDiscoveryProvider.CAPABILITY,
                        if (snapshot.optBoolean("verified")) "PASS" else "FAIL",
                        "ssdp=" + snapshot.optInt("ssdpDeviceCount") + " dnsSd=" + snapshot.optInt("dnsSdServiceCount")
                    )
                    runOnUiThread { output.text = snapshot.toString(2) }
                }.start()
            }
        }
        val enable = Button(this).apply {
            text = "ENABLE LOCAL AGENT SESSION"
            setOnClickListener {
                LocalAuthority.setAgentAccess(this@MainActivity, true)
                ReceiptStore.record(this@MainActivity, "device.session.start", "PASS", "Local agent session enabled")
                output.text = LocalBridgeServer.status(this@MainActivity).toString(2)
            }
        }

        val startBridge = Button(this).apply {
            text = "START LOCAL DEVICE BRIDGE"
            setOnClickListener {
                output.text = try {
                    LocalBridgeServer.start(this@MainActivity).toString(2)
                } catch (e: Exception) {
                    ReceiptStore.record(this@MainActivity, "device.bridge.start", "FAIL", e.javaClass.simpleName)
                    "Bridge start failed: ${e.javaClass.simpleName}"
                }
            }
        }

        val selfTest = Button(this).apply {
            text = "RUN BRIDGE SELF-TEST"
            setOnClickListener {
                output.text = BridgeSelfTest.run(this@MainActivity).toString(2)
            }
        }

        val showToken = Button(this).apply {
            text = "SHOW PAIRING TOKEN"
            setOnClickListener {
                val token = BridgeSecret.ensure(this@MainActivity)
                output.text = "Owner pairing token (keep private):\n$token\n\nLoopback endpoint: http://127.0.0.1:${LocalBridgeServer.PORT}"
            }
        }

        val stopBridge = Button(this).apply {
            text = "STOP LOCAL DEVICE BRIDGE"
            setOnClickListener {
                output.text = LocalBridgeServer.stop(this@MainActivity).toString(2)
            }
        }

        val stop = Button(this).apply {
            text = "STOP AGENT ACCESS"
            setOnClickListener {
                LocalAuthority.setAgentAccess(this@MainActivity, false)
                ReceiptStore.record(this@MainActivity, "device.session.stop", "PASS", "Owner emergency stop")
                output.text = "Agent access stopped locally.\nProtected bridge routes: BLOCKED\nRemote commands: NOT AUTHORIZED"
            }
        }

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(42, 54, 42, 54)
            addView(TextView(this@MainActivity).apply {
                text = "LeeWay Device Bridge\nDevice Control Center"
                textSize = 24f
            })
            addView(TextView(this@MainActivity).apply {
                text = "PHONE_LOCAL | owner controlled | GitHub Pages distributed"
                textSize = 14f
                setPadding(0, 10, 0, 18)
            })
            listOf(
                discover, diagnostics, files, receipts, authorizeBluetooth, bluetooth, networkDiscovery,
                enable, startBridge, selfTest, showToken, stopBridge, stop
            ).forEach { addView(it) }
            addView(output)
        }

        setContentView(ScrollView(this).apply { addView(root) })
    }

    @Deprecated("Legacy activity result retained for minimum-compatible SAF handoff")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FileAccess.REQUEST_OPEN_TREE && resultCode == Activity.RESULT_OK) {
            val uri = FileAccess.persistDirectory(this, data)
            output.text = "Authorized file tree:\n${uri ?: "NONE"}\n\nLeeWay file access remains limited to platform-granted scope."
        }
    }
}
