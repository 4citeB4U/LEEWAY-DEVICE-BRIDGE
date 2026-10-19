package industries.leeway.devicebridge

import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.Socket
import java.net.URLDecoder

/**
 * Production loopback HTTP request processor with injected device-authority functions.
 * LocalBridgeServer owns this processor; tests invoke this exact processor over real sockets.
 */
internal object LocalBridgeHttpHandler {
    data class Dependencies(
        val health: () -> JSONObject,
        val ownerBootstrap: (String?) -> JSONObject,
        val accessEnabled: () -> Boolean,
        val bearerMatches: (String?) -> Boolean,
        val protectedRead: (String) -> JSONObject?,
        val recordRead: (String) -> Unit,
    )

    fun serve(client: Socket, dependencies: Dependencies) {
        client.use { socket ->
            socket.soTimeout = 3000
            val reader = BufferedReader(InputStreamReader(socket.getInputStream(), Charsets.UTF_8))
            val requestLine = reader.readLine() ?: return
            val parts = requestLine.split(" ")
            val method = parts.getOrNull(0).orEmpty()
            val target = parts.getOrNull(1).orEmpty()
            val path = target.substringBefore("?")
            val query = target.substringAfter("?", "")
            var authorization: String? = null
            while (true) {
                val line = reader.readLine() ?: break
                if (line.isEmpty()) break
                if (line.startsWith("Authorization:", ignoreCase = true)) {
                    authorization = line.substringAfter(":").trim()
                }
            }
            if (method != "GET") {
                respond(socket, 405, JSONObject().put("ok", false).put("error", "METHOD_NOT_ALLOWED"))
                return
            }
            if (path == "/health") {
                respond(socket, 200, dependencies.health())
                return
            }
            if (path == "/owner-bootstrap") {
                val nonce = query.split("&").mapNotNull {
                    val index = it.indexOf("=")
                    if (index < 1) null else URLDecoder.decode(it.substring(0, index), "UTF-8") to
                        URLDecoder.decode(it.substring(index + 1), "UTF-8")
                }.toMap()["nonce"]
                val body = dependencies.ownerBootstrap(nonce)
                respond(socket, if (body.optBoolean("ok")) 200 else 401, body)
                return
            }
            val enabled = dependencies.accessEnabled()
            val bearer = authorization?.removePrefix("Bearer ")?.trim()
            val match = enabled && dependencies.bearerMatches(bearer)
            val decision = LocalBridgeReadAuthorization.evaluate(enabled, match)
            if (decision.status != 200) {
                respond(socket, decision.status, JSONObject().put("ok", false).put("error", decision.error))
                return
            }
            val body = dependencies.protectedRead(path)
            if (body == null) {
                respond(socket, 404, JSONObject().put("ok", false).put("error", "NOT_FOUND"))
                return
            }
            dependencies.recordRead(path)
            respond(socket, 200, body)
        }
    }

    private fun respond(socket: Socket, status: Int, body: JSONObject) {
        val bytes = body.toString().toByteArray(Charsets.UTF_8)
        val reason = when (status) {
            200 -> "OK"
            401 -> "Unauthorized"
            403 -> "Forbidden"
            404 -> "Not Found"
            405 -> "Method Not Allowed"
            else -> "Error"
        }
        val header = "HTTP/1.1 $status $reason\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: ${bytes.size}\r\nConnection: close\r\nCache-Control: no-store\r\n\r\n"
        socket.getOutputStream().use { it.write(header.toByteArray(Charsets.UTF_8)); it.write(bytes); it.flush() }
    }
}
