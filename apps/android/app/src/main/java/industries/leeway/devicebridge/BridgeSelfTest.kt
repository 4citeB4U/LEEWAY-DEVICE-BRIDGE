package industries.leeway.devicebridge

import android.content.Context
import org.json.JSONObject

object BridgeSelfTest {
    fun run(context: Context): JSONObject {
        val appContext = context.applicationContext
        val secret = BridgeSecret.ensure(appContext)
        val bridgeRunning = LocalBridgeServer.isRunning()
        val accessEnabled = LocalAuthority.agentAccessEnabled(appContext)
        val missingRejected = !BridgeSecret.matches(appContext, null)
        val wrongRejected = !BridgeSecret.matches(appContext, "invalid-token")
        val ownerTokenAccepted = BridgeSecret.matches(appContext, secret)
        val passport = BootstrapStore.loadPassport(appContext)
            ?: DevicePassport.capture(appContext)

        val executeGate = LocalAutomationGate.evaluate(
            trigger = true,
            governance = accessEnabled,
            conditions = listOf(
                bridgeRunning,
                ownerTokenAccepted,
                passport.optString("authority") == "NATIVE_ANDROID_OBSERVED"
            )
        )
        val emptyGate = LocalAutomationGate.evaluate(
            trigger = true,
            governance = true,
            conditions = emptyList()
        )

        val passed =
            bridgeRunning &&
            accessEnabled &&
            missingRejected &&
            wrongRejected &&
            ownerTokenAccepted &&
            executeGate.optBoolean("allow") &&
            !emptyGate.optBoolean("allow") &&
            executeGate.optString("formulaExecution") == "NOT_EXECUTED"

        val detail =
            "running=$bridgeRunning access=$accessEnabled " +
            "missingRejected=$missingRejected wrongRejected=$wrongRejected " +
            "ownerTokenAccepted=$ownerTokenAccepted allow=${executeGate.optBoolean("allow")} " +
            "emptyAllow=${emptyGate.optBoolean("allow")} formulaExecution=${executeGate.optString("formulaExecution")}"

        ReceiptStore.record(
            appContext,
            "device.bridge.selftest",
            if (passed) "PASS" else "FAIL",
            detail
        )
        return JSONObject().apply {
            put("ok", passed)
            put("bridgeRunning", bridgeRunning)
            put("agentAccessEnabled", accessEnabled)
            put("missingTokenRejected", missingRejected)
            put("wrongTokenRejected", wrongRejected)
            put("ownerTokenAcceptedInternally", ownerTokenAccepted)
            put("nativePassportAuthority", passport.optString("authority"))
            put("f8ExecuteState", executeGate)
            put("f8EmptyConditionState", emptyGate)
            put("secretExported", false)
        }
    }
}
