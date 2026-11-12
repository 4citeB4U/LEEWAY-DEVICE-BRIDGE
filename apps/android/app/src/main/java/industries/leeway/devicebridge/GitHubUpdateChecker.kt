/*
REGION: LeeWay Android GitHub update channel
TAG: LEEWAY-DEVICE-BRIDGE-ANDROID-OWNER-CONFIRMED-UPDATES
WHAT: Check the canonical public package manifest and notify the owner when a newer APK is available.
WHY: Keep the phone-side bridge current without requiring iLoader or a computer for Android installs.
BOUNDARY: Android's signed package installer remains the authority; this component never silently installs or replaces itself.
*/
package industries.leeway.devicebridge

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.net.URI
import java.util.concurrent.TimeUnit

object GitHubUpdateChecker {
    const val MANIFEST_URL = "https://4citeb4u.github.io/LEEWAY-DEVICE-BRIDGE/docs/package-manifest.json"
    private const val PREFS = "leeway_device_bridge_updates"
    private const val PENDING_UPDATE = "pending_update"
    private const val LAST_CHECK_MS = "last_check_ms"
    private const val CHECK_INTERVAL_MS = 6L * 60L * 60L * 1000L
    private const val CHANNEL_ID = "leeway_device_bridge_updates"
    private const val NOTIFICATION_ID = 4823

    private val client = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    fun check(
        context: Context,
        force: Boolean = false,
        notifyOnly: Boolean = true,
        callback: (JSONObject?) -> Unit = {}
    ) {
        val appContext = context.applicationContext
        val prefs = appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val now = System.currentTimeMillis()
        if (!force && now - prefs.getLong(LAST_CHECK_MS, 0L) < CHECK_INTERVAL_MS) {
            callback(null)
            return
        }
        prefs.edit().putLong(LAST_CHECK_MS, now).apply()

        Thread {
            var update: JSONObject? = null
            try {
                val request = Request.Builder()
                    .url(MANIFEST_URL)
                    .header("Cache-Control", "no-cache")
                    .build()
                client.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) error("MANIFEST_HTTP_${response.code}")
                    val manifest = JSONObject(response.body?.string().orEmpty())
                    val packageEntry = findAndroidPackage(manifest)
                    // Release admission is independent of build success and SHA parity.
                    // Never convert a development or security-held Pages manifest
                    // into an Android installation prompt.
                    require(packageEntry.optString("status") == "AUTHORIZED_RELEASED" &&
                        packageEntry.optString("releaseState") == "AUTHORIZED_RELEASED" &&
                        packageEntry.optBoolean("downloadEnabled", false) &&
                        packageEntry.optBoolean("publicReleaseAuthorized", false) &&
                        packageEntry.optString("channel") == "production" &&
                        packageEntry.optString("authorizedReleaseEvidenceRef").isNotBlank() &&
                        packageEntry.optString("signingCertificateSha256")
                            .matches(Regex("^[a-fA-F0-9]{64}$"))) { "ANDROID_RELEASE_NOT_AUTHORIZED" }
                    val candidateUrl = packageEntry.optString("downloadUrl")
                    require(candidateUrl.endsWith(".apk", ignoreCase = true) &&
                        !candidateUrl.contains("debug", ignoreCase = true)) {
                        "ANDROID_RELEASE_URL_NOT_QUALIFIED"
                    }
                    val remoteCode = packageEntry.getLong("versionCode")
                    val currentCode = appContext.packageManager
                        .getPackageInfo(appContext.packageName, 0).longVersionCode
                    if (remoteCode <= currentCode) {
                        prefs.edit().remove(PENDING_UPDATE).apply()
                    } else {
                        val downloadUrl = URI(MANIFEST_URL).resolve(packageEntry.getString("downloadUrl")).toString()
                        require(downloadUrl.startsWith("https://")) { "HTTPS_REQUIRED" }
                        val sha256 = packageEntry.getString("sha256").lowercase()
                        require(sha256.matches(Regex("^[a-f0-9]{64}$"))) { "INVALID_SHA256" }
                        update = JSONObject().apply {
                            put("versionName", packageEntry.optString("versionName"))
                            put("versionCode", remoteCode)
                            put("url", downloadUrl)
                            put("sha256", sha256)
                            put("sizeBytes", packageEntry.optLong("sizeBytes", -1L))
                            put("source", "GITHUB_PACKAGE_MANIFEST")
                            put("releaseEligible", true)
                        }
                        prefs.edit().putString(PENDING_UPDATE, update.toString()).apply()
                        ReceiptStore.record(
                            appContext,
                            "device.apps.update.check",
                            "UPDATE_AVAILABLE",
                            "GitHub Android package versionCode=$remoteCode"
                        )
                        if (notifyOnly) showNotification(appContext, update!!)
                    }
                }
            } catch (error: Throwable) {
                prefs.edit().remove(PENDING_UPDATE).apply()
                ReceiptStore.record(
                    appContext,
                    "device.apps.update.check",
                    "BLOCKED",
                    error.message ?: error.javaClass.simpleName
                )
            }
            callback(update)
        }.start()
    }

    fun consumePending(context: Context): JSONObject? {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val value = prefs.getString(PENDING_UPDATE, null) ?: return null
        prefs.edit().remove(PENDING_UPDATE).apply()
        return runCatching { JSONObject(value) }.getOrNull()
            ?.takeIf { it.optBoolean("releaseEligible", false) &&
                it.optString("url").endsWith(".apk", ignoreCase = true) &&
                !it.optString("url").contains("debug", ignoreCase = true) }
    }

    private fun findAndroidPackage(manifest: JSONObject): JSONObject {
        val packages = manifest.optJSONArray("packages") ?: JSONArray()
        for (index in 0 until packages.length()) {
            val entry = packages.optJSONObject(index) ?: continue
            if (entry.optString("platform") == "android") return entry
        }
        error("ANDROID_PACKAGE_NOT_FOUND")
    }

    private fun showNotification(context: Context, update: JSONObject) {
        val manager = context.getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(
                NotificationChannel(
                    CHANNEL_ID,
                    "LeeWay Device Bridge updates",
                    NotificationManager.IMPORTANCE_DEFAULT
                )
            )
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) !=
            android.content.pm.PackageManager.PERMISSION_GRANTED
        ) return

        val intent = Intent(context, MainActivity::class.java).apply {
            putExtra("leeway_action", "SHOW_UPDATE")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            NOTIFICATION_ID,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val version = update.optString("versionName", "new version")
        manager.notify(
            NOTIFICATION_ID,
            NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.stat_sys_download_done)
                .setContentTitle("LeeWay Device Bridge update available")
                .setContentText("GitHub has $version ready. Tap to review and update.")
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .build()
        )
    }
}
