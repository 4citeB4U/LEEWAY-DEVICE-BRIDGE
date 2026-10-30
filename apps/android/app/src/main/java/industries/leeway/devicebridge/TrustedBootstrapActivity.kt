/*
LEEWAY
REGION: DEVICE.BOOTSTRAP.TRUSTED_IPC
TAG: DEVICE.LEEWAY.SIGNATURE_BOOTSTRAP
WHAT: Signature-gated explicit owner bootstrap entrypoint
WHY: Reject unsigned callers before credential-bearing bootstrap is armed
WHO: LeeWay Industries / Creator
WHERE: Android Device Bridge
WHEN: 2026-10-19
HOW: Manifest signature permission, calling-package validation, explicit owner consent
*/
package industries.leeway.devicebridge

import android.app.Activity
import android.app.AlertDialog
import android.content.pm.PackageManager
import android.os.Bundle

class TrustedBootstrapActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val caller = callingPackage.orEmpty()
        val nonce = intent?.getStringExtra("leeway_nonce").orEmpty()
        val trusted = caller.isNotBlank() &&
            packageManager.checkSignatures(caller, packageName) == PackageManager.SIGNATURE_MATCH
        if (!trusted || !nonce.matches(Regex("^[A-Za-z0-9_-]{32,128}$"))) {
            ReceiptStore.record(this, "device.bootstrap.trusted_ipc", "BLOCKED", "CALLER_OR_NONCE_INVALID")
            setResult(RESULT_CANCELED)
            finish()
            return
        }
        AlertDialog.Builder(this)
            .setTitle("Authorize LeeWay companion bootstrap")
            .setMessage("Approve a one-time local bootstrap for the verified LeeWay companion application?")
            .setPositiveButton("Allow") { _, _ ->
                val outcome = LocalBridgeServer.armOwnerBootstrap(this, nonce)
                ReceiptStore.record(this, "device.bootstrap.trusted_ipc", if(outcome.optBoolean("ok")) "PASS" else "BLOCKED", "OWNER_DECISION")
                setResult(if (outcome.optBoolean("ok")) RESULT_OK else RESULT_CANCELED)
                finish()
            }
            .setNegativeButton("Deny") { _, _ ->
                ReceiptStore.record(this, "device.bootstrap.trusted_ipc", "BLOCKED", "OWNER_DENIED")
                setResult(RESULT_CANCELED)
                finish()
            }
            .setCancelable(false)
            .show()
    }
}