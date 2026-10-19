package industries.leeway.devicebridge

import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.ServerSocket
import java.net.Socket
import kotlin.concurrent.thread

/**
 * Actual ephemeral loopback socket fixture. Deliberately excludes the production
 * owner-bootstrap endpoint and uses deterministic test-only access flags.
 * It does NOT claim to exercise Android's LocalBridgeServer handle(Context, Socket).
 */
object ProvisioningSocketFixture {
    data class Reply(val status: Int, val body: JSONObject)

    fun respond(method: String, path: String, agentAccess: Boolean, tokenMatches: Boolean): Reply {
        if (method != "GET") return Reply(405, JSONObject().put("error", "METHOD_NOT_ALLOWED"))
        if (path == "/health") return Reply(200, JSONObject().put("ok", true))
        val decision = LocalBridgeReadAuthorization.evaluate(agentAccess, tokenMatches)
        if (decision.status != 200) return Reply(decision.status, JSONObject().put("error", decision.error))
        if (path != "/provisioning/plan") return Reply(404, JSONObject().put("error", "NOT_FOUND"))
        return Reply(200, JSONObject().put("computeMode", "CPU_SAFE_FALLBACK")
            .put("provisioningState", "NOT_EXECUTED")
            .put("gpuEvidenceOrigin", "NO_VERIFIED_GPU_RECEIPT"))
    }

    fun exchange(method: String, target: String, agentAccess: Boolean, tokenMatches: Boolean): Reply {
        ServerSocket(0, 1, InetAddress.getByName("127.0.0.1")).use { server ->
            server.soTimeout = 3000
            val worker = thread {
                server.accept().use { socket ->
                    val line = BufferedReader(InputStreamReader(socket.getInputStream())).readLine().orEmpty()
                    val pieces = line.split(" ")
                    val action = pieces.getOrNull(0).orEmpty()
                    val route = pieces.getOrNull(1).orEmpty().substringBefore("?")
                    val reply = respond(action, route, agentAccess, tokenMatches)
                    val bytes = reply.body.toString().toByteArray()
                    val reason = when (reply.status) {
                        200 -> "OK"
                        401 -> "Unauthorized"
                        403 -> "Forbidden"
                        404 -> "Not Found"
                        405 -> "Method Not Allowed"
                        else -> "Error"
                    }
                    socket.getOutputStream().write((
                        "HTTP/1.1 ${reply.status} $reason\r\nContent-Length: ${bytes.size}\r\nConnection: close\r\n\r\n"
                    ).toByteArray() + bytes)
                }
            }
            val observed = Socket().use { client ->
                client.soTimeout = 3000
                client.connect(InetSocketAddress("127.0.0.1", server.localPort), 3000)
                client.getOutputStream().write("$method $target HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n".toByteArray())
                val lines = client.getInputStream().bufferedReader().readText()
                val status = lines.substringBefore("\r\n").split(" ")[1].toInt()
                Reply(status, JSONObject(lines.substringAfter("\r\n\r\n")))
            }
            worker.join(3000)
            return observed
        }
    }
}
