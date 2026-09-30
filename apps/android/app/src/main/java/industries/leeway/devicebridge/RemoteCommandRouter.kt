package industries.leeway.devicebridge

import android.content.Context
import org.json.JSONObject

object RemoteCommandRouter {
    private val remoteQualified = setOf(
        "device.health", "device.info", "device.capabilities",
        "device.bluetooth.list-bonded", "device.network.discover", "device.receipts",
        "device.ui.snapshot", "device.ui.back", "device.ui.home", "device.ui.recents",
        "device.ui.tap", "device.ui.swipe", "device.ui.text",
        "device.apps.launch", "device.apps.install.status", "device.apps.install",
        "model.status", "model.install", "model.inference", "voice.status", "voice.speak", "agent.chat"
    )

    fun execute(context: Context, commandId: String, capability: String, arguments: JSONObject, firstSeen: Boolean): JSONObject {
        val governance = LocalAuthority.agentAccessEnabled(context)
        val supported = capability in remoteQualified
        val prompt = arguments.optString("prompt").trim()
        val text = arguments.optString("text").trim()
        val capabilityPrecondition = when (capability) {
            "model.inference", "agent.chat" -> prompt.isNotEmpty()
            "voice.speak" -> text.isNotEmpty()
            "device.ui.tap" -> arguments.has("x") && arguments.has("y")
            "device.ui.swipe" -> arguments.has("x1") && arguments.has("y1") &&
                arguments.has("x2") && arguments.has("y2")
            "device.ui.text" -> text.isNotEmpty()
            "device.apps.launch" -> arguments.optString("packageName").isNotBlank()
            "device.apps.install" -> arguments.optString("url").startsWith("https://") &&
                arguments.optString("sha256").matches(Regex("^[A-Fa-f0-9]{64}$"))
            else -> true
        }
        val gate = FormulaF8Gate.evaluate(
            trigger = true,
            governance = governance,
            conditions = listOf(
                commandId.isNotBlank(), capability.isNotBlank(), supported,
                firstSeen, capabilityPrecondition
            )
        )
        if (gate.optInt("qA") != 69) return JSONObject().apply {
            put("ok", false); put("error", "FORMULA_HOLD"); put("capability", capability); put("gate", gate)
        }
        return try {
            val value = when (capability) {
                "device.health" -> health(context)
                "device.info" -> DevicePassport.capture(context)
                "device.capabilities" -> capabilities(context)
                "device.bluetooth.list-bonded" -> BluetoothProvider.snapshot(context)
                "device.network.discover" -> NetworkDiscoveryProvider.discover(context)
                "device.receipts" -> JSONObject().put("receipts", ReceiptStore.list(context))
                "device.ui.snapshot" -> DeviceOperatorAccessibilityService.snapshot()
                "device.ui.back" -> DeviceOperatorAccessibilityService.global("back")
                "device.ui.home" -> DeviceOperatorAccessibilityService.global("home")
                "device.ui.recents" -> DeviceOperatorAccessibilityService.global("recents")
                "device.ui.tap" -> DeviceOperatorAccessibilityService.tap(
                    arguments.getDouble("x").toFloat(),
                    arguments.getDouble("y").toFloat()
                )
                "device.ui.swipe" -> DeviceOperatorAccessibilityService.swipe(
                    arguments.getDouble("x1").toFloat(),
                    arguments.getDouble("y1").toFloat(),
                    arguments.getDouble("x2").toFloat(),
                    arguments.getDouble("y2").toFloat(),
                    arguments.optLong("durationMs", 300L)
                )
                "device.ui.text" -> DeviceOperatorAccessibilityService.setFocusedText(text)
                "device.apps.launch" -> AppOperator.launch(context, arguments.getString("packageName"))
                "device.apps.install.status" -> PackageInstallBroker.status(context)
                "device.apps.install" -> PackageInstallBroker.installFromUrl(
                    context,
                    arguments.getString("url"),
                    arguments.getString("sha256")
                )
                "model.status" -> ModelRuntime.status(context)
                "model.install" -> ModelRuntime.download(context) { _, _ -> }
                "model.inference" -> ModelRuntime.generate(context, prompt)
                "voice.status" -> VoiceRuntime.initialize(context)
                "voice.speak" -> VoiceRuntime.speak(context, text)
                "agent.chat" -> chat(context, prompt, arguments.optBoolean("speak", true))
                else -> JSONObject().put("error", "CAPABILITY_NOT_REMOTE_QUALIFIED")
            }
            val valueOk = !value.has("ok") || value.optBoolean("ok")
            JSONObject().apply {
                put("ok", valueOk)
                put("capability", capability)
                put("gate", gate)
                put("result", value)
                if (!valueOk) put("error", value.optString("error", "CAPABILITY_EXECUTION_FAILED"))
            }
        } catch (e: Exception) {
            JSONObject().apply { put("ok", false); put("capability", capability); put("gate", gate); put("error", e.message ?: e.javaClass.simpleName) }
        }
    }

    private fun chat(context: Context, prompt: String, speak: Boolean): JSONObject {
        val generated = ModelRuntime.generate(context, prompt)
        if (!generated.optBoolean("ok")) return generated
        val response = generated.optString("response")
        val voice = if (speak) VoiceRuntime.speak(context, response)
            else JSONObject().put("ok", true).put("spoken", false)
        ReceiptStore.record(context, "agent.chat", if (voice.optBoolean("ok")) "PASS" else "FAIL",
            "model=" + generated.optString("modelId") + " speak=" + speak)
        return JSONObject().apply {
            put("ok", true); put("prompt", prompt); put("response", response)
            put("modelId", generated.optString("modelId")); put("elapsedMs", generated.optLong("elapsedMs"))
            put("voice", voice); put("authority", "PHONE_LOCAL_AGENT_CHAT")
        }
    }

    private fun health(context: Context): JSONObject = JSONObject().apply {
        put("remote", RemoteRelayState.status(context)); put("model", ModelRuntime.status(context))
        put("voice", VoiceRuntime.status(context)); put("agentAccessEnabled", LocalAuthority.agentAccessEnabled(context))
        put("authority", "PHONE_LOCAL_RUNTIME")
    }

    private fun capabilities(context: Context): JSONObject {
        val passport = BootstrapStore.loadPassport(context) ?: DevicePassport.capture(context)
        return JSONObject().apply {
            put("capabilities", passport.optJSONArray("capabilityClaims"))
            put("remoteQualified", remoteQualified.toList())
        }
    }
}
