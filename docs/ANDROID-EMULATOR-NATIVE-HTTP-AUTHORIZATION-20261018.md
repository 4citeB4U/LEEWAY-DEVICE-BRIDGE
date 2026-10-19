# Issue #37 — Emulator native HTTP authorization acceptance — 2026-10-18

## Investigate
PR #38 `MainActivity` launches and captures the device passport but does not automatically invoke `LocalBridgeServer.start`. Production code provides an explicit **START LOCAL DEVICE BRIDGE** button calling `LocalBridgeServer.start(this)` and a separate **ENABLE LOCAL AGENT SESSION** button calling `LocalAuthority.setAgentAccess(true)`. LocalBridgeServer listens only on 127.0.0.1:5323. This explains why initial unauthenticated /health after launching MainActivity did not respond.

## Actual Android runtime execution
Tested ONLY on the isolated Android 35 x86_64 `LeeWay_Issue37_API35` virtual device (ADB serial `emulator-5580`) with PR #38 debug APK, not on Fold6.

1. Navigated the installed application UI using ADB input and Android UI hierarchy, selected **START LOCAL DEVICE BRIDGE** without enabling agent access.
2. Forwarded host 15580 to emulator 5323 using `adb -s emulator-5580 forward`, queried loopback over HTTP:
   - `GET /health` => HTTP **200**; body `ok=true`, `running=true`, `agentAccessEnabled=false`, `port=5323`.
   - `GET /provisioning/plan` with no bearer => HTTP **403** with access disabled.
3. Selected **ENABLE LOCAL AGENT SESSION** on emulator only, without supplying pairing credentials:
   - `GET /health` => HTTP **200**, `agentAccessEnabled=true`.
   - `GET /provisioning/plan` with no bearer => HTTP **401**, as intended for enabled access without valid authorization.
4. Selected **STOP AGENT ACCESS**: `GET /health` confirmed `agentAccessEnabled=false` and `GET /provisioning/plan` again returned **403**.
5. A subsequent local-health probe showed the server was still running despite an attempted UI stop click; avoided claiming a verified UI stop. Explicitly force-stopped `industries.leeway.devicebridge` on emulator-5580 only, confirmed no process PID; removed all emulator-specific ADB forward rules.

## Acceptance
**PASS:** actual Android 35 native LocalBridgeServer bind and GET /health; authority-disabled 403; authority-enabled without bearer 401; stop-access returns to 403; emulator process shut down.

**NOT EXECUTED:** actual bearer-authenticated 200 on `/provisioning/plan` with real Android TrustedProvisioningObservation (no test token was extracted or paired); Canonical Golden Formula execution; physical Fold6 Adreno GPU, provisioning or in-place APK signing compatibility.

## Notes
These are emulator software-SwiftShader runtime tests, not physical device GPU or actual Fold6 acceptance. The existing Android JVM full suite last ran 71/71 PASS. Production Fold6 software, credentials, permissions and GPU were not changed. Canonical Veritas receipt NOT CREATED; Learning Ledger NOT UPDATED.
