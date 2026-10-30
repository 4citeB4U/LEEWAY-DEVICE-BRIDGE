package industries.leeway.devicebridge

import android.Manifest
import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap

object BluetoothProvider {
    const val CAPABILITY = "device.bluetooth.list-bonded"
    const val SCAN_START_CAPABILITY = "device.bluetooth.scan.start"
    const val SCAN_RESULTS_CAPABILITY = "device.bluetooth.scan.results"
    const val SCAN_STOP_CAPABILITY = "device.bluetooth.scan.stop"

    private val nearby = ConcurrentHashMap<String, JSONObject>()
    @Volatile private var scanning = false
    @Volatile private var scanStartedElapsedMs = 0L
    @Volatile private var scanDeadlineElapsedMs = 0L
    private var activeCallback: ScanCallback? = null

    fun requiredPermissions(): Array<String> =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            arrayOf(
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_CONNECT
            )
        } else {
            emptyArray()
        }

    fun hasRequiredPermissions(context: Context): Boolean =
        requiredPermissions().all {
            ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED
        }

    fun snapshot(context: Context): JSONObject {
        val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        val adapter = manager.adapter
        val supported = adapter != null
        val authorized = hasRequiredPermissions(context)
        val enabled = if (supported && authorized) adapter.isEnabled else false
        val devices = JSONArray()

        if (supported && authorized) {
            adapter.bondedDevices
                .sortedBy { it.name ?: it.address }
                .forEach { device ->
                    devices.put(JSONObject().apply {
                        put("name", device.name ?: "UNKNOWN")
                        put("address", device.address)
                        put("bondState", device.bondState)
                        put("type", device.type)
                    })
                }
        }

        return JSONObject().apply {
            put("providerId", "bluetooth")
            put("capability", CAPABILITY)
            put("supported", supported)
            put("available", supported && enabled)
            put("authorized", authorized)
            put("active", enabled)
            put("healthy", supported && enabled)
            put("verified", supported && authorized)
            put("adapterName", if (supported && authorized) adapter.name ?: "UNKNOWN" else "REDACTED_UNTIL_AUTHORIZED")
            put("bondedDeviceCount", devices.length())
            put("bondedDevices", devices)
            put("authority", "PHONE_LOCAL_ANDROID_BLUETOOTH")
        }
    }

    fun startNearbyScan(context: Context, requestedDurationMs: Long = 5_000L): JSONObject {
        val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        val adapter = manager.adapter ?: return statusError("BLUETOOTH_UNSUPPORTED")
        if (!hasRequiredPermissions(context)) return statusError("BLUETOOTH_PERMISSION_REQUIRED")
        if (!adapter.isEnabled) return statusError("BLUETOOTH_DISABLED")
        val scanner = adapter.bluetoothLeScanner ?: return statusError("BLE_SCANNER_UNAVAILABLE")

        val durationMs = requestedDurationMs.coerceIn(1_000L, 15_000L)
        stopNearbyScan(context)
        nearby.clear()

        val callback = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                recordScanResult(result)
            }

            override fun onBatchScanResults(results: MutableList<ScanResult>) {
                results.forEach(::recordScanResult)
            }

            override fun onScanFailed(errorCode: Int) {
                scanning = false
                nearby["__scan_error__"] = JSONObject().apply {
                    put("state", "FAILED")
                    put("errorCode", errorCode)
                    put("observedElapsedMs", SystemClock.elapsedRealtime())
                }
            }
        }

        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build()

        return try {
            scanner.startScan(null, settings, callback)
            activeCallback = callback
            scanning = true
            scanStartedElapsedMs = SystemClock.elapsedRealtime()
            scanDeadlineElapsedMs = scanStartedElapsedMs + durationMs
            Handler(Looper.getMainLooper()).postDelayed({
                runCatching { stopNearbyScan(context) }
            }, durationMs)

            JSONObject().apply {
                put("ok", true)
                put("providerId", "bluetooth")
                put("capability", SCAN_START_CAPABILITY)
                put("scanState", "ACTIVE")
                put("durationMs", durationMs)
                put("discoveryOnly", true)
                put("actuationAvailable", false)
                put("evidenceState", "OBSERVED")
                put("verified", false)
                put("authority", "PHONE_LOCAL_ANDROID_BLUETOOTH")
            }
        } catch (e: Exception) {
            scanning = false
            activeCallback = null
            statusError(e.message ?: e.javaClass.simpleName)
        }
    }

    fun nearbyResults(): JSONObject {
        val results = JSONArray()
        nearby.entries
            .filter { !it.key.startsWith("__") }
            .sortedByDescending { it.value.optInt("rssi", Int.MIN_VALUE) }
            .forEach { results.put(it.value) }

        return JSONObject().apply {
            put("ok", true)
            put("providerId", "bluetooth")
            put("capability", SCAN_RESULTS_CAPABILITY)
            put("scanState", if (scanning) "ACTIVE" else "IDLE")
            put("scanStartedElapsedMs", scanStartedElapsedMs)
            put("scanDeadlineElapsedMs", scanDeadlineElapsedMs)
            put("observationCount", results.length())
            put("observations", results)
            put("discoveryOnly", true)
            put("actuationAvailable", false)
            put("evidenceState", "OBSERVED")
            put("verified", false)
            if (nearby.containsKey("__scan_error__")) put("scanError", nearby["__scan_error__"])
            put("authority", "PHONE_LOCAL_ANDROID_BLUETOOTH")
        }
    }

    fun stopNearbyScan(context: Context): JSONObject {
        val callback = activeCallback
        if (callback != null && hasRequiredPermissions(context)) {
            runCatching {
                val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
                manager.adapter?.bluetoothLeScanner?.stopScan(callback)
            }
        }
        activeCallback = null
        scanning = false

        return JSONObject().apply {
            put("ok", true)
            put("providerId", "bluetooth")
            put("capability", SCAN_STOP_CAPABILITY)
            put("scanState", "IDLE")
            put("observationCount", nearby.entries.count { !it.key.startsWith("__") })
            put("evidenceState", "OBSERVED")
            put("verified", false)
            put("authority", "PHONE_LOCAL_ANDROID_BLUETOOTH")
        }
    }

    private fun recordScanResult(result: ScanResult) {
        val device = result.device
        val address = device.address ?: return
        nearby[address] = JSONObject().apply {
            put("address", address)
            put("name", runCatching { device.name }.getOrNull() ?: result.scanRecord?.deviceName ?: "UNKNOWN")
            put("rssi", result.rssi)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                put("connectable", result.isConnectable)
                put("txPower", result.txPower)
            }
            put("observedElapsedMs", SystemClock.elapsedRealtime())
            put("state", "OBSERVED")
        }
    }

    private fun statusError(error: String): JSONObject = JSONObject().apply {
        put("ok", false)
        put("providerId", "bluetooth")
        put("error", error)
        put("evidenceState", "UNVERIFIED")
        put("verified", false)
        put("authority", "PHONE_LOCAL_ANDROID_BLUETOOTH")
    }
}
