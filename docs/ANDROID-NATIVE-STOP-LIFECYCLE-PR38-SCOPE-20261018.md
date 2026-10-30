# Issue #37 / PR #38 — Native stop lifecycle and changed-file review — 2026-10-18

## Implement
Added `NativeProvisioningAuthorizationTest.nativeServerStopClosesLoopback` on the existing Android instrumentation source. Runs on emulator only and restores previously observed access/server state in a finally block. Test verifies real server starts, `GET /health` returns HTTP 200, `LocalBridgeServer.stop()` updates running state to false and a fresh loopback connection is refused.

Commit: `47c0c1c4869405d4f767c924b8bbccecd4fdb090`.

## Test / Validate
From isolated Windows review checkout, Android Gradle `:app:assembleDebugAndroidTest :app:testDebugUnitTest --no-daemon --console=plain` => `BUILD SUCCESSFUL in 20s`, 50 tasks, four executed and 46 up-to-date. Full Android JVM suite last explicitly recounted **71/71 PASS, 0 failures**. Installed Android instrumentation APK using explicit `adb -s emulator-5580 install -r` and ran `am instrument` with same selector: **`OK (2 tests)`**, 0.142 seconds. Both native credential/fail-closed and native stop-lifecycle tests passed. This explicitly verifies the lifecycle **method**, not UI button interaction.

## PR scope audit
GitHub PR #38 changed-file listing observed **47 paths**: Android implementation, JVM tests, Android instrumentation and numerous documentation/evidence checkpoints. As checked, no submitted PR reviews or review threads were returned. File-count alone is not a completed merge-conflict review. Branch still contains broad chronological reports; PR scope/hygiene remains for review before release.

## Acceptance boundaries
**PASS:** 71/71 JVM tests; 2/2 native emulator instrumentation; `LocalBridgeServer.stop()` closes listener and rejects fresh loopback connections.
**NOT VERIFIED:** STOP button actual UI event delivery/end-to-end, physical Fold6 signer compatibility, physical Adreno GPU correctness, Golden Formula authority, canonical Veritas receipt and Learning Ledger. Fold6 production app unchanged.

## Next
Execute UI-driven stop test without conflating it with direct method call; review PR #38 base/head mergeability and changed-file scope; keep in draft until governed release gates are accepted.
