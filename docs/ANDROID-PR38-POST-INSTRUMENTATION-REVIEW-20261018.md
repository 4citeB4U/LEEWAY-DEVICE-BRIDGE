# Issue #37 / PR #38 — Post-instrumentation independent regression review — 2026-10-18

## Investigate
Reviewed Android instrumentation harness, Gradle runner configuration and production HTTP authorization handler on the review branch. Confirmed the harness obtains only emulator-local BridgeSecret inside the process, submits it through a 127.0.0.1 socket and checks GPU fail-closed planning. Identified unused HTTP URL imports left over from the first (Android cleartext-denied) test harness; removed imports without widening production network policy.

## Implementation
Instrumentation test cleanup commit `ecbedd93e35fc68a45e43820a22ad393fc0a66a6`.

## Full clean-task regression
Windows isolated checkout, explicit branch fetch/reset and JDK17/Android SDK / Gradle 8.9:
`:app:testDebugUnitTest :app:assembleDebugAndroidTest --rerun-tasks --no-daemon --console=plain`
`BUILD SUCCESSFUL in 33s`; **50 actionable tasks / 50 executed**.
JUnit XML counted **17 suites / 71 tests / 0 failures / 0 errors / 0 skipped**.
Installed only instrumentation test APK on explicit `emulator-5580` and executed native test: **`OK (1 test)`**, 0.166 seconds.

## Review caveats / remaining release gates
- Read-only protected plan is verified with native credential on emulator, not Fold6.
- Device Bridge package versionCode remains 23: same version as installed Fold6; installed signing equivalence UNKNOWN. Do not perform in-place physical installation.
- Emulator graphics use software SwiftShader, not Fold6's Adreno; physical GPU correctness and Formula integration remain unverified.
- Local UI stop-button behavior was not accepted; prior attempt left server running until emulator process stopped. This is an unresolved UI behavioral gate.
- Need a fresh PR scope/conflict review, plan/receipt trace evaluation, and explicitly owner-approved deployment before production acceptance.
- Keep canonical Golden Formula state NOT_EXECUTED; no Veritas receipt or Learning Ledger update.

## Verdict
**ANDROID_JVM_REGRESSION_PASS / EMULATOR_NATIVE_AUTH_PASS / PHYSICAL_AND_CANONICAL_EXECUTION_NOT_VERIFIED**. Keep PR #38 draft until remaining scope and deployment gates pass.
