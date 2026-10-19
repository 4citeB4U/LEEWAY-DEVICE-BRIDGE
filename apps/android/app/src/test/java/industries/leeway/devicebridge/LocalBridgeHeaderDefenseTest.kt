package industries.leeway.devicebridge

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import kotlin.concurrent.thread

class LocalBridgeHeaderDefenseTest {
    private fun status(raw: String): Int {
        ServerSocket(0, 1, InetAddress.getByName("127.0.0.1")).use { server ->
            server.soTimeout = 3000
            val worker = thread {
                LocalBridgeHttpHandler.serve(server.accept(), LocalBridgeHttpHandler.Dependencies(
                    health = { JSONObject().put("ok", true) },
                    ownerBootstrap = { JSONObject().put("ok", false) },
                    accessEnabled = { true },
                    bearerMatches = { it == "fixture-token" },
                    protectedRead = { if (it == "/provisioning/plan") JSONObject().put("ok", true) else null },
                    recordRead = { }
                ))
            }
            val code = Socket("127.0.0.1", server.localPort).use { socket ->
                socket.soTimeout = 3000
                socket.getOutputStream().write(raw.toByteArray())
                socket.shutdownOutput()
                socket.getInputStream().bufferedReader().readLine()?.split(" ")?.getOrNull(1)?.toInt() ?: -1
            }
            worker.join(3000)
            return code
        }
    }
    @Test fun duplicateAuthorizationDenied() = assertEquals(400, status("GET /provisioning/plan HTTP/1.1\r\nAuthorization: Bearer fixture-token\r\nAuthorization: Bearer fixture-token\r\n\r\n"))
    @Test fun contentLengthDenied() = assertEquals(400, status("GET /provisioning/plan HTTP/1.1\r\nContent-Length: 0\r\nAuthorization: Bearer fixture-token\r\n\r\n"))
    @Test fun transferEncodingDenied() = assertEquals(400, status("GET /provisioning/plan HTTP/1.1\r\nTransfer-Encoding: chunked\r\nAuthorization: Bearer fixture-token\r\n\r\n"))
    @Test fun malformedBootstrapEscapeDenied() = assertEquals(400, status("GET /owner-bootstrap?nonce=%ZZ HTTP/1.1\r\n\r\n"))
    @Test fun ordinaryAuthorizedRequestStillWorks() = assertEquals(200, status("GET /provisioning/plan HTTP/1.1\r\nAuthorization: Bearer fixture-token\r\n\r\n"))
}
