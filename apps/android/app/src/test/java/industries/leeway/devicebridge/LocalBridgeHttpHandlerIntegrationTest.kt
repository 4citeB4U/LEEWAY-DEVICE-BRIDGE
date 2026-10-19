package industries.leeway.devicebridge

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import kotlin.concurrent.thread

class LocalBridgeHttpHandlerIntegrationTest {
    private fun call(
        target: String = "/provisioning/plan",
        method: String = "GET",
        enabled: Boolean = true,
        token: String? = "test-token",
        expectedToken: String = "test-token",
    ): Pair<Int, JSONObject> {
        ServerSocket(0, 1, InetAddress.getByName("127.0.0.1")).use { server ->
            server.soTimeout = 3000
            val worker = thread {
                val socket = server.accept()
                LocalBridgeHttpHandler.serve(socket, LocalBridgeHttpHandler.Dependencies(
                    health = { JSONObject().put("ok", true) },
                    ownerBootstrap = { JSONObject().put("ok", false) },
                    accessEnabled = { enabled },
                    bearerMatches = { it == expectedToken },
                    protectedRead = { path ->
                        if (path == "/provisioning/plan") JSONObject()
                            .put("computeMode", "CPU_SAFE_FALLBACK")
                            .put("provisioningState", "NOT_EXECUTED")
                        else null
                    },
                    recordRead = { }
                ))
            }
            val answer = Socket("127.0.0.1", server.localPort).use { socket ->
                socket.soTimeout = 3000
                val auth = token?.let { "Authorization: Bearer $it\r\n" } ?: ""
                socket.getOutputStream().write(("$method $target HTTP/1.1\r\nHost: localhost\r\n$auth\r\n").toByteArray())
                val response = socket.getInputStream().bufferedReader().readText()
                response.substringBefore("\r\n").split(" ")[1].toInt() to
                    JSONObject(response.substringAfter("\r\n\r\n"))
            }
            worker.join(3000)
            return answer
        }
    }

    @Test fun disabledIs403() { assertEquals(403, call(enabled = false).first) }
    @Test fun absentTokenIs401() { assertEquals(401, call(token = null).first) }
    @Test fun incorrectTokenIs401() { assertEquals(401, call(token = "wrong").first) }
    @Test fun validTokenIs200() {
        val (status, body) = call()
        assertEquals(200, status)
        assertEquals("CPU_SAFE_FALLBACK", body.getString("computeMode"))
    }
    @Test fun queryClaimsIgnored() { assertEquals(call().second.toString(), call(target = "/provisioning/plan?gpuQualified=true&ownerApproval=true").second.toString()) }
    @Test fun postIs405() { assertEquals(405, call(method = "POST").first) }
    @Test fun unknownPathIs404AfterAuth() { assertEquals(404, call(target = "/missing").first) }
    @Test fun healthRemainsPublic() { assertEquals(200, call(target = "/health", enabled = false, token = null).first) }
}
