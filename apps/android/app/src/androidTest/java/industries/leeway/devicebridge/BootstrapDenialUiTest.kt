package industries.leeway.devicebridge

import android.content.Intent
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.Until
import androidx.test.uiautomator.UiDevice
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.net.Socket
import java.util.UUID

/**
 * Emulator-only UI regression. This is an exported-activity-style invocation,
 * not proof of authenticated Termux identity or a separate hostile UID.
 */
@RunWith(AndroidJUnit4::class)
class BootstrapDenialUiTest {
    @Test fun deniedBootstrapDoesNotEnableAccessOrIssueCredential() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        val device = UiDevice.getInstance(instrumentation)
        val previousAccess = LocalAuthority.agentAccessEnabled(context)
        val originallyRunning = LocalBridgeServer.isRunning()
        val nonce = UUID.randomUUID().toString().replace("-", "")
        try {
            LocalAuthority.setAgentAccess(context, false)
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                putExtra("leeway_action", "TERMUX_BOOTSTRAP")
                putExtra("leeway_nonce", nonce)
            }
            context.startActivity(intent)
            val deny = device.wait(Until.findObject(By.text("DENY")), 1200)
            assertNull("Caller without an authenticated identity must not reach approval", deny)
            assertFalse("Access must be disabled while waiting for consent", LocalAuthority.agentAccessEnabled(context))
            // No consent control must be available to this unauthenticated caller.
            // Access remains disabled without authorization.
            assertFalse("Denial must leave agent access disabled", LocalAuthority.agentAccessEnabled(context))
            if (!LocalBridgeServer.isRunning()) LocalBridgeServer.start(context)
            Socket("127.0.0.1", LocalBridgeServer.PORT).use { socket ->
                socket.soTimeout = 3000
                val req = "GET /owner-bootstrap?nonce=" + nonce +
                    " HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n"
                socket.getOutputStream().write(req.toByteArray(Charsets.UTF_8))
                socket.getOutputStream().flush()
                val response = socket.getInputStream().bufferedReader().readText()
                assertTrue("Denied bootstrap must return 401", response.startsWith("HTTP/1.1 401 "))
                assertFalse("Denied bootstrap must never expose pairing credential", response.contains("pairingToken"))
            }
        } finally {
            LocalAuthority.setAgentAccess(context, previousAccess)
            if (!originallyRunning && LocalBridgeServer.isRunning()) LocalBridgeServer.stop(context)
            device.pressHome()
        }
    }
}
