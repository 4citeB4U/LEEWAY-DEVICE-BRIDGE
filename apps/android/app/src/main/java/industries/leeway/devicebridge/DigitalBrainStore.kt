package industries.leeway.devicebridge

import android.app.ActivityManager
import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.os.BatteryManager
import android.os.Build
import android.os.Environment
import android.os.PowerManager
import android.os.StatFs
import android.os.SystemClock
import android.util.DisplayMetrics
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class DigitalBrainStore(context: Context) : SQLiteOpenHelper(context, "digital_brain.db", null, 1) {

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS hardware_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                cpu_arch TEXT,
                ram_total_bytes INTEGER,
                ram_avail_bytes INTEGER,
                storage_total_bytes INTEGER,
                storage_avail_bytes INTEGER,
                raw_json TEXT NOT NULL
            )
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS diagnostic_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                event_type TEXT NOT NULL,
                level TEXT NOT NULL,
                component TEXT NOT NULL,
                details_json TEXT
            )
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS file_universe (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scope_id TEXT NOT NULL,
                relative_path TEXT NOT NULL,
                sha256 TEXT NOT NULL,
                size_bytes INTEGER NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(scope_id, relative_path)
            )
            """.trimIndent()
        )
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // Migration logic for future schema increments
    }

    fun recordEvent(eventType: String, level: String, component: String, details: JSONObject? = null) {
        try {
            val db = writableDatabase
            val values = ContentValues().apply {
                put("timestamp", isoTimestamp())
                put("event_type", eventType)
                put("level", level)
                put("component", component)
                put("details_json", details?.toString() ?: "{}")
            }
            db.insert("diagnostic_events", null, values)
        } catch (_: Exception) {
        }
    }

    fun getRecentEvents(limit: Int = 20): JSONArray {
        val result = JSONArray()
        try {
            val db = readableDatabase
            db.rawQuery(
                "SELECT timestamp, event_type, level, component, details_json FROM diagnostic_events ORDER BY id DESC LIMIT ?",
                arrayOf(limit.toString())
            ).use { cursor ->
                while (cursor.moveToNext()) {
                    result.put(JSONObject().apply {
                        put("timestamp", cursor.getString(0))
                        put("eventType", cursor.getString(1))
                        put("level", cursor.getString(2))
                        put("component", cursor.getString(3))
                        put("details", JSONObject(cursor.getString(4)))
                    })
                }
            }
        } catch (_: Exception) {
        }
        return result
    }

    companion object {
        @Volatile
        private var instance: DigitalBrainStore? = null

        fun getInstance(context: Context): DigitalBrainStore =
            instance ?: synchronized(this) {
                instance ?: DigitalBrainStore(context.applicationContext).also { instance = it }
            }

        private fun isoTimestamp(): String {
            val df = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            df.timeZone = TimeZone.getTimeZone("UTC")
            return df.format(Date())
        }

        fun getDeviceBrainSnapshot(context: Context): JSONObject {
            val activity = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val memory = ActivityManager.MemoryInfo().also(activity::getMemoryInfo)
            val stat = StatFs(Environment.getDataDirectory().absolutePath)
            val metrics: DisplayMetrics = context.resources.displayMetrics
            val identity = DeviceIdentity.ensure(context)
            val deviceId = identity.optString("deviceId", "phone-fold6")
            val pubKeySha = identity.optString("publicKeyFingerprintSha256", "")

            // Calculate thermal status
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            val thermalState = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && powerManager != null) {
                when (powerManager.currentThermalStatus) {
                    PowerManager.THERMAL_STATUS_NONE -> "THERMAL_STATUS_NONE"
                    PowerManager.THERMAL_STATUS_LIGHT -> "THERMAL_STATUS_LIGHT"
                    PowerManager.THERMAL_STATUS_MODERATE -> "THERMAL_STATUS_MODERATE"
                    PowerManager.THERMAL_STATUS_SEVERE -> "THERMAL_STATUS_SEVERE"
                    PowerManager.THERMAL_STATUS_CRITICAL -> "THERMAL_STATUS_CRITICAL"
                    PowerManager.THERMAL_STATUS_EMERGENCY -> "THERMAL_STATUS_EMERGENCY"
                    PowerManager.THERMAL_STATUS_SHUTDOWN -> "THERMAL_STATUS_SHUTDOWN"
                    else -> "THERMAL_STATUS_UNKNOWN"
                }
            } else {
                "THERMAL_STATUS_NOMINAL"
            }

            val battery = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
            val batteryPct = battery.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)

            val healthStatus = if (memory.lowMemory) {
                "DEGRADED"
            } else if (batteryPct in 1..10) {
                "WARNING"
            } else {
                "HEALTHY"
            }

            val memoryPressure = if (memory.lowMemory) "LOW_MEMORY" else "NORMAL"
            val uptimeSec = SystemClock.elapsedRealtime() / 1000.0

            val hardware = JSONObject().apply {
                put("cpu", JSONObject().apply {
                    put("architecture", Build.SUPPORTED_ABIS.firstOrNull() ?: "arm64-v8a")
                    put("cores", Runtime.getRuntime().availableProcessors())
                    put("model", Build.HARDWARE)
                })
                put("accelerators", JSONArray().apply {
                    put(JSONObject().apply {
                        put("type", "GPU")
                        put("vendor", "Qualcomm")
                        put("model", "Adreno 750 (Snapdragon 8 Gen 3 pineapple)")
                        put("driverVersion", "Vulkan 1.3")
                        put("lanes", 8)
                        put("apiLevel", "Vulkan 1.3 / OpenGL ES 3.2")
                    })
                    put(JSONObject().apply {
                        put("type", "NPU")
                        put("vendor", "Qualcomm")
                        put("model", "Hexagon NPU")
                        put("driverVersion", "Snapdragon Neural Processing SDK")
                        put("lanes", 1)
                        put("apiLevel", "Hexagon DSP")
                    })
                })
                put("memory", JSONObject().apply {
                    put("totalBytes", memory.totalMem)
                    put("availableBytes", memory.availMem)
                    put("vramBytes", 12L * 1024L * 1024L * 1024L) // 12GB Unified LPDDR5X
                })
                put("storage", JSONObject().apply {
                    put("totalBytes", stat.totalBytes)
                    put("availableBytes", stat.availableBytes)
                    put("storageType", "UFS 4.0")
                })
                put("peripherals", JSONObject().apply {
                    put("camerasCount", 3)
                    put("microphonesCount", 2)
                    put("displays", JSONArray().apply {
                        put(JSONObject().apply {
                            put("widthPixels", metrics.widthPixels)
                            put("heightPixels", metrics.heightPixels)
                            put("densityDpi", metrics.densityDpi)
                        })
                    })
                })
            }

            val environment = JSONObject().apply {
                put("os", JSONObject().apply {
                    put("platform", "android")
                    put("version", Build.VERSION.RELEASE)
                    put("build", Build.DISPLAY)
                    put("sdkInt", Build.VERSION.SDK_INT)
                })
                put("firmware", JSONObject().apply {
                    put("manufacturer", Build.MANUFACTURER)
                    put("model", Build.MODEL)
                    put("board", Build.BOARD)
                    put("biosSerialNumber", Build.UNKNOWN)
                    put("computerUuid", deviceId)
                })
                put("security", JSONObject().apply {
                    put("authority", "ANDROID_KEYSTORE")
                    put("keyAlias", "leeway_device_identity")
                    put("algorithm", "EC_SECP256R1")
                    put("publicKeyFingerprintSha256", pubKeySha)
                })
            }

            val diagnostics = JSONObject().apply {
                put("health", healthStatus)
                put("batteryPercent", batteryPct)
                put("thermalState", thermalState)
                put("uptimeSeconds", uptimeSec)
                put("memoryPressure", memoryPressure)
            }

            return JSONObject().apply {
                put("schemaVersion", "1.0.0")
                put("authority", "DEVICE_OWNED_DIGITAL_BRAIN")
                put("deviceId", deviceId)
                put("deviceOwned", true)
                put("timestamp", isoTimestamp())
                put("hardware", hardware)
                put("environment", environment)
                put("diagnostics", diagnostics)
            }
        }

        fun getDiagnosticsSnapshot(context: Context): JSONObject {
            val store = getInstance(context)
            val base = Diagnostics.snapshot(context)
            base.put("authority", "DEVICE_OWNED_DIAGNOSTICS")
            base.put("deviceOwned", true)
            base.put("timestamp", isoTimestamp())
            base.put("recentEvents", store.getRecentEvents(10))
            return base
        }
    }
}
