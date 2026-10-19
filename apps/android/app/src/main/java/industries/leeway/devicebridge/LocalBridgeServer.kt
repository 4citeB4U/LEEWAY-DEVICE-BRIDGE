package industries.leeway.devicebridge

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.ServerSocket
import java.net.Socket
import java.net.URLDecoder
import kotlin.concurrent.thread

object LocalBridgeServer {
    const val PORT = 5323
    @Volatile private var server: ServerSocket? = null
    @Volatile private var worker: Thread? = null
    @Volatile private var ownerBootstrapNonce: String? = null
    @Volatile private var ownerBootstrapExpiresAt: Long = 0L

    fun armOwnerBootstrap(context: Context, nonce: String): JSONObject {
        val clean = nonce.trim()
        val valid = clean.matches(Regex("^[A-Za-z0-9_-]{32,128}$"))
        if (!valid) {
            return JSONObject().put("ok", false).put("error", "INVALID_BOOTSTRAP_NONCE")
        }
        LocalAuthority.setAgentAccess(context, true)
        if (!isRunning()) start(context)
        ownerBootstrapNonce = clean
        ownerBootstrapExpiresAt = System.currentTimeMillis() + 120_000L
        ReceiptStore.record(
            context.applicationContext,
            "device.owner.bootstrap.arm",
            "PASS",
            "Loopback owner bootstrap armed for Termux"
        )
        return JSONObject().apply {
            put("ok", true)
            put("armed", true)
            put("expiresInMs", 120_000)
            put("bindAddress", "127.0.0.1")
            put("port", PORT)
        }
    }

    @Synchronized
    private fun consumeOwnerBootstrap(context: Context, nonce: String?): JSONObject {
        val expected = ownerBootstrapNonce
        val now = System.currentTimeMillis()
        if (expected.isNullOrBlank() || now > ownerBootstrapExpiresAt) {
            ownerBootstrapNonce = null
            ownerBootstrapExpiresAt = 0L
            return JSONObject().put("ok", false).put("error", "BOOTSTRAP_NOT_ARMED_OR_EXPIRED")
        }
        if (nonce.isNullOrBlank() || nonce != expected) {
            return JSONObject().put("ok", false).put("error", "BOOTSTRAP_NONCE_MISMATCH")
        }
        ownerBootstrapNonce = null
        ownerBootstrapExpiresAt = 0L
        val identity = DeviceIdentity.ensure(context)
        ReceiptStore.record(
            context.applicationContext,
            "device.owner.bootstrap.consume",
            "PASS",
            "Termux consumed one-time owner bootstrap"
        )
        return JSONObject().apply {
            put("ok", true)
            put("deviceId", identity.optString("deviceId"))
            put("pairingToken", BridgeSecret.ensure(context))
            put("relayUrl", RemoteRelayState.relayUrl(context))
            put("authority", "OWNER_LOCAL_LOOPBACK_BOOTSTRAP")
        }
    }

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
        put("appVersionName", BuildConfig.VERSION_NAME)
        put("appVersionCode", BuildConfig.VERSION_CODE)
        put("updateMetadataUrl", AgentLeeUpdate.LOCAL_PREPARE_URL)
        put("pocketUpdateMetadataUrl", AgentLeeUpdate.PUBLIC_POCKET_METADATA)
        put("bridgeUpdateMetadataUrl", AgentLeeUpdate.PUBLIC_BRIDGE_METADATA)
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
            val target = parts.getOrNull(1) ?: "/"
            val path = target.substringBefore("?")
            val query = target.substringAfter("?", "")
            val queryParams = query.split("&")
                .mapNotNull { part ->
                    if (part.isBlank()) null
                    else {
                        val idx = part.indexOf("=")
                        if (idx <= 0) null
                        else URLDecoder.decode(part.substring(0, idx), "UTF-8") to
                            URLDecoder.decode(part.substring(idx + 1), "UTF-8")
                    }
                }.toMap()
            var authorization: String? = null
            var contentLength = 0
            while (true) {
                val line = reader.readLine() ?: break
                if (line.isEmpty()) break
                if (line.startsWith("Authorization:", ignoreCase = true)) {
                    authorization = line.substringAfter(":").trim()
                }
                if (line.startsWith("Content-Length:", ignoreCase = true)) {
                    contentLength = line.substringAfter(":").trim().toIntOrNull()?.coerceIn(0, 1_048_576) ?: 0
                }
            }
            val requestBody = if (contentLength > 0) {
                val chars = CharArray(contentLength)
                var offset = 0
                while (offset < contentLength) {
                    val count = reader.read(chars, offset, contentLength - offset)
                    if (count <= 0) break
                    offset += count
                }
                String(chars, 0, offset)
            } else ""

            if (path == "/health" && method == "GET") {
                respond(client, 200, status(context))
                return
            }

            if (path == "/owner-bootstrap" && method == "GET") {
                val body = consumeOwnerBootstrap(context, queryParams["nonce"])
                respond(client, if (body.optBoolean("ok")) 200 else 401, body)
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

            val body = when {
                method == "GET" -> when (path) {
                    "/passport" -> BootstrapStore.loadPassport(context) ?: DevicePassport.capture(context)
                    "/capabilities" -> JSONObject().put(
                        "capabilities",
                        (BootstrapStore.loadPassport(context) ?: DevicePassport.capture(context))
                            .optJSONArray("capabilityClaims")
                    )
                    "/receipts" -> JSONObject().put("receipts", ReceiptStore.list(context))
                    "/providers/bluetooth" -> BluetoothProvider.snapshot(context)
                    "/bridge" -> status(context)
                    else -> null
                }
                method == "POST" && path.startsWith("/tools/") ->
                    handleTool(context, path.removePrefix("/tools/"), requestBody)
                else -> {
                    respond(client, 405, JSONObject().put("ok", false).put("error", "METHOD_NOT_ALLOWED"))
                    return
                }
            }

            if (body == null) {
                respond(client, 404, JSONObject().put("ok", false).put("error", "NOT_FOUND"))
            } else {
                if (method == "GET") ReceiptStore.record(context, "device.bridge.read", "PASS", "GET $path")
                val statusCode = if (body.optBoolean("ok", true)) 200 else 409
                respond(client, statusCode, body)
            }
        }
    }


    private fun handleTool(context: Context, route: String, requestBody: String): JSONObject {
        val envelope = try {
            if (requestBody.isBlank()) JSONObject() else JSONObject(requestBody)
        } catch (_: Exception) {
            return JSONObject().put("ok", false).put("error", "INVALID_JSON_BODY")
        }
        val arguments = envelope.optJSONObject("arguments") ?: JSONObject()
        val identity = DeviceIdentity.ensure(context)
        val currentDeviceId = identity.optString("deviceId")
        fun requireDevice(): JSONObject? {
            val requested = arguments.optString("device_id").trim()
            return if (requested.isBlank() || requested != currentDeviceId) {
                JSONObject().put("ok", false).put("error", "DEVICE_ID_MISMATCH")
            } else null
        }
        fun execute(capability: String, args: JSONObject = JSONObject()): JSONObject =
            RemoteCommandRouter.execute(
                context,
                "tool-" + UUID.randomUUID().toString(),
                capability,
                args,
                true
            )
        fun withReceipt(payload: JSONObject, capability: String): JSONObject {
            val ok = payload.optBoolean("ok", false)
            val receipt = ReceiptStore.record(
                context,
                capability,
                if (ok) "PASS" else "FAIL",
                "Tool Gateway route=$route"
            )
            payload.put("receipt_id", receipt.optString("receiptId"))
            payload.put("receipt", receipt)
            return payload
        }

        return when (route) {
            "device.list" -> {
                val passport = BootstrapStore.loadPassport(context) ?: DevicePassport.capture(context)
                withReceipt(
                    JSONObject()
                        .put("ok", true)
                        .put("devices", JSONArray().put(JSONObject()
                            .put("device_id", currentDeviceId)
                            .put("platform", passport.optString("platform", "android"))
                            .put("model", passport.optString("model"))
                            .put("authority", "PHONE_LOCAL_RUNTIME"))),
                    "device.list"
                )
            }
            "device.capabilities" -> {
                requireDevice()?.let { return it }
                val routed = execute("device.capabilities")
                val passport = BootstrapStore.loadPassport(context) ?: DevicePassport.capture(context)
                withReceipt(
                    JSONObject()
                        .put("ok", routed.optBoolean("ok"))
                        .put("passport", passport)
                        .put("router", routed),
                    "device.capabilities"
                )
            }
            "device.screen.observe" -> {
                requireDevice()?.let { return it }
                val routed = execute("device.ui.snapshot")
                withReceipt(
                    JSONObject()
                        .put("ok", routed.optBoolean("ok"))
                        .put("screen", routed.optJSONObject("result") ?: JSONObject())
                        .put("router", routed),
                    "device.screen.observe"
                )
            }
            "device.app.open" -> {
                requireDevice()?.let { return it }
                val appId = arguments.optString("app_id").trim()
                val routed = execute("device.apps.launch", JSONObject().put("packageName", appId))
                withReceipt(
                    JSONObject()
                        .put("ok", routed.optBoolean("ok"))
                        .put("executed", routed.optBoolean("ok"))
                        .put("app_id", appId)
                        .put("router", routed),
                    "device.app.open"
                )
            }
            "device.ui.control" -> {
                requireDevice()?.let { return it }
                val action = arguments.optJSONObject("action")
                    ?: return JSONObject().put("ok", false).put("error", "ACTION_REQUIRED")
                val expected = arguments.optJSONObject("expected_postcondition")
                    ?: return JSONObject().put("ok", false).put("error", "EXPECTED_POSTCONDITION_REQUIRED")
                val type = action.optString("type")
                val target = action.optJSONObject("target") ?: JSONObject()
                val routed = when (type) {
                    "home" -> execute("device.ui.home")
                    "back" -> execute("device.ui.back")
                    "tap" -> {
                        val point = resolveTargetPoint(target)
                            ?: return JSONObject().put("ok", false).put("error", "TARGET_COORDINATES_REQUIRED")
                        execute("device.ui.tap", JSONObject().put("x", point.first).put("y", point.second))
                    }
                    "type_text" -> execute("device.ui.text", JSONObject().put("text", action.optString("text")))
                    else -> return JSONObject()
                        .put("ok", false)
                        .put("error", "UI_ACTION_NOT_YET_MAPPED_TO_EXISTING_ANDROID_ROUTER")
                        .put("action_type", type)
                }
                Thread.sleep(180)
                val snapshot = DeviceOperatorAccessibilityService.snapshot()
                val verified = routed.optBoolean("ok") && verifyPostcondition(snapshot, expected)
                withReceipt(
                    JSONObject()
                        .put("ok", verified)
                        .put("executed", routed.optBoolean("ok"))
                        .put("postcondition_verified", verified)
                        .put("screen", snapshot)
                        .put("router", routed),
                    "device.ui.control"
                )
            }
            "device.files.read", "device.files.write" ->
                JSONObject().put("ok", false).put("error", "CAPABILITY_NOT_IMPLEMENTED_BY_CURRENT_CANONICAL_ANDROID_ROUTER")
            else -> JSONObject().put("ok", false).put("error", "UNKNOWN_TOOL_ROUTE")
        }
    }

    private fun resolveTargetPoint(target: JSONObject): Pair<Double, Double>? {
        if (target.has("x") && target.has("y")) {
            return target.optDouble("x") to target.optDouble("y")
        }
        val wanted = target.optString("text").trim()
        if (wanted.isBlank()) return null
        val snapshot = DeviceOperatorAccessibilityService.snapshot()
        val tree = snapshot.optJSONObject("tree") ?: return null
        fun find(node: JSONObject): Pair<Double, Double>? {
            val text = node.optString("text")
            val description = node.optString("contentDescription")
            if (text == wanted || description == wanted) {
                val bounds = node.optJSONObject("boundsInScreen")
                if (bounds != null) {
                    val x = (bounds.optDouble("left") + bounds.optDouble("right")) / 2.0
                    val y = (bounds.optDouble("top") + bounds.optDouble("bottom")) / 2.0
                    return x to y
                }
            }
            val children = node.optJSONArray("children") ?: return null
            for (i in 0 until children.length()) {
                val child = children.optJSONObject(i) ?: continue
                find(child)?.let { return it }
            }
            return null
        }
        return find(tree)
    }

    private fun verifyPostcondition(snapshot: JSONObject, expected: JSONObject): Boolean {
        if (!snapshot.optBoolean("ok")) return false
        val tree = snapshot.optJSONObject("tree") ?: return false
        fun contains(node: JSONObject, wanted: String, field: String): Boolean {
            if (node.optString(field) == wanted) return true
            val children = node.optJSONArray("children") ?: return false
            for (i in 0 until children.length()) {
                val child = children.optJSONObject(i) ?: continue
                if (contains(child, wanted, field)) return true
            }
            return false
        }
        expected.optString("package_name").takeIf { it.isNotBlank() }?.let {
            if (!contains(tree, it, "packageName")) return false
        }
        expected.optString("screen_contains").takeIf { it.isNotBlank() }?.let {
            if (!contains(tree, it, "text") && !contains(tree, it, "contentDescription")) return false
        }
        return expected.has("package_name") || expected.has("screen_contains")
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
