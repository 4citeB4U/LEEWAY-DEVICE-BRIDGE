# Issue #37 — Native authenticated provisioning Android instrumentation PASS — 2026-10-18

## Investigate
The prior 403/401 physical-Android emulator tests demonstrated native loopback server and fail-closed authorization, but did not verify a valid native credential with the real provisioning provider. The BridgeSecret authority is private per-app preferences; credential must never be printed, forwarded or imported from Fold6.

## Implement
Added Android instrumentation dependencies/runner to `apps/android/app/build.gradle.kts` and `apps/android/app/src/androidTest/java/industries/leeway/devicebridge/NativeProvisioningAuthorizationTest.kt`. The test calls the actual production LocalBridgeServer over `127.0.0.1:5323`, uses the app context for an emulator-local BridgeSecret, never logs it, and restores the previous LocalAuthority state in a `finally` block. It verifies 200/403/401 transport and all core fail-closed provisioning classifications, including CPU_SAFE_FALLBACK and canonicalFormulaState NOT_EXECUTED.

## Test / Repair / Retest
First Android instrumentation APK built successfully; first run **FAILED** due to Android prohibiting cleartext HttpURLConnection requests to 127.0.0.1 (`Cleartext HTTP traffic to 127.0.0.1 not permitted`). This was a test harness network-policy issue, not proof of a bridge authorization defect.

Repaired only the test HTTP transport to use a direct java.net.Socket, reusing the existing local HTTP/1.1 protocol and avoiding broadened production cleartext network permissions. Rebuilt `:app:assembleDebugAndroidTest`: `BUILD SUCCESSFUL in 18s`, 44 tasks (4 executed, 40 up-to-date). Installed the test APK using explicit ADB target `emulator-5580` and executed:
`adb -s emulator-5580 shell am instrument -w -e class industries.leeway.devicebridge.NativeProvisioningAuthorizationTest industries.leeway.devicebridge.test/androidx.test.runner.AndroidJUnitRunner`

Result: **`OK (1 test)`**, `Time: 0.151`. All assertion paths passed against Android 35 installed native app:
- /health 200 with test server started
- disabled /provisioning/plan 403
- access enabled, no bearer => 401
- emulator-local BridgeSecret bearer => **200** with actual AndroidTrustedProvisioningObservation.capturePlan response
- contract `LEEWAY_ANDROID_PROVISIONING_COMPATIBILITY_V1`
- `DEVICE_BRIDGE_READ_ONLY_PLANNING`, `DEVICE_BRIDGE_CAPTURED_AT_REQUEST`, `NO_VERIFIED_GPU_RECEIPT`
- `canonicalFormulaState=NOT_EXECUTED`, `provisioningState=NOT_EXECUTED`, `computeMode=CPU_SAFE_FALLBACK`, `gpuState=UNOBSERVED`
- `automaticInstallAuthorized=false`, `gpuAutomaticallyEnabled=false`, `ownerApprovalRequired=true`, installerCapability present
- disable access, protected plan => 403, and finally restore previous access and server state.

## Boundaries
**Android native authenticated provisioning observation PASS**, not actual app installation/provisioning execution, physical GPU correctness, Fold6 signing equivalence or canonical Formula execution. The instrumentation harness does not log credentials. Review branch remains draft PR #38; no Fold6 device mutation. Earlier unfiltered JVM suite **71/71 PASS**, unchanged since harness addition (the most recent Gradle invocation previously found :app:testDebugUnitTest UP-TO-DATE). No canonical Veritas receipt or Learning Ledger entry.
