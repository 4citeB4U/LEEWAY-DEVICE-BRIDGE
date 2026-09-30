package industries.leeway.devicebridge

import android.content.Context
import org.json.JSONObject

object RemoteCommandRouter {
    private val remoteQualified = setOf(
        "device.health", "device.info", "device.capabilities",
        "device.bluetooth.list-bonded", "device.network.discover", "device.receipts",
        "model.status", "model.install", "model.inference",
        "voice.status", "voice.speak", "agent.chat", "ecosystem.status"
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

        val gate = LocalAutomationGate.evaluate(
            trigger = true,
            governance = governance,
            conditions = listOf(
                commandId.isNotBlank(),
                capability.isNotBlank(),
                supported,
                firstSeen,
                capabilityPrecondition
            )
        )
        if (!gate.optBoolean("allow")) return JSONObject().apply {
            put("ok", false)
            put("error", "LOCAL_POLICY_HOLD")
            put("capability", capability)
            put("gate", gate)
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
                "model.install" -> ModelRuntime.download(context) { _, _ -> }
                "model.inference" -> ModelRuntime.generate(context, prompt)
                "voice.status" -> VoiceRuntime.status(context)
                "voice.speak" -> VoiceRuntime.speak(context, text)
                "agent.chat" -> AgentLeeConversationEngine.chat(
                    context,
                    prompt,
                    arguments.optBoolean("speak", true)
                )
                "ecosystem.status" -> EcosystemAuthorityContext.status()
                else -> JSONObject().put("error", "CAPABILITY_NOT_REMOTE_QUALIFIED")
            }
            JSONObject().apply {
                put("ok", true)
                put("capability", capability)
                put("gate", gate)
                put("result", value)
            }
        } catch (e: Exception) {
            JSONObject().apply {
                put("ok", false)
                put("capability", capability)
                put("gate", gate)
                put("error", e.message ?: e.javaClass.simpleName)
            }
        }
    }

    private fun health(context: Context): JSONObject = JSONObject().apply {
        put("remote", RemoteRelayState.status(context))
        put("model", ModelRuntime.status(context))
        put("voice", VoiceRuntime.status(context))
        put("overlay", AgentLeeOverlayController.status(context))
        put("ecosystem", EcosystemAuthorityContext.status())
        put("agentAccessEnabled", LocalAuthority.agentAccessEnabled(context))
        put("authority", "PHONE_LOCAL_RUNTIME")
    }

    private fun capabilities(context: Context): JSONObject {
        val passport = BootstrapStore.loadPassport(context) ?: DevicePassport.capture(context)
        return JSONObject().apply {
            put("capabilities", passport.optJSONArray("capabilityClaims"))
            put("remoteQualified", remoteQualified.toList())
            put("formulaExecution", "NOT_EXECUTED")
            put("skillExecution", "NOT_EXECUTED")
        }
    }
}
