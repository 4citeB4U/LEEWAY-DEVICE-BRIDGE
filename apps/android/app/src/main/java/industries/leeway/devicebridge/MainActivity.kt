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

        val runtimeState = TextView(this).apply {
            textSize = 15f
            setPadding(0, 12, 0, 18)
        }

        fun refreshRuntimeState() {
            val model = ModelRuntime.status(this@MainActivity)
            val remote = RemoteRelayState.status(this@MainActivity)
            val modelLabel = if (model.optBoolean("verified")) "VERIFIED" else "NOT VERIFIED"
            val remoteLabel = if (remote.optBoolean("connected")) {
                "CONNECTED"
            } else if (remote.optBoolean("enabled")) {
                "CONNECTING"
            } else {
                "OFF"
            }
            runtimeState.text =
                "LOCAL MODEL: " + modelLabel +
                "\nREMOTE RELAY: " + remoteLabel +
                "\nDEVICE: " + remote.optString("deviceId")
        }
        refreshRuntimeState()

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
        val modelStatus = Button(this).apply {
            text = "LOCAL MODEL STATUS"
            setOnClickListener {
                output.text = ModelRuntime.status(this@MainActivity).toString(2)
            }
        }

        val modelDownload = Button(this).apply {
            text = "DOWNLOAD LOCAL MODEL"
            setOnClickListener {
                output.text = "Model download starting..."
                Thread {
                    try {
                        val status = ModelRuntime.download(this@MainActivity) { done, total ->
                            val pct = if (total > 0) ((done * 100) / total).coerceIn(0, 100) else 0
                            runOnUiThread {
                                output.text = "Downloading local model... " + pct + "%\n" + done + " / " + total + " bytes"
                            }
                        }
                        runOnUiThread { output.text = status.toString(2) }
                    } catch (e: Exception) {
                        val detail = e.message ?: e.javaClass.simpleName
                        ReceiptStore.record(
                            this@MainActivity,
                            "model.install",
                            "FAIL",
                            detail
                        )
                        runOnUiThread {
                            output.text = "Model download failed: " + detail
                        }
                    }
                }.start()
            }
        }

        val modelTest = Button(this).apply {
            text = "RUN LOCAL MODEL TEST"
            setOnClickListener {
                output.text = "Local model inference starting..."
                Thread {
                    val result = try {
                        ModelRuntime.generate(
                            this@MainActivity,
                            "Respond with exactly: LEEWAY_MODEL_READY"
                        )
                    } catch (e: Exception) {
                        val detail = e.message ?: e.javaClass.simpleName
                        ReceiptStore.record(
                            this@MainActivity,
                            "model.inference",
                            "FAIL",
                            detail
                        )
                        org.json.JSONObject().apply {
                            put("ok", false)
                            put("error", detail)
                        }
                    }
                    runOnUiThread { output.text = result.toString(2) }
                }.start()
            }
        }
        val remoteEnable = Button(this).apply {
            text = "ENABLE ALWAYS-ON REMOTE BRIDGE"
            setOnClickListener {
                RemoteRelayService.start(this@MainActivity)
                output.text = RemoteRelayState.status(this@MainActivity).toString(2)
                refreshRuntimeState()
            }
        }

        val remoteStatus = Button(this).apply {
            text = "REMOTE BRIDGE STATUS"
            setOnClickListener {
                output.text = RemoteRelayState.status(this@MainActivity).toString(2)
                refreshRuntimeState()
            }
        }

        val remoteDisable = Button(this).apply {
            text = "DISABLE ALWAYS-ON REMOTE BRIDGE"
            setOnClickListener {
                RemoteRelayService.stop(this@MainActivity)
                output.text = RemoteRelayState.status(this@MainActivity).toString(2)
                refreshRuntimeState()
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
                val identity = DeviceIdentity.ensure(this@MainActivity)
                output.text =
                    "Device ID:\n" + identity.optString("deviceId") +
                    "\n\nRemote relay:\n" + RemoteRelayState.relayUrl(this@MainActivity) +
                    "\n\nOwner pairing token (keep private):\n" + token +
                    "\n\nLocal endpoint: http://127.0.0.1:" + LocalBridgeServer.PORT
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
            addView(runtimeState)
            listOf(
                discover, diagnostics, files, receipts, authorizeBluetooth, bluetooth, networkDiscovery,
                modelStatus, modelDownload, modelTest,
                remoteEnable, remoteStatus, remoteDisable,
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
