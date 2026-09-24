package industries.leeway.devicebridge

import android.content.Context
import org.json.JSONObject

object RemoteCommandRouter {
    fun execute(
        context: Context,
        capability: String,
        arguments: JSONObject
    ): JSONObject {
        if (!LocalAuthority.agentAccessEnabled(context)) {
            return JSONObject().apply {
                put("ok", false)
                put("error", "AGENT_ACCESS_DISABLED")
                put("capability", capability)
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
                "model.status" -> ModelRuntime.status(context)
                "model.inference" -> {
                    val prompt = arguments.optString("prompt").trim()
                    if (prompt.isEmpty()) {
                        return JSONObject().apply {
                            put("ok", false)
                            put("error", "PROMPT_REQUIRED")
                        }
                    }
                    ModelRuntime.generate(context, prompt)
                }
                else -> return JSONObject().apply {
                    put("ok", false)
                    put("error", "CAPABILITY_NOT_REMOTE_QUALIFIED")
                    put("capability", capability)
                }
            }

            JSONObject().apply {
                put("ok", true)
                put("capability", capability)
                put("result", value)
            }
        } catch (e: Exception) {
            JSONObject().apply {
                put("ok", false)
                put("capability", capability)
                put("error", e.message ?: e.javaClass.simpleName)
            }
        }
    }
    private fun health(context: Context): JSONObject =
        JSONObject().apply {
            put("remote", RemoteRelayState.status(context))
            put("model", ModelRuntime.status(context))
            put("agentAccessEnabled", LocalAuthority.agentAccessEnabled(context))
            put("authority", "PHONE_LOCAL_RUNTIME")
        }

    private fun capabilities(context: Context): JSONObject {
        val passport = BootstrapStore.loadPassport(context)
            ?: DevicePassport.capture(context)
        return JSONObject().apply {
            put("capabilities", passport.optJSONArray("capabilityClaims"))
            put("remoteQualified", listOf(
                "device.health",
                "device.info",
                "device.capabilities",
                "device.bluetooth.list-bonded",
                "device.network.discover",
                "device.receipts",
                "model.status",
                "model.inference"
            ))
        }
    }
}
