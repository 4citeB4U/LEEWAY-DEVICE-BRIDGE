package industries.leeway.devicebridge

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.net.Socket

/** Emulator-only authority test; secrets never leave the process or appear in logs. */
@RunWith(AndroidJUnit4::class)
class NativeProvisioningAuthorizationTest {
    private fun request(path: String, bearer: String? = null): Pair<Int, JSONObject> {
        Socket("127.0.0.1", LocalBridgeServer.PORT).use { socket ->
            socket.soTimeout = 3000
            val request = buildString {
                append("GET ").append(path).append(" HTTP/1.1\r\n")
                append("Host: 127.0.0.1\r\n")
                if (bearer != null) append("Authorization: Bearer ").append(bearer).append("\r\n")
                append("Connection: close\r\n\r\n")
            }
            socket.getOutputStream().write(request.toByteArray(Charsets.UTF_8))
            socket.getOutputStream().flush()
            val response = socket.getInputStream().bufferedReader().readText()
            val status = response.substringBefore("\r\n").split(" ")[1].toInt()
            return status to JSONObject(response.substringAfter("\r\n\r\n"))
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
    @Test fun nativeServerStopClosesLoopback() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val originalAccess = LocalAuthority.agentAccessEnabled(context)
        val originallyRunning = LocalBridgeServer.isRunning()
        try {
            if (!originallyRunning) LocalBridgeServer.start(context)
            assertTrue(LocalBridgeServer.isRunning())
            assertEquals(200, request("/health").first)
            LocalBridgeServer.stop(context)
            assertFalse(LocalBridgeServer.isRunning())
            try {
                request("/health")
                fail("Loopback health must not remain reachable after server stop")
            } catch (_: java.net.ConnectException) {
                // Expected: closed loopback socket refuses new connections.
            }
        } finally {
            LocalAuthority.setAgentAccess(context, originalAccess)
            if (originallyRunning && !LocalBridgeServer.isRunning()) LocalBridgeServer.start(context)
            if (!originallyRunning && LocalBridgeServer.isRunning()) LocalBridgeServer.stop(context)
        }
    }
    @Test fun bootstrapNonceMismatchAndReplayNeverReturnToken() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val originalAccess = LocalAuthority.agentAccessEnabled(context)
        val originallyRunning = LocalBridgeServer.isRunning()
        val nonce = java.util.UUID.randomUUID().toString().replace("-", "")
        val other = java.util.UUID.randomUUID().toString().replace("-", "")
        try {
            if (!originallyRunning) LocalBridgeServer.start(context)
            val before = request("/owner-bootstrap?nonce=" + nonce)
            assertEquals(401, before.first)
            assertFalse(before.second.has("pairingToken"))
            val arm = LocalBridgeServer.armOwnerBootstrap(context, nonce)
            assertTrue(arm.getBoolean("ok"))
            val mismatch = request("/owner-bootstrap?nonce=" + other)
            assertEquals(401, mismatch.first)
            assertFalse(mismatch.second.has("pairingToken"))
            val authorized = request("/owner-bootstrap?nonce=" + nonce)
            assertEquals(200, authorized.first)
            assertEquals("OWNER_LOCAL_LOOPBACK_BOOTSTRAP", authorized.second.getString("authority"))
            assertTrue(authorized.second.has("pairingToken"))
            val replay = request("/owner-bootstrap?nonce=" + nonce)
            assertEquals(401, replay.first)
            assertFalse(replay.second.has("pairingToken"))
        } finally {
            LocalAuthority.setAgentAccess(context, originalAccess)
            if (!originallyRunning) LocalBridgeServer.stop(context)
        }
    }

    @Test fun expiredBootstrapNonceDoesNotReturnPairingCredential() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val originalAccess = LocalAuthority.agentAccessEnabled(context)
        val originallyRunning = LocalBridgeServer.isRunning()
        val nonce = java.util.UUID.randomUUID().toString().replace("-", "")
        val expiry = LocalBridgeServer::class.java.getDeclaredField("ownerBootstrapExpiresAt")
        expiry.isAccessible = true
        try {
            if (!originallyRunning) LocalBridgeServer.start(context)
            assertTrue(LocalBridgeServer.armOwnerBootstrap(context, nonce).getBoolean("ok"))
            // Test-only clock boundary injection: no 120-second delay or production change.
            expiry.setLong(LocalBridgeServer, System.currentTimeMillis() - 1L)
            val expired = request("/owner-bootstrap?nonce=" + nonce)
            assertEquals(401, expired.first)
            assertEquals("BOOTSTRAP_NOT_ARMED_OR_EXPIRED", expired.second.getString("error"))
            assertFalse(expired.second.has("pairingToken"))
            val repeated = request("/owner-bootstrap?nonce=" + nonce)
            assertEquals(401, repeated.first)
            assertFalse(repeated.second.has("pairingToken"))
        } finally {
            expiry.setLong(LocalBridgeServer, 0L)
            LocalAuthority.setAgentAccess(context, originalAccess)
            if (!originallyRunning) LocalBridgeServer.stop(context)
        }
    }

}

