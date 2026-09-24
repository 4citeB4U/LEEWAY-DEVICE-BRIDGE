package industries.leeway.devicebridge

import android.content.Context
import org.json.JSONObject

object RemoteCommandRouter {
    private val remoteQualified = setOf(
        "device.health", "device.info", "device.capabilities",
        "device.bluetooth.list-bonded", "device.network.discover", "device.receipts",
        "model.status", "model.inference", "voice.status", "voice.speak", "agent.chat"
    )

    fun execute(context: Context, commandId: String, capability: String, arguments: JSONObject, firstSeen: Boolean): JSONObject {
        val governance = LocalAuthority.agentAccessEnabled(context)
        val supported = capability in remoteQualified
        val prompt = arguments.optString("prompt").trim()
        val text = arguments.optString("text").trim()
        val capabilityPrecondition = when (capability) {
            "model.inference", "agent.chat" -> prompt.isNotEmpty()
            "voice.speak" -> text.isNotEmpty()
            else -> true
        }
        val gate = FormulaF8Gate.evaluate(\n            trigger = true,\n            governance = governance,\n            conditions = listOf(
            commandId.isNotBlank(), capability.isNotBlank(), supported, firstSeen, capabilityPrecondition
        ))
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
                "model.status" -> ModelRuntime.status(context)
                "model.inference" -> ModelRuntime.generate(context, prompt)
                "voice.status" -> VoiceRuntime.initialize(context)
                "voice.speak" -> VoiceRuntime.speak(context, text)
                "agent.chat" -> chat(context, prompt, arguments.optBoolean("speak", true))
                else -> JSONObject().put("error", "CAPABILITY_NOT_REMOTE_QUALIFIED")
            }
            JSONObject().apply { put("ok", true); put("capability", capability); put("gate", gate); put("result", value) }
        } catch (e: Exception) {
            JSONObject().apply { put("ok", false); put("capability", capability); put("gate", gate); put("error", e.message ?: e.javaClass.simpleName) }
        }
    }

    private fun chat(context: Context, prompt: String, speak: Boolean): JSONObject {
        val generated = ModelRuntime.generate(context, prompt)
        if (!generated.optBoolean("ok")) return generated
        val response = generated.optString("response")
        val voice = if (speak) VoiceRuntime.speak(context, response) else JSONObject().put("ok", true).put("spoken", false)
        ReceiptStore.record(context, "agent.chat", if (voice.optBoolean("ok")) "PASS" else "FAIL", "model=" + generated.optString("modelId") + " speak=" + speak)
        return JSONObject().apply {
            put("ok", true); put("prompt", prompt); put("response", response); put("modelId", generated.optString("modelId"))
            put("elapsedMs", generated.optLong("elapsedMs")); put("voice", voice); put("authority", "PHONE_LOCAL_AGENT_CHAT")
        }
    }

    private fun health(context: Context): JSONObject = JSONObject().apply {
        put("remote", RemoteRelayState.status(context)); put("model", ModelRuntime.status(context))
        put("voice", VoiceRuntime.status(context)); put("agentAccessEnabled", LocalAuthority.agentAccessEnabled(context))
        put("authority", "PHONE_LOCAL_RUNTIME")
    }
    private fun capabilities(context: Context): JSONObject {
        val passport = BootstrapStore.loadPassport(context) ?: DevicePassport.capture(context)
        return JSONObject().apply { put("capabilities", passport.optJSONArray("capabilityClaims")); put("remoteQualified", remoteQualified.toList()) }
    }
}