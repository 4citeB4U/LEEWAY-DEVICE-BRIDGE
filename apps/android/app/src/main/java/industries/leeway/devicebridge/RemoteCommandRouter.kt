package industries.leeway.devicebridge

import android.content.Context
import org.json.JSONObject

object RemoteCommandRouter {
    private val remoteQualified = setOf(
        "device.health",
        "device.info",
        "device.capabilities",
        "device.bluetooth.list-bonded",
        "device.network.discover",
        "device.receipts",
        "sensory.status",
        "sensory.speak",
        "model.status",
        "model.inference"
    )

    fun execute(
        context: Context,
        commandId: String,
        capability: String,
        arguments: JSONObject,
        firstSeen: Boolean
    ): JSONObject {
        val governance = LocalAuthority.agentAccessEnabled(context)
        val supported = capability in remoteQualified
        val capabilityPrecondition = when (capability) {
            "model.inference" -> arguments.optString("prompt").trim().isNotEmpty()
            "sensory.speak" -> arguments.optString("text").trim().isNotEmpty()
            else -> true
        }

        val gate = FormulaF8Gate.evaluate(
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

        if (gate.optInt("qA") != 69) {
            return JSONObject().apply {
                put("ok", false)
                put("error", "FORMULA_HOLD")
                put("capability", capability)
                put("gate", gate)
            }
        }

        return try {
            val value = when (capability) {
                "device.health" -> health(context)
                "device.info" -> DevicePassport.capture(context)
                "device.capabilities" -> capabilities(context)
                "device.bluetooth.list-bonded" -> BluetoothProvider.snapshot(context)
                "device.network.discover" -> NetworkDiscoveryProvider.discover(context)
                "device.receipts" -> JSONObject().put("receipts", ReceiptStore.list(context))
                "sensory.status" -> SensoryRuntime.status(context)
                "sensory.speak" -> JSONObject().apply {
                    val text = arguments.getString("text").trim()
                    SensoryRuntime.speak(context, text)
                    put("spoken", true)
                    put("chars", text.length)
                    put("authority", "PHONE_LOCAL_SENSORY_RUNTIME")
                }
                "model.status" -> ModelRuntime.status(context)
                "model.inference" -> ModelRuntime.generate(
                    context,
                    arguments.getString("prompt").trim()
                )
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

    private fun health(context: Context): JSONObject =
        JSONObject().apply {
            put("remote", RemoteRelayState.status(context))
            put("model", ModelRuntime.status(context))
            put("sensory", SensoryRuntime.status(context))
            put("agentAccessEnabled", LocalAuthority.agentAccessEnabled(context))
            put("authority", "PHONE_LOCAL_RUNTIME")
        }

    private fun capabilities(context: Context): JSONObject {
        val passport = BootstrapStore.loadPassport(context)
            ?: DevicePassport.capture(context)
        return JSONObject().apply {
            put("capabilities", passport.optJSONArray("capabilityClaims"))
            put("remoteQualified", remoteQualified.toList())
        }
    }
}
