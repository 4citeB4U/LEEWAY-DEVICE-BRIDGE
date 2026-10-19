# Issue #37 / PR #38 — Nonce replay and expiry native security regression — 2026-10-18

## Executed, isolated Android 35 emulator
- Re-ran existing three instrumentation tests after prior execution blocker cleared: `OK (3 tests)`, 0.258s; includes not-armed/wrong-nonce/replay negative credential-disclosure checks.
- Added `expiredBootstrapNonceDoesNotReturnPairingCredential` test to test-only Android instrumentation source at commit `9e91ea8023f87fbdf619c45e5581f5857da6cb78`. Uses reflection solely in the instrumented app process to set private `ownerBootstrapExpiresAt` to an already-expired timestamp, avoiding a 120-second delay or production implementation change. Asserts HTTP 401, `BOOTSTRAP_NOT_ARMED_OR_EXPIRED`, absent `pairingToken` response, and rejection on repeat.
- Ran Gradle `:app:assembleDebugAndroidTest :app:testDebugUnitTest`: BUILD SUCCESSFUL in 20s, 50 tasks (4 executed, 46 up-to-date).
- Installed APK on explicit `emulator-5580` and executed `NativeProvisioningAuthorizationTest`: **OK (4 tests)**, 0.277 seconds.
- JVM task UP-TO-DATE; previous full XML count **71/71 PASS** remains prior regression evidence, not a fresh forced rerun.
- No pairing token, owner nonce, or secret value was printed in reported output; test nonce generated locally within emulator. Device Fold6 remained untouched.

## Four owner-requested gates
1. Untrusted-style launch / DENY UI: prior UI dialog and DENY exercise observed; authority-state and credential nondisclosure after denial not fully verified.
2. Nonce mismatch/replay/expiry: **PASS** native Android instrumentation test boundaries; 4/4 total instrumented tests.
3. Trusted caller identity: **NOT IMPLEMENTED/VERIFIED** for exported Termux bootstrap intent. Owner consent mitigates activation, but does not prove caller identity; valid nonce still intentionally permits protected pairingToken response once armed.
4. Independent security approval: **NOT OBTAINED**. A genuine other authorized reviewer must submit independent review; do not self-approve.

## Release verdict
**SECURITY_GATED**. Keep PR #38 draft; physical signing/GPU, Golden Formula, Veritas and Learning Ledger not accepted.
