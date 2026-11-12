package industries.leeway.devicebridge

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var output: TextView
    private lateinit var meshStatusView: TextView
    private var updateDialogShowing = false

    private fun makeCard(bgColor: Int = Color.parseColor("#161B22"), cornerRadius: Float = 16f): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val shape = GradientDrawable().apply {
                setColor(bgColor)
                setCornerRadius(cornerRadius)
                setStroke(2, Color.parseColor("#30363D"))
            }
            background = shape
            setPadding(32, 28, 32, 28)
        }
    }

    private fun makeNodeRow(icon: String, name: String, id: String, status: String, statusColor: Int): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, 12, 0, 12)

            val iconView = TextView(context).apply {
                text = icon
                textSize = 20f
                setPadding(0, 0, 20, 0)
            }
            val infoLayout = LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f)
                val title = TextView(context).apply {
                    text = name
                    textSize = 14f
                    setTextColor(Color.WHITE)
                    typeface = Typeface.DEFAULT_BOLD
                }
                val subtitle = TextView(context).apply {
                    text = id
                    textSize = 11f
                    setTextColor(Color.parseColor("#8B949E"))
                }
                addView(title)
                addView(subtitle)
            }
            val statusBadge = TextView(context).apply {
                text = status
                textSize = 11f
                setTextColor(statusColor)
                typeface = Typeface.DEFAULT_BOLD
                val badgeShape = GradientDrawable().apply {
                    setColor(Color.parseColor("#21262D"))
                    setCornerRadius(10f)
                    setStroke(1, statusColor)
                }
                background = badgeShape
                setPadding(16, 6, 16, 6)
            }
            addView(iconView)
            addView(infoLayout)
            addView(statusBadge)
        }
    }

    private fun makeStyledButton(label: String, primary: Boolean = false): Button {
        return Button(this).apply {
            text = label
            textSize = 12f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(if (primary) Color.BLACK else Color.parseColor("#C9D1D9"))
            val shape = GradientDrawable().apply {
                setColor(if (primary) Color.parseColor("#58A6FF") else Color.parseColor("#21262D"))
                setCornerRadius(12f)
                if (!primary) setStroke(2, Color.parseColor("#30363D"))
            }
            background = shape
            val params = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                setMargins(0, 10, 0, 10)
            }
            layoutParams = params
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val passport = DevicePassport.capture(this)
        BootstrapStore.savePassport(this, passport)
        ReceiptStore.record(this, "device.info", "PASS", "Native passport captured")

        val root = ScrollView(this).apply {
            setBackgroundColor(Color.parseColor("#0D1117"))
            isFillViewport = true
        }

        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 48, 32, 48)
        }

        // Header Title
        val headerCard = makeCard(Color.parseColor("#161B22")).apply {
            val title = TextView(context).apply {
                text = "LEEWAY DEVICE BRIDGE"
                textSize = 20f
                setTextColor(Color.parseColor("#58A6FF"))
                typeface = Typeface.DEFAULT_BOLD
            }
            val subtitle = TextView(context).apply {
                text = "Unified Sovereign Mesh • 4 Nodes Active"
                textSize = 12f
                setTextColor(Color.parseColor("#8B949E"))
                setPadding(0, 4, 0, 0)
            }
            addView(title)
            addView(subtitle)
        }
        val headerParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { setMargins(0, 0, 0, 24) }
        headerCard.layoutParams = headerParams
        container.addView(headerCard)

        // Mesh Status Card
        val meshCard = makeCard(Color.parseColor("#161B22")).apply {
            val sectionTitle = TextView(context).apply {
                text = "MESH ROSTER & ACTIVE RELAY ROOMS"
                textSize = 12f
                setTextColor(Color.parseColor("#8B949E"))
                typeface = Typeface.DEFAULT_BOLD
                setPadding(0, 0, 0, 12)
            }
            addView(sectionTitle)

            addView(makeNodeRow("🖥️", "PC Primary Workstation", "pc-primary (Lenovo 83NX)", "ONLINE", Color.parseColor("#3FB950")))
            addView(makeNodeRow("📱", "Samsung Galaxy Z Fold6", "phone-fold6 (This Device)", "CONNECTED", Color.parseColor("#58A6FF")))
            addView(makeNodeRow("💻", "HP Secondary Workstation", "pc-hp-secondary (Subnet 192.168.1.101)", "ONLINE", Color.parseColor("#3FB950")))
            addView(makeNodeRow("🍎", "Apple iPhone 11", "phone-apple-iphone", "SUPERVISOR", Color.parseColor("#D29922")))
        }
        val meshParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { setMargins(0, 0, 0, 24) }
        meshCard.layoutParams = meshParams
        container.addView(meshCard)

        // Device Runtime Card
        val runtimeCard = makeCard(Color.parseColor("#161B22")).apply {
            val runtimeTitle = TextView(context).apply {
                text = "THIS NODE TELEMETRY"
                textSize = 12f
                setTextColor(Color.parseColor("#8B949E"))
                typeface = Typeface.DEFAULT_BOLD
                setPadding(0, 0, 0, 8)
            }
            meshStatusView = TextView(context).apply {
                textSize = 13f
                setTextColor(Color.parseColor("#C9D1D9"))
                typeface = Typeface.MONOSPACE
            }
            addView(runtimeTitle)
            addView(meshStatusView)
        }
        val runtimeParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { setMargins(0, 0, 0, 24) }
        runtimeCard.layoutParams = runtimeParams
        container.addView(runtimeCard)

        // Pairing Token Card
        val pairingToken = BridgeSecret.ensure(this)
        val pairingCard = makeCard(Color.parseColor("#161B22")).apply {
            val pTitle = TextView(context).apply {
                text = "OWNER PAIRING SECRET"
                textSize = 12f
                setTextColor(Color.parseColor("#8B949E"))
                typeface = Typeface.DEFAULT_BOLD
            }
            val tokenMask = TextView(context).apply {
                text = "••••••••••••••••"
                textSize = 16f
                setTextColor(Color.parseColor("#C9D1D9"))
                typeface = Typeface.MONOSPACE
                setPadding(0, 8, 0, 12)
            }
            val copyBtn = makeStyledButton("COPY PAIRING TOKEN", primary = true).apply {
                setOnClickListener {
                    val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                    clipboard.setPrimaryClip(ClipData.newPlainText("LeeWay pairing token", pairingToken))
                    output.text = "Pairing token copied to clipboard.\nAdmitted under owner sovereign authority."
                    ReceiptStore.record(this@MainActivity, "device.pairing.copy", "PASS", "Owner copied pairing token")
                }
            }
            addView(pTitle)
            addView(tokenMask)
            addView(copyBtn)
        }
        val pairingParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { setMargins(0, 0, 0, 24) }
        pairingCard.layoutParams = pairingParams
        container.addView(pairingCard)

        // Action Buttons Card
        val actionsCard = makeCard(Color.parseColor("#161B22")).apply {
            val aTitle = TextView(context).apply {
                text = "SOVEREIGN DEVICE CONTROLS"
                textSize = 12f
                setTextColor(Color.parseColor("#8B949E"))
                typeface = Typeface.DEFAULT_BOLD
                setPadding(0, 0, 0, 8)
            }
            addView(aTitle)

            val refreshBtn = makeStyledButton("REFRESH MESH STATUS").apply {
                setOnClickListener {
                    refreshRuntimeState()
                    val fresh = DevicePassport.capture(this@MainActivity)
                    BootstrapStore.savePassport(this@MainActivity, fresh)
                    ReceiptStore.record(this@MainActivity, "device.info", "PASS", "Passport refreshed")
                    output.text = "Device Passport & Mesh Telemetry refreshed successfully."
                }
            }
            val diagBtn = makeStyledButton("RUN LOCAL DIAGNOSTICS").apply {
                setOnClickListener {
                    val snapshot = Diagnostics.snapshot(this@MainActivity)
                    ReceiptStore.record(this@MainActivity, "device.diagnostics", "PASS", "Local diagnostic snapshot")
                    output.text = snapshot.toString(2)
                }
            }
            val fileBtn = makeStyledButton("AUTHORIZE SCOPED STORAGE FOLDER").apply {
                setOnClickListener { FileAccess.requestDirectory(this@MainActivity) }
            }

            addView(refreshBtn)
            addView(diagBtn)
            addView(fileBtn)
        }
        val actionsParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { setMargins(0, 0, 0, 24) }
        actionsCard.layoutParams = actionsParams
        container.addView(actionsCard)

        // Output / Evidence Console
        val consoleCard = makeCard(Color.parseColor("#090D13")).apply {
            val cTitle = TextView(context).apply {
                text = "EVIDENCE CONSOLE"
                textSize = 11f
                setTextColor(Color.parseColor("#8B949E"))
                typeface = Typeface.DEFAULT_BOLD
                setPadding(0, 0, 0, 6)
            }
            output = TextView(context).apply {
                text = "LeeWay Unified Mesh Client v${BuildConfig.VERSION_NAME}\nFour-device mesh initialized.\nSovereign relay ready on port 8008."
                textSize = 12f
                setTextColor(Color.parseColor("#388BFD"))
                typeface = Typeface.MONOSPACE
                setTextIsSelectable(true)
            }
            addView(cTitle)
            addView(output)
        }
        container.addView(consoleCard)

        root.addView(container)
        setContentView(root)
        refreshRuntimeState()
    }

    private fun refreshRuntimeState() {
        if (!::meshStatusView.isInitialized) return
        val model = ModelRuntime.status(this)
        val remote = RemoteRelayState.status(this)
        val modelLabel = if (model.optBoolean("verified")) "VERIFIED" else "STANDBY"
        val remoteLabel = if (remote.optBoolean("connected")) "CONNECTED" else "CONNECTING"
        val devId = remote.optString("deviceId", "phone-fold6")

        meshStatusView.text =
            "DEVICE ID:    $devId\n" +
            "CANONICAL:    phone-fold6\n" +
            "VERSION:      ${BuildConfig.VERSION_NAME} (code ${BuildConfig.VERSION_CODE})\n" +
            "RELAY STATE:  $remoteLabel\n" +
            "LOCAL MODEL:  $modelLabel\n" +
            "MESH TRANSPORT: wss://agent-lee.tailb186e7.ts.net/api/device-relay"
    }

    override fun onResume() {
        super.onResume()
        if (::output.isInitialized) {
            GitHubUpdateChecker.consumePending(this)?.let { showUpdatePrompt(it) }
        }
    }

    private fun showUpdatePrompt(info: org.json.JSONObject) {
        if (!::output.isInitialized || updateDialogShowing) return
        updateDialogShowing = true
        val version = info.optString("versionName", "new version")
        val sizeBytes = info.optLong("sizeBytes", -1L)
        val sizeLabel = if (sizeBytes > 0) " (${sizeBytes / 1024 / 1024} MB)" else ""
        android.app.AlertDialog.Builder(this)
            .setTitle("LeeWay Device Bridge update available")
            .setMessage("GitHub has version $version$sizeLabel. Download and open Android's owner-confirmed installer?")
            .setNegativeButton("Later") { _, _ ->
                updateDialogShowing = false
                ReceiptStore.record(this, "device.apps.update", "DEFERRED", "Owner deferred GitHub Android update")
            }
            .setPositiveButton("Update") { _, _ ->
                updateDialogShowing = false
                output.text = "Downloading and verifying the GitHub APK..."
                Thread {
                    val result = runCatching {
                        PackageInstallBroker.installFromUrl(
                            this,
                            info.getString("url"),
                            info.getString("sha256")
                        )
                    }.getOrElse { error ->
                        org.json.JSONObject()
                            .put("ok", false)
                            .put("error", error.message ?: error.javaClass.simpleName)
                    }
                    runOnUiThread {
                        output.text = result.toString(2)
                    }
                }.start()
            }
            .setOnCancelListener { updateDialogShowing = false }
            .show()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 4205) {
            val granted = grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }
            output.text = if (granted) {
                ReceiptStore.record(this, "device.media.authorize", "PASS", "Owner granted Android media read permissions")
                "Media inspection authorized. Destructive media actions still require separate owner confirmation."
            } else {
                ReceiptStore.record(this, "device.media.authorize", "BLOCKED", "Owner did not grant Android media read permissions")
                "Media inspection permission was not granted."
            }
        }
        if (requestCode == 4204) {
            if (WorkstationKeeper.hasPermission(this)) {
                LocalAuthority.setAgentAccess(this, true)
                val result = WorkstationKeeper.ensure(this)
                RemoteRelayService.start(this)
                output.text = result.toString(2)
                ReceiptStore.record(this, "workstation.background.permission", "PASS", "Owner authorized Termux background keeper")
            } else {
                output.text = "Background workstation permission was not granted. Desktop Commander remains manual."
                ReceiptStore.record(this, "workstation.background.permission", "BLOCKED", "Termux RUN_COMMAND permission not granted")
            }
        }
    }

    override fun onDestroy() {
        VoiceRuntime.shutdown()
        super.onDestroy()
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
