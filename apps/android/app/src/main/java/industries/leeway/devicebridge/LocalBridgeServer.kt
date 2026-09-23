package industries.leeway.devicebridge

import android.content.Context
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.ServerSocket
import java.net.Socket
import kotlin.concurrent.thread

object LocalBridgeServer {
    const val PORT = 5323
    @Volatile private var server: ServerSocket? = null
    @Volatile private var worker: Thread? = null

    fun isRunning(): Boolean = server?.isClosed == false

    fun start(context: Context): JSONObject {
        if (isRunning()) return status(context)
        val appContext = context.applicationContext
        val socket = ServerSocket()
        socket.reuseAddress = true
        socket.bind(InetSocketAddress(InetAddress.getByName("127.0.0.1"), PORT))
        server = socket
        worker = thread(name = "leeway-device-bridge", isDaemon = true) {
            while (!socket.isClosed) {
                try {
                    handle(appContext, socket.accept())
                } catch (_: Exception) {
                    if (!socket.isClosed) {
                        ReceiptStore.record(appContext, "device.bridge.error", "FAIL", "Local bridge socket error")
                    }
                }
            }
        }
        BridgeSecret.ensure(appContext)
        ReceiptStore.record(appContext, "device.bridge.start", "PASS", "Loopback bridge started on 127.0.0.1:$PORT")
        return status(appContext)
    }

    fun stop(context: Context): JSONObject {
        try { server?.close() } catch (_: Exception) {}
        server = null
        worker = null
        ReceiptStore.record(context.applicationContext, "device.bridge.stop", "PASS", "Local bridge stopped")
        return status(context)
    }

    fun status(context: Context): JSONObject = JSONObject().apply {
        put("ok", true)
        put("running", isRunning())
        put("bindAddress", "127.0.0.1")
        put("port", PORT)
        put("agentAccessEnabled", LocalAuthority.agentAccessEnabled(context))
        put("transport", "LOCAL_LOOPBACK")
        put("authority", "PHONE_LOCAL_RUNTIME")
    }

    private fun handle(context: Context, socket: Socket) {
        socket.use { client ->
            client.soTimeout = 3000
            val reader = BufferedReader(InputStreamReader(client.getInputStream(), Charsets.UTF_8))
            val requestLine = reader.readLine() ?: return
            val parts = requestLine.split(" ")
            val method = parts.getOrNull(0) ?: ""
            val path = parts.getOrNull(1)?.substringBefore("?") ?: "/"
            var authorization: String? = null
            while (true) {
                val line = reader.readLine() ?: break
                if (line.isEmpty()) break
                if (line.startsWith("Authorization:", ignoreCase = true)) {
                    authorization = line.substringAfter(":").trim()
                }
            }

            if (method != "GET") {
                respond(client, 405, JSONObject().put("ok", false).put("error", "METHOD_NOT_ALLOWED"))
                return
            }

            if (path == "/health") {
                respond(client, 200, status(context))
                return
            }

            if (!LocalAuthority.agentAccessEnabled(context)) {
                respond(client, 403, JSONObject().put("ok", false).put("error", "AGENT_ACCESS_DISABLED"))
                return
            }

            val bearer = authorization?.removePrefix("Bearer ")?.trim()
            if (!BridgeSecret.matches(context, bearer)) {
                respond(client, 401, JSONObject().put("ok", false).put("error", "UNAUTHORIZED"))
                return
            }

            val body = when (path) {
                "/passport" -> BootstrapStore.loadPassport(context) ?: DevicePassport.capture(context)
                "/capabilities" -> JSONObject().put(
                    "capabilities",
                    (BootstrapStore.loadPassport(context) ?: DevicePassport.capture(context))
                        .optJSONArray("capabilityClaims")
                )
                "/receipts" -> JSONObject().put("receipts", ReceiptStore.list(context))
                "/bridge" -> status(context)
                else -> null
            }

            if (body == null) {
                respond(client, 404, JSONObject().put("ok", false).put("error", "NOT_FOUND"))
            } else {
                ReceiptStore.record(context, "device.bridge.read", "PASS", "GET $path")
                respond(client, 200, body)
            }
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
        val header = buildString {
            append("HTTP/1.1 $status $reason\r\n")
            append("Content-Type: application/json; charset=utf-8\r\n")
            append("Content-Length: ${bytes.size}\r\n")
            append("Connection: close\r\n")
            append("Cache-Control: no-store\r\n\r\n")
        }
        socket.getOutputStream().use { out ->
            out.write(header.toByteArray(Charsets.UTF_8))
            out.write(bytes)
            out.flush()
        }
    }
}
