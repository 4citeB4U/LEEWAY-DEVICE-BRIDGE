package industries.leeway.devicebridge

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.net.HttpURLConnection
import java.net.URL

/** Emulator-only authority test; secrets never leave the process or appear in logs. */
@RunWith(AndroidJUnit4::class)
class NativeProvisioningAuthorizationTest {
    private fun request(path: String, bearer: String? = null): Pair<Int, JSONObject> {
        val connection = (URL("http://127.0.0.1:5323" + path).openConnection() as HttpURLConnection)
        connection.connectTimeout = 3000
        connection.readTimeout = 3000
        connection.requestMethod = "GET"
        if (bearer != null) connection.setRequestProperty("Authorization", "Bearer " + bearer)
        return try {
            val status = connection.responseCode
            val stream = if (status < 400) connection.inputStream else connection.errorStream
            status to JSONObject(stream.bufferedReader().use { it.readText() })
        } finally {
            connection.disconnect()
        }
    }
    @Test fun nativeCredentialAndFailClosedPlan() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val previousAccess = LocalAuthority.agentAccessEnabled(context)
        val wasRunning = LocalBridgeServer.isRunning()
        try {
            LocalAuthority.setAgentAccess(context, false)
            if (!wasRunning) LocalBridgeServer.start(context)
            assertEquals(200, request("/health").first)
            assertEquals(403, request("/provisioning/plan").first)
            LocalAuthority.setAgentAccess(context, true)
            assertEquals(401, request("/provisioning/plan").first)
            val credential = BridgeSecret.ensure(context)
            val (status, body) = request("/provisioning/plan", credential)
            assertEquals(200, status)
            assertEquals(AndroidProvisioningCompatibility.CONTRACT, body.getString("contract"))
            assertEquals("DEVICE_BRIDGE_READ_ONLY_PLANNING", body.getString("authority"))
            assertEquals("DEVICE_BRIDGE_CAPTURED_AT_REQUEST", body.getString("passportOrigin"))
            assertEquals("NO_VERIFIED_GPU_RECEIPT", body.getString("gpuEvidenceOrigin"))
            assertEquals("NOT_EXECUTED", body.getString("canonicalFormulaState"))
            assertEquals("NOT_EXECUTED", body.getString("provisioningState"))
            assertEquals("CPU_SAFE_FALLBACK", body.getString("computeMode"))
            assertEquals("UNOBSERVED", body.getString("gpuState"))
            assertFalse(body.getBoolean("automaticInstallAuthorized"))
            assertFalse(body.getBoolean("gpuAutomaticallyEnabled"))
            assertTrue(body.getBoolean("ownerApprovalRequired"))
            assertTrue(body.has("installerCapability"))
            LocalAuthority.setAgentAccess(context, false)
            assertEquals(403, request("/provisioning/plan", credential).first)
        } finally {
            LocalAuthority.setAgentAccess(context, previousAccess)
            if (!wasRunning) LocalBridgeServer.stop(context)
        }
    }
}
