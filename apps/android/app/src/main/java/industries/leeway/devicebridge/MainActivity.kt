package industries.leeway.devicebridge

import android.app.Activity
import android.content.Intent
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.net.Uri
import android.provider.Settings
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.content.pm.PackageManager
import android.Manifest
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var output: TextView
    private var speechRecognizer: SpeechRecognizer? = null

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

        val pairingToken = BridgeSecret.ensure(this)
        val pairingPanel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24, 24, 24, 24)
        }
        val pairingTitle = TextView(this).apply {
            text = "PAIRING TOKEN"
            textSize = 18f
        }
        val pairingTokenView = TextView(this).apply {
            text = pairingToken
            textSize = 18f
            setTextIsSelectable(true)
            setPadding(0, 16, 0, 16)
        }
        val copyPairingToken = Button(this).apply {
            text = "COPY PAIRING TOKEN"
            setOnClickListener {
                val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                clipboard.setPrimaryClip(ClipData.newPlainText("LeeWay pairing token", pairingToken))
                output.text = "Pairing token copied. Return to Termux and paste at the hidden prompt."
                ReceiptStore.record(this@MainActivity, "device.pairing.copy", "PASS", "Owner copied pairing token")
            }
        }
        pairingPanel.addView(pairingTitle)
        pairingPanel.addView(pairingTokenView)
        pairingPanel.addView(copyPairingToken)

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
                "LOCAL MODEL: " + modelLabel + "\\nREMOTE RELAY: " + remoteLabel + "\\nDEVICE: " + remote.optString("deviceId")
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
                                output.text = "Downloading local model... " + pct + "%\\n" + done + " / " + total + " bytes"
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
        val speakTest = Button(this).apply {
            text = "OPEN AGENT LEE VOICE ONE"
            setOnClickListener {
                output.text = VoiceRuntime.openVoiceFabric(this@MainActivity).toString(2)
            }
        }

        val talkToLee = Button(this).apply {
            text = "TALK TO AGENT LEE"
            setOnClickListener {
                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), 4203)
                    output.text = "Microphone permission requested. Approve it, then tap TALK TO AGENT LEE again."
                } else if (!SpeechRecognizer.isRecognitionAvailable(this@MainActivity)) {
                    output.text = "Android speech recognition is not available on this device."
                } else {
                    speechRecognizer?.destroy()
                    speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this@MainActivity)
                    speechRecognizer?.setRecognitionListener(object : android.speech.RecognitionListener {
                        override fun onReadyForSpeech(params: Bundle?) { output.text = "Listening..." }
                        override fun onBeginningOfSpeech() {}
                        override fun onRmsChanged(rmsdB: Float) {}
                        override fun onBufferReceived(buffer: ByteArray?) {}
                        override fun onEndOfSpeech() { output.text = "Thinking..." }
                        override fun onError(error: Int) { output.text = "Speech recognition error: " + error }
                        override fun onPartialResults(partialResults: Bundle?) {}
                        override fun onEvent(eventType: Int, params: Bundle?) {}
                        override fun onResults(results: Bundle?) {
                            val heard = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull().orEmpty()
                            if (heard.isBlank()) { output.text = "I did not hear a complete request."; return }
                            output.text = "You: " + heard + "\\n\\nAgent Lee is thinking..."
                            Thread {
                                val result = AgentLeeConversation.respond(this@MainActivity, heard, true)
                                val response = result.optString("response")
                                runOnUiThread {
                                    output.text = "You: " + heard + "\\n\\nAgent Lee: " +
                                        (if (response.isBlank()) result.toString(2) else response) +
                                        "\\n\\nSkill: " + result.optString("focalSkill") +
                                        " • Formula: " + result.optString("formulaExecutionState")
                                }
                            }.start()
                        }
                    })
                    val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                        putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
                    }
                    speechRecognizer?.startListening(intent)
                }
            }
        }

        val floatingMic = Button(this).apply {
            text = "ENABLE FLOATING AGENT LEE MIC"
            setOnClickListener {
                FloatingMicOverlay.setEnabled(this@MainActivity, true)
                if (!FloatingMicOverlay.canDraw(this@MainActivity)) {
                    output.text = "Allow LeeWay Device Bridge to display over other apps. The Agent Lee mic will attach when you return."
                    startActivity(
                        Intent(
                            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                            Uri.parse("package:" + packageName)
                        )
                    )
                } else {
                    RemoteRelayService.start(this@MainActivity)
                    output.text = "Floating Agent Lee mic enabled."
                }
            }
        }

        val enableSecondaryWorkstation = Button(this).apply {
            text = "ENABLE SECONDARY WORKSTATION"
            setOnClickListener {
                LocalAuthority.setAgentAccess(this@MainActivity, true)
                FloatingMicOverlay.setEnabled(this@MainActivity, true)
                if (!FloatingMicOverlay.canDraw(this@MainActivity)) {
                    startActivity(
                        Intent(
                            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                            Uri.parse("package:" + packageName)
                        )
                    )
                }
                val local = try {
                    LocalBridgeServer.start(this@MainActivity)
                } catch (e: Exception) {
                    org.json.JSONObject().apply {
                        put("ok", false)
                        put("error", e.message ?: e.javaClass.simpleName)
                    }
                }
                RemoteRelayService.start(this@MainActivity)
                Handler(Looper.getMainLooper()).postDelayed({
                    val remote = RemoteRelayState.status(this@MainActivity)
                    refreshRuntimeState()
                    val result = org.json.JSONObject().apply {
                        put("mode", "LEEWAY_SECONDARY_WORKSTATION")
                        put("deviceId", remote.optString("deviceId"))
                        put("localBridge", local)
                        put("remoteRelay", remote)
                        put("pairingTokenReady", pairingToken.isNotBlank())
                        put("next", "Use AUTOMATIC OWNER BOOTSTRAP / remote qualification. Manual token copy is fallback only.")
                    }
                    output.text = result.toString(2)
                    ReceiptStore.record(
                        this@MainActivity,
                        "workstation.secondary.enable",
                        if (remote.optBoolean("enabled")) "PASS" else "BLOCKED",
                        "Owner enabled secondary workstation mode"
                    )
                }, 1000L)
            }
        }

        val remoteEnable = Button(this).apply {
            text = "ENABLE ALWAYS-ON REMOTE BRIDGE"
            setOnClickListener {
                LocalAuthority.setAgentAccess(this@MainActivity, true)
                ReceiptStore.record(
                    this@MainActivity,
                    "device.session.start",
                    "PASS",
                    "Owner enabled always-on remote bridge"
                )
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
                pairingTokenView.text = pairingToken
                pairingPanel.requestFocus()
                output.text = "Pairing token is shown above. Tap COPY PAIRING TOKEN."
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
                FloatingMicOverlay.setEnabled(this@MainActivity, false)
                RemoteRelayService.stop(this@MainActivity)
                ReceiptStore.record(this@MainActivity, "device.session.stop", "PASS", "Owner emergency stop")
                refreshRuntimeState()
                output.text = "Agent access stopped locally.\\nRemote relay: OFF\\nProtected bridge routes: BLOCKED\\nRemote commands: NOT AUTHORIZED"
            }
        }

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(42, 54, 42, 54)
            addView(TextView(this@MainActivity).apply {
                text = "LeeWay Device Bridge\\nDevice Control Center"
                textSize = 24f
            })
            addView(TextView(this@MainActivity).apply {
                text = "PHONE_LOCAL | owner controlled | GitHub Pages distributed"
                textSize = 14f
                setPadding(0, 10, 0, 18)
            })
            addView(runtimeState)
            addView(pairingPanel)
            listOf(
                discover, diagnostics, files, receipts, authorizeBluetooth, bluetooth, networkDiscovery,
                modelStatus, modelDownload, modelTest, speakTest, talkToLee, floatingMic,
                enableSecondaryWorkstation, remoteEnable, remoteStatus, remoteDisable,
                enable, startBridge, selfTest, showToken, stopBridge, stop
            ).forEach { addView(it) }
            addView(output)
        }

        setContentView(ScrollView(this).apply { addView(root) })

        when (intent?.getStringExtra("leeway_action")) {
            "SHOW_PAIRING" -> {
                pairingPanel.requestFocus()
                output.text = "Pairing mode opened by Termux. Tap COPY PAIRING TOKEN, then return to Termux."
            }
            "TERMUX_BOOTSTRAP" -> {
                val nonce = intent?.getStringExtra("leeway_nonce").orEmpty()
                val bootstrap = LocalBridgeServer.armOwnerBootstrap(this, nonce)
                if (bootstrap.optBoolean("ok")) {
                    LocalAuthority.setAgentAccess(this, true)
                    RemoteRelayService.stop(this)
                    Handler(Looper.getMainLooper()).postDelayed({
                        RemoteRelayService.start(this)
                        refreshRuntimeState()
                    }, 750L)
                    output.text =
                        "Termux owner bootstrap armed.\n" +
                        "Local bridge: STARTED\n" +
                        "Remote relay: RECONNECTING\n" +
                        "You can return to Termux. No token copy is required."
                    ReceiptStore.record(
                        this,
                        "device.owner.bootstrap",
                        "PASS",
                        "Owner launched Termux bootstrap flow"
                    )
                } else {
                    output.text = "Termux bootstrap blocked: " + bootstrap.optString("error")
                    ReceiptStore.record(
                        this,
                        "device.owner.bootstrap",
                        "BLOCKED",
                        bootstrap.optString("error")
                    )
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        if (FloatingMicOverlay.enabled(this) && FloatingMicOverlay.canDraw(this)) {
            RemoteRelayService.start(this)
        }
    }

    override fun onDestroy() {
        speechRecognizer?.destroy()
        VoiceRuntime.shutdown()
        super.onDestroy()
    }

    @Deprecated("Legacy activity result retained for minimum-compatible SAF handoff")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FileAccess.REQUEST_OPEN_TREE && resultCode == Activity.RESULT_OK) {
            val uri = FileAccess.persistDirectory(this, data)
            output.text = "Authorized file tree:\\n${uri ?: "NONE"}\\n\\nLeeWay file access remains limited to platform-granted scope."
        }
    }
}